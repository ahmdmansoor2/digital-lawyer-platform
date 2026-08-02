#!/usr/bin/env node
/**
 * pexels-fetcher.cjs — جلب صور/فيديوهات stock من Pexels (مجاني)
 *
 * الاستخدام البرمجي:
 *   const { searchPhotos, searchVideos } = require('./pexels-fetcher.cjs');
 *   const photos = await searchPhotos('law court', { perPage: 5 });
 *   await downloadPhoto(photos[0], 'output/photo.jpg');
 */

const fs = require('fs');
const path = require('path');

const API_BASE = 'https://api.pexels.com';

/**
 * بحث عن صور
 * @param {string} query — كلمة البحث (بالإنجليزية أفضل)
 * @param {object} opts — { perPage: 15, orientation: 'portrait' }
 * @returns {Promise<Array>} — قائمة صور
 */
async function searchPhotos(query, opts = {}) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    throw new Error('PEXELS_API_KEY مش متضبوط في .env — سجّل مجاناً في https://www.pexels.com/api/');
  }
  const params = new URLSearchParams({
    query: String(query).trim(),
    per_page: String(opts.perPage || 10),
    orientation: opts.orientation || 'portrait',
    size: 'medium',
  });
  const url = `${API_BASE}/v1/search?${params}`;
  const resp = await fetch(url, { headers: { Authorization: apiKey } });
  if (!resp.ok) {
    throw new Error(`Pexels API فشل: ${resp.status} ${resp.statusText}`);
  }
  const data = await resp.json();
  return data.photos || [];
}

/**
 * بحث عن فيديوهات stock
 */
async function searchVideos(query, opts = {}) {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    throw new Error('PEXELS_API_KEY مش متضبوط');
  }
  const params = new URLSearchParams({
    query: String(query).trim(),
    per_page: String(opts.perPage || 5),
    orientation: opts.orientation || 'portrait',
    size: 'medium',
  });
  const resp = await fetch(`${API_BASE}/videos/search?${params}`, {
    headers: { Authorization: apiKey },
  });
  if (!resp.ok) throw new Error(`Pexels Videos فشل: ${resp.status}`);
  const data = await resp.json();
  return data.videos || [];
}

/**
 * تنزيل صورة إلى ملف محلي
 * @returns {Promise<{ path: string, width: number, height: number }>}
 */
async function downloadPhoto(photo, outputPath) {
  // بنفضل الـ portrait.size (1080x1920 أو قريب) — مناسب لفيديو TikTok
  const url = photo.src?.portrait || photo.src?.large || photo.src?.original;
  if (!url) throw new Error('الصورة بدون src');

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Download فشل: ${resp.status}`);
  const buffer = Buffer.from(await resp.arrayBuffer());

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, buffer);

  return { path: outputPath, width: photo.width, height: photo.height, photographer: photo.photographer };
}

/**
 * تنزيل فيديو stock (الأصغر حجماً — MP4)
 */
async function downloadVideo(video, outputPath) {
  // بنفضل أقل دقة ممكنة لـ TikTok (9:16) عشان الحجم
  const files = video.video_files || [];
  const portrait = files.find(f => f.quality === 'hd' && f.width <= 1080) || files[0];
  if (!portrait) throw new Error('الفيديو بدون files');

  const resp = await fetch(portrait.link);
  if (!resp.ok) throw new Error(`Video download فشل: ${resp.status}`);
  const buffer = Buffer.from(await resp.arrayBuffer());

  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(outputPath, buffer);

  return { path: outputPath, width: portrait.width, height: portrait.height, duration: video.duration };
}

if (require.main === module) {
  const cmd = process.argv[2];
  if (cmd === 'search') {
    const query = process.argv[3] || 'law';
    searchPhotos(query, { perPage: 3 })
      .then(photos => photos.forEach(p => console.log(`- ${p.id}: ${p.photographer} — ${p.alt || p.url}`)))
      .catch(e => { console.error('❌', e.message); process.exit(1); });
  } else {
    console.log('استخدام: node pexels-fetcher.cjs search "law court"');
  }
}

module.exports = { searchPhotos, searchVideos, downloadPhoto, downloadVideo };
