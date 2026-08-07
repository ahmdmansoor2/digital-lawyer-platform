#!/usr/bin/env node
/**
 * facebook-graph.cjs — واجهة Facebook Graph API لنشر ريلز فيسبوك
 *
 * التوثيق: https://developers.facebook.com/documentation/video-api/guides/reels-publishing/
 * 
 * الخطوات:
 *   1. تهيئة جلسة الرفع: POST /{page-id}/video_reels (upload_phase=start)
 *   2. رفع الفيديو: POST https://rupload.facebook.com/video-upload/{video-id}
 *   3. النشر: POST /{page-id}/video_reels (upload_phase=finish)
 *
 * الاستخدام:
 *   const { publishReel } = require('./facebook-graph.cjs');
 *   const result = await publishReel({ videoPath, description });
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const ROOT = path.resolve(__dirname, '..', '..');
dotenv.config({ path: path.join(ROOT, '.env') });

const PAGE_ID = process.env.FB_PAGE_ID;
const PAGE_TOKEN = process.env.FB_PAGE_TOKEN;
const GRAPH_VERSION = 'v26.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const UPLOAD_HOST = 'https://rupload.facebook.com';

function assertConfigured() {
  if (!PAGE_ID || !PAGE_TOKEN) {
    throw new Error('FB_PAGE_ID و FB_PAGE_TOKEN مش متضبطين في .env');
  }
}

/**
 * نشر ريلز فيسبوك عبر Graph API (3 خطوات)
 * @param {Object} opts
 * @param {string} opts.videoPath - مسار ملف MP4
 * @param {string} opts.description - وصف الريلز + هاشتاجات
 * @param {boolean} [opts.published=true] - PUBLISHED أو DRAFT
 * @returns {Promise<{video_id: string, permalink_url: string}>}
 */
async function publishReel({ videoPath, description, published = true }) {
  assertConfigured();

  if (!fs.existsSync(videoPath)) {
    throw new Error(`ملف الفيديو غير موجود: ${videoPath}`);
  }

  const fileSize = fs.statSync(videoPath).size;
  console.log(`[fb-graph] حجم الفيديو: ${(fileSize / 1024 / 1024).toFixed(1)} MB`);

  // ─── الخطوة 1: تهيئة جلسة الرفع ───────────────────────────────────────
  console.log('[fb-graph] [1/3] تهيئة جلسة الرفع...');
  const initResp = await fetch(`${GRAPH_BASE}/${PAGE_ID}/video_reels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      upload_phase: 'start',
      access_token: PAGE_TOKEN,
    }),
  });

  const initData = await initResp.json();
  if (initData.error) {
    throw new Error(`[1/3] فشل التهيئة: ${initData.error.message} (code: ${initData.error.code})`);
  }

  const { video_id: videoId, upload_url: uploadUrl } = initData;
  console.log(`[fb-graph] ✓ video_id: ${videoId}`);

  // ─── الخطوة 2: رفع الفيديو ─────────────────────────────────────────────
  console.log('[fb-graph] [2/3] رفع الفيديو إلى rupload.facebook.com...');
  const videoBuffer = fs.readFileSync(videoPath);

  const uploadResp = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      Authorization: `OAuth ${PAGE_TOKEN}`,
      offset: '0',
      file_size: String(fileSize),
    },
    body: videoBuffer,
  });

  const uploadData = await uploadResp.json();
  if (!uploadResp.ok || uploadData.error) {
    throw new Error(`[2/3] فشل الرفع: ${JSON.stringify(uploadData)}`);
  }
  console.log('[fb-graph] ✓ تم رفع الفيديو بنجاح');

  // ─── الخطوة 3: النشر ───────────────────────────────────────────────────
  console.log('[fb-graph] [3/3] نشر الريلز...');
  const finishResp = await fetch(`${GRAPH_BASE}/${PAGE_ID}/video_reels`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      upload_phase: 'finish',
      video_id: videoId,
      video_state: published ? 'PUBLISHED' : 'DRAFT',
      description: description || '',
      access_token: PAGE_TOKEN,
    }),
  });

  const finishData = await finishResp.json();
  if (finishData.error) {
    throw new Error(`[3/3] فشل النشر: ${finishData.error.message} (code: ${finishData.error.code})`);
  }

  console.log(`[fb-graph] ✓ تم نشر الريلز بنجاح!`);
  return {
    video_id: videoId,
    permalink_url: `https://www.facebook.com/reel/${videoId}`,
  };
}

/**
 * نشر منشور صورة على صفحة فيسبوك (بطاقات تعليمية)
 * @param {Object} opts
 * @param {string} opts.imagePath - مسار ملف صورة (PNG/JPG)
 * @param {string} opts.caption - نص المنشور (يظهر ككابشن الصورة)
 * @param {boolean} [opts.published=true] - PUBLISHED أو DRAFT
 * @returns {Promise<{photo_id: string, post_id: string|null, permalink_url: string}>}
 */
async function publishPhoto({ imagePath, caption = '', published = true }) {
  assertConfigured();

  if (!fs.existsSync(imagePath)) {
    throw new Error(`ملف الصورة غير موجود: ${imagePath}`);
  }

  const imageBuf = fs.readFileSync(imagePath);
  const form = new FormData();
  form.append('source', new Blob([imageBuf], { type: 'image/png' }), path.basename(imagePath));
  form.append('caption', caption);
  form.append('access_token', PAGE_TOKEN);
  if (!published) form.append('published', 'false');

  console.log(`[fb-graph] رفع صورة: ${path.basename(imagePath)} (${(imageBuf.length / 1024).toFixed(0)} KB)`);
  const resp = await fetch(`${GRAPH_BASE}/${PAGE_ID}/photos`, {
    method: 'POST',
    body: form,
  });

  const data = await resp.json();
  if (data.error) {
    throw new Error(`فشل نشر الصورة: ${data.error.message} (code: ${data.error.code})`);
  }

  const postId = data.post_id || null;
  console.log(`[fb-graph] ✓ تم نشر الصورة بنجاح! photo_id: ${data.id}`);
  return {
    photo_id: data.id,
    post_id: postId,
    permalink_url: `https://www.facebook.com/${postId || data.id}`,
  };
}

/**
 * التحقق من حالة فيديو
 * @param {string} videoId
 * @returns {Promise<Object>}
 */
async function getVideoStatus(videoId) {
  const url = `${GRAPH_BASE}/${videoId}?fields=status&access_token=${PAGE_TOKEN}`;
  const resp = await fetch(url);
  return resp.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

module.exports = { publishReel, publishPhoto, getVideoStatus, PAGE_ID, PAGE_TOKEN };
