#!/usr/bin/env node
/**
 * cross-link-pillars.cjs — إضافة روابط بين الـ Pillars (دائري)
 *
 * كل pillar يحصل على قسم "Pillars أخرى قد تهمك" يحوي روابط للـ 5 الأخرى.
 * هذا يحسن SEO عبر internal linking بين المحتوى الطويل.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const PILLARS_DIR = path.join(ROOT, 'public', 'pillars');

const PILLAR_META = {
  'egyptian-labor-law-2026-comprehensive-guide': { icon: '⚖️', title: 'قانون العمل المصري 2026 - الدليل الشامل', cat: 'قانون العمل' },
  'law-firm-management-in-egypt': { icon: '🏛️', title: 'إدارة مكاتب المحاماة في مصر - الدليل الشامل', cat: 'إدارة' },
  'legal-contract-drafting-egypt': { icon: '📝', title: 'صياغة العقود القانونية في مصر - دليل عملي', cat: 'قانون مدني' },
  'personal-status-law-egypt-comprehensive-guide': { icon: '👨‍👩‍👧', title: 'قانون الأحوال الشخصية في مصر - الدليل الشامل', cat: 'قانون الأسرة' },
  'egyptian-commercial-law-ultimate-guide': { icon: '💼', title: 'القانون التجاري المصري - الدليل الشامل', cat: 'قانون تجاري' },
  'egyptian-penal-code-guide': { icon: '⚖️', title: 'قانون العقوبات المصري - الدليل الشامل', cat: 'قانون جنائي' },
  'complete-guide-egyptian-civil-commercial-procedures-law': { icon: '📋', title: 'قانون المرافعات المدنية والتجارية - الدليل الشامل', cat: 'قانون المرافعات' },
};

const SECTION_HTML = (currentSlug) => {
  const others = Object.entries(PILLAR_META).filter(([slug]) => slug !== currentSlug);
  return `
    <aside class="cross-pillars" style="background: linear-gradient(135deg, rgba(99,102,241,0.08), rgba(124,58,237,0.08)); border: 1px solid rgba(99,102,241,0.25); border-radius: 16px; padding: 28px; margin: 32px 0;">
      <h2 style="color:#a5b4fc; border:none; padding:0; margin:0 0 16px 0; font-size:22px;">🔗 مراجع شاملة أخرى تهمك</h2>
      <p style="color:#94a3b8; font-size:14px; margin-bottom:18px;">استكشف الأدلة القانونية الشاملة الأخرى في فروع القانون المصري:</p>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap:12px;">
        ${others.map(([slug, m]) => `
        <a href="/pillars/${slug}.html" style="display:flex; align-items:center; gap:12px; padding:14px 16px; background:rgba(15,23,42,0.6); border:1px solid rgba(148,163,184,0.15); border-radius:12px; text-decoration:none; color:#f1f5f9; transition:all 0.2s;" onmouseover="this.style.borderColor='rgba(99,102,241,0.5)'; this.style.transform='translateX(-3px)';" onmouseout="this.style.borderColor='rgba(148,163,184,0.15)'; this.style.transform='translateX(0)';">
          <span style="font-size:24px;">${m.icon}</span>
          <div>
            <div style="font-size:13px; font-weight:800; color:#fff; margin-bottom:2px;">${m.title}</div>
            <div style="font-size:10px; color:#94a3b8; font-weight:700;">${m.cat}</div>
          </div>
        </a>`).join('')}
      </div>
      <div style="margin-top:18px; padding-top:18px; border-top:1px solid rgba(148,163,184,0.1); display:flex; gap:12px; flex-wrap:wrap;">
        <a href="/legal-library.html" style="padding:8px 16px; background:rgba(16,185,129,0.15); border:1px solid rgba(16,185,129,0.3); border-radius:8px; color:#6ee7b7; font-size:12px; font-weight:800; text-decoration:none;">📚 المكتبة القانونية الشاملة</a>
        <a href="/search.html" style="padding:8px 16px; background:rgba(99,102,241,0.15); border:1px solid rgba(99,102,241,0.3); border-radius:8px; color:#a5b4fc; font-size:12px; font-weight:800; text-decoration:none;">🔍 بحث في الموقع</a>
        <a href="/blog/" style="padding:8px 16px; background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.3); border-radius:8px; color:#fbbf24; font-size:12px; font-weight:800; text-decoration:none;">📰 المدونة القانونية (${require('fs').readdirSync(path.join(ROOT, 'public', 'blog')).filter(f => f.endsWith('.html')).length} مقال)</a>
      </div>
    </aside>
  `;
};

let totalUpdated = 0;
for (const slug of Object.keys(PILLAR_META)) {
  const filePath = path.join(PILLARS_DIR, `${slug}.html`);
  if (!fs.existsSync(filePath)) {
    console.log(`[skip] ${slug} - file not found`);
    continue;
  }
  let html = fs.readFileSync(filePath, 'utf8');
  if (html.includes('class="cross-pillars"')) {
    console.log(`[skip] ${slug} - already has cross-pillars`);
    continue;
  }
  // أدخل قبل الـ CTA section (آخر section في الـ article)
  const newSection = SECTION_HTML(slug);
  // ابحث عن `<aside class="cta">` وأدخل قبله
  const ctaMatch = html.match(/(\s*<aside class="cta">)/);
  if (ctaMatch) {
    html = html.replace(ctaMatch[0], newSection + ctaMatch[0]);
  } else {
    // ضع قبل `</article>`
    html = html.replace(/(\s*<\/article>)/, newSection + '$1');
  }
  fs.writeFileSync(filePath, html, 'utf8');
  totalUpdated++;
  console.log(`[updated] ${slug}`);
}
console.log(`\n✓ تم تحديث ${totalUpdated} pillar بـ cross-links`);
