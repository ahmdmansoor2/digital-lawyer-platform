#!/usr/bin/env node
/**
 * text-renderer.cjs — رسم نصوص عربية بشكل صحيح (Arabic shaping + RTL)
 *
 * المشكلة: ffmpeg drawtext مع Tahoma يطلع الحروف العربية متقطعة (مش متصلة)
 *   لأن libfreetype مش بيعمل shaping للعربية.
 *
 * الحل: نرسم النص خارج ffmpeg باستخدام sharp + SVG.
 *   - sharp بيستخدم librsvg (Pango + HarfBuzz) للـ SVG
 *   - Pango بيعمل Arabic shaping صح: الحروف بتتصل + RTL bidi
 *
 * النتيجة: PNG strip فيها النص العربي متشكل صح، نعملها overlay في ffmpeg.
 */

const fs = require('fs');
const path = require('path');

/**
 * @param {object} opts
 *   - text: النص (يدعم عربي + إنجليزي + أرقام)
 *   - fontSize: حجم الخط (افتراضي: 72)
 *   - color: لون النص hex (افتراضي: '#ffffff')
 *   - bgColor: لون الخلفية (افتراضي: 'rgba(0,0,0,0.7)')
 *   - fontFamily: الخط (افتراضي: 'Tahoma, Arial, sans-serif')
 *   - width: عرض الـ strip (افتراضي: 1200)
 *   - height: ارتفاع الـ strip (افتراضي: 200)
 *   - bold: عريض؟ (افتراضي: true)
 *   - align: 'center' | 'start' | 'end' (افتراضي: 'center')
 * @returns {Promise<Buffer>} — PNG buffer
 */
async function renderTextStrip(opts) {
  // eslint-disable-next-line global-require
  const sharp = require('sharp');

  const {
    text = '',
    fontSize = 72,
    color = '#ffffff',
    bgColor = 'rgba(0,0,0,0.7)',
    fontFamily = 'Tahoma, Arial, sans-serif',
    width = 1200,
    height = 200,
    bold = true,
    align = 'center',
  } = opts;

  if (!text || !text.trim()) {
    // نص فاضي → نرجع PNG شفاف
    return sharp({
      create: {
        width, height, channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    }).png().toBuffer();
  }

  // تنظيف النص
  const cleanText = String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .trim();

  // نستخدم tspans منفصلة لو النص طويل (لتحسين الـ wrapping)
  // الـ dominant-baseline=central مع y=height/2+fontSize/3 بيركز النص عمودياً
  // الـ text-anchor='middle' بيوسّط أفقياً
  // الـ direction='rtl' و unicode-bidi='bidi-override' بيضمنوا الترتيب الصح
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="${bgColor}" rx="20"/>
    <text x="${width / 2}" y="${height / 2}"
          font-family='${fontFamily}'
          font-size="${fontSize}"
          font-weight="${bold ? 'bold' : 'normal'}"
          fill="${color}"
          text-anchor="middle"
          dominant-baseline="central"
          direction="rtl">${cleanText}</text>
  </svg>`;

  return sharp(Buffer.from(svg), { density: 300 })
    .png()
    .toBuffer();
}

/**
 * يرسم caption واحد (كلمات) في strip بألوان TikTok (أصفر + خلفية سوداء)
 */
async function renderCaptionStrip(text, opts = {}) {
  return renderTextStrip({
    text,
    fontSize: opts.fontSize || 80,
    color: opts.color || '#fde047',  // TikTok yellow
    bgColor: opts.bgColor || 'rgba(0,0,0,0.85)',
    fontFamily: 'Tahoma, Arial, sans-serif',
    width: opts.width || 1400,
    height: opts.height || 220,
    bold: true,
    ...opts,
  });
}

/**
 * يكتب النص على صورة موجودة (لـ on-screen text في كل مشهد)
 * @param {string} imagePath — مسار الصورة
 * @param {object} textOpts — نفس خيارات renderTextStrip
 * @param {object} position — { x, y, width, height } — مكان النص على الصورة
 * @returns {Promise<Buffer>} — PNG buffer مدمج
 */
async function burnTextOnImage(imagePath, textOpts, position) {
  // eslint-disable-next-line global-require
  const sharp = require('sharp');

  const textPng = await renderTextStrip(textOpts);

  const { x = 0, y = 0 } = position;
  const meta = await sharp(imagePath).metadata();

  return sharp(imagePath)
    .composite([{
      input: textPng,
      top: Math.max(0, Math.floor((meta.height || 1920) * 0.78)),
      left: Math.max(0, Math.floor(((meta.width || 1080) - textOpts.width) / 2)),
    }])
    .png()
    .toBuffer();
}

module.exports = { renderTextStrip, renderCaptionStrip, burnTextOnImage };
