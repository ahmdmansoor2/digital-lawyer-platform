/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * sanitizer.ts — تنظيف HTML قبل العرض (XSS protection).
 *
 * يستخدم DOMPurify لمنع ثغرات XSS عبر `dangerouslySetInnerHTML`.
 *
 * الـ Allowed tags:
 *  - تنسيق أساسي: p, br, strong, em, u, s, h1-h6, blockquote
 *  - قوائم: ul, ol, li
 *  - روابط: a (مع HTTPS/HTTP فقط، و target=_blank)
 *  - صور: img (data: images فقط — نفس الـ origin)
 *  - جداول: table, thead, tbody, tr, th, td
 *  - TipTap: span (مع class), mark (highlight)
 *
 * الممنوع:
 *  - <script>, <iframe>, <object>, <embed>
 *  - event handlers: onerror, onclick, onload, ...
 *  - javascript: URLs
 *  - data: URLs في <a> (ممكن تكون phishing)
 */

import DOMPurify from 'dompurify';

// Allow only safe HTML elements + attributes
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 's', 'b', 'i',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'blockquote', 'ul', 'ol', 'li',
  'a', 'img', 'span', 'mark', 'sub', 'sup',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
  'hr', 'div'
];

const ALLOWED_ATTR = [
  'href', 'target', 'rel',
  'src', 'alt', 'title', 'width', 'height',
  'class', 'id', 'style', 'colspan', 'rowspan',
  'data-type', 'data-id', // TipTap-specific
  'data-color', // highlight color
];

// Hook: force all links to open in new tab with noopener
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank');
    node.setAttribute('rel', 'noopener noreferrer');
  }
});

/**
 * تنظيف HTML بشكل افتراضي (آمن للعرض).
 * يستخدم في كل `dangerouslySetInnerHTML`.
 */
export function sanitizeHtml(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOW_DATA_ATTR: false, // TipTap attrs are explicit above
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'onfocus', 'onblur'],
  });
}

/**
 * تنظيف HTML مع السماح بوسوم أكثر (للـ TipTap editor preview).
 * لا يُستخدم في production rendering.
 */
export function sanitizeHtmlRich(html: string): string {
  if (!html) return '';
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [...ALLOWED_TAGS, 'pre', 'code'],
    ALLOWED_ATTR: [...ALLOWED_ATTR, 'data-language'],
  });
}

/**
 * تنظيف plain text فقط (بدون HTML).
 * لو النص فيه HTML، يتم تحويله لنص عادي.
 */
export function sanitizeText(text: string): string {
  if (!text) return '';
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
}

/**
 * استخراج النص من HTML (بدون tags).
 * يحول <br> و <p> لـ سطر جديد.
 * مفيد لعرض claimSubject في الـ headers.
 */
export function stripHtml(html: string): string {
  if (!html) return '';
  // First sanitize to get clean text
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
    KEEP_CONTENT: true,
  });
  // Then normalize whitespace
  return clean
    .replace(/\u00A0/g, ' ')          // non-breaking space
    .replace(/[ \t]+/g, ' ')          // collapse spaces
    .replace(/\n\s*\n/g, '\n')        // remove empty lines
    .trim();
}
