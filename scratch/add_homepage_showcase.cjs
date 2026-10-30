const fs = require('fs');
const path = require('path');

// 1. Update index.html
const indexPath = path.join(__dirname, '..', 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf8');

const newSection = `        <section class="ns-section" aria-labelledby="new-tools-heading" style="background: linear-gradient(135deg, rgba(99,102,241,0.12), rgba(16,185,129,0.08)); border: 1px solid rgba(99,102,241,0.35); border-radius: 20px; padding: 28px; margin: 36px 0;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px; margin-bottom:20px;">
            <div>
              <span class="ns-badge" style="background:rgba(16,185,129,0.2); color:#6ee7b7; border-color:rgba(16,185,129,0.4);">✨ أدوات ومولدات جديدة — تحديث 2026 الحصري</span>
              <h2 id="new-tools-heading" style="font-size:24px; font-weight:900; color:#fff; margin:8px 0 4px; border:none; padding:0;">الأدوات والمولدات التشريعية الذكية والحاسبات المستقلة</h2>
              <p style="font-size:14px; color:#cbd5e1; margin:0;">أحدث الأدوات القانونية التفاعلية للطباعة والتوليد الفوري للمستندات والطعون القضائية في مصر:</p>
            </div>
            <a href="https://mohamidigital.online/html-sitemap-hub.html" class="ns-cta-secondary" style="font-size:13px; padding:8px 18px;">🗺️ الفهرس القانوني الشامل</a>
          </div>
          <div class="ns-grid" style="margin-top:16px;">
            <article class="ns-card" style="border-color:rgba(99,102,241,0.3);">
              <div class="icon">🏛️</div>
              <h3><a href="https://mohamidigital.online/criminal-procedure-new.html">مُقارن قانون الإجراءات الجنائية الجديد 2026</a></h3>
              <p>مقارنة حية لنصوص التعديلات الجديدة، مدد الحبس الاحتياطي، التعويض، وبنك الدفوع الجنائية مع أحكام النقض.</p>
            </article>
            <article class="ns-card" style="border-color:rgba(99,102,241,0.3);">
              <div class="icon">⚖️</div>
              <h3><a href="https://mohamidigital.online/felony-appeal-generator.html">مُولّد استئناف الجنايات (القانون 1 لسنة 2024)</a></h3>
              <p>تحرير وصياغة تقرير ومذكرة استئناف الجنايات لمحكمة الجنايات المستأنفة مع حاسبة ميعاد الـ 40 يوماً.</p>
            </article>
            <article class="ns-card" style="border-color:rgba(99,102,241,0.3);">
              <div class="icon">📜</div>
              <h3><a href="https://mohamidigital.online/bailiff-notices-generator.html">مُولّد الإنذارات الرسمية على يد محضر</a></h3>
              <p>توليد وطباعة إنذار عرض الأجرة، فسخ العقود، وتسليم الميراث مع الديباجة الرسمية لقلم المحضرين جاهزة للطباعة A4.</p>
            </article>
            <article class="ns-card" style="border-color:rgba(99,102,241,0.3);">
              <div class="icon">🔍</div>
              <h3><a href="https://mohamidigital.online/property-buyer-checklist.html">فاحص أمان شراء الشقق والعقارات بمصر</a></h3>
              <p>12 فحصاً قانونياً ذكياً لتسلسل الملكية، صحة التوقيع vs التسجيل، التوكيلات، وحصة الأرض ونموذج 10 للتصالح.</p>
            </article>
            <article class="ns-card" style="border-color:rgba(99,102,241,0.3);">
              <div class="icon">📑</div>
              <h3><a href="https://mohamidigital.online/inheritance-deed-generator.html">مُولّد إعلام الوراثة وجنحة الميراث (مادة 49)</a></h3>
              <p>صياغة طلب إعلام الوراثة لمحكمة الأسرة وعريضة جنحة الامتناع عن تسليم الميراث وفق المادة 49 من القانون 219/2017.</p>
            </article>
            <article class="ns-card" style="border-color:rgba(99,102,241,0.3);">
              <div class="icon">🏢</div>
              <h3><a href="https://mohamidigital.online/calculate-old-rent.html">حاسبة الإيجار القديم 2026</a></h3>
              <p>حساب الزيادة السنوية القانونية الـ 15% وتاريخ الإخلاء الوجوبي وفق القانون 10/2022 وحكم الدستورية العليا.</p>
            </article>
            <article class="ns-card" style="border-color:rgba(99,102,241,0.3);">
              <div class="icon">🏗️</div>
              <h3><a href="https://mohamidigital.online/calculate-building-reconciliation.html">حاسبة التصالح في مخالفات البناء</a></h3>
              <p>حساب رسوم الجدية والتقسيط ومقابل التصالح وفق القانون الجديد 187 لسنة 2023 مع خصم الـ 25% للسداد الفوري.</p>
            </article>
            <article class="ns-card" style="border-color:rgba(99,102,241,0.3);">
              <div class="icon">💰</div>
              <h3><a href="https://mohamidigital.online/calculate-court-fees.html">حاسبة الرسوم القضائية والدمغات</a></h3>
              <p>حساب الرسم النسبي والثابت وصندوق الأبنية والدمغات والكفالات وفق قانون الرسوم القضائية 90 لسنة 1944.</p>
            </article>
            <article class="ns-card" style="border-color:rgba(99,102,241,0.3);">
              <div class="icon">⏳</div>
              <h3><a href="https://mohamidigital.online/calculate-prescription-periods.html">حاسبة مدد التقادم وسقوط الحقوق</a></h3>
              <p>حساب التقادم الطويل (15 سنة)، الخمسي، الحولي، وانقضاء الدعاوى الجنائية والمدنية وتقادم الشيكات البنكية.</p>
            </article>
            <article class="ns-card" style="border-color:rgba(99,102,241,0.3);">
              <div class="icon">💼</div>
              <h3><a href="https://mohamidigital.online/calculate-attorney-fees.html">حاسبة أتعاب المحاماة الاسترشادية</a></h3>
              <p>تقدير أتعاب المحاماة ونسبتها وفق المادة 82 من قانون المحاماة 17/1983 مع صياغة عقد الأتعاب القضائي.</p>
            </article>
            <article class="ns-card" style="border-color:rgba(99,102,241,0.3);">
              <div class="icon">🚗</div>
              <h3><a href="https://mohamidigital.online/calculate-traffic-compensation.html">حاسبة تعويضات حوادث الطرق</a></h3>
              <p>حساب مبالغ التأمين الإجباري والتعويضات عن الوفاة والإصابة وفق قانون التأمين الموحد الجديد 155 لسنة 2024.</p>
            </article>
            <article class="ns-card" style="border-color:rgba(99,102,241,0.3);">
              <div class="icon">🗺️</div>
              <h3><a href="https://mohamidigital.online/html-sitemap-hub.html">الفهرس القانوني الشامل للمنصة</a></h3>
              <p>دليل هرمي لكافة مقالات المدونة (403 مقالاً) والمحاكم الـ 116 والأدوات والمراجع بنقرة واحدة مباشرة.</p>
            </article>
          </div>
        </section>\n\n`;

const anchor = '<section class="ns-section" aria-labelledby="calculators-heading">';
if (!indexHtml.includes('id="new-tools-heading"')) {
  indexHtml = indexHtml.replace(anchor, newSection + anchor);
}

// Update sw-register version query in index.html
indexHtml = indexHtml.replace(/sw-register\.js\?v=[^"']+/g, 'sw-register.js?v=20261020v13');
fs.writeFileSync(indexPath, indexHtml, 'utf8');
console.log('Updated index.html successfully!');

// 2. Update sw.js version
const swPath = path.join(__dirname, '..', 'public', 'sw.js');
let swContent = fs.readFileSync(swPath, 'utf8');
swContent = swContent.replace(/const VERSION = '[^']+';/, "const VERSION = 'mohami-v13-domination-20261020';");
fs.writeFileSync(swPath, swContent, 'utf8');
console.log('Updated public/sw.js version to mohami-v13-domination-20261020!');

// 3. Update sw-register.js
const swRegPath = path.join(__dirname, '..', 'public', 'sw-register.js');
let swRegContent = `/**
 * sw-register.js — تسجيل Service Worker مع التفريغ التلقائي للكاش القديم (Cache-Busting)
 */
(function () {
  try {
    localStorage.removeItem('mohami_theme_mode');
    localStorage.removeItem('mohami_font_scale');
    document.documentElement.classList.remove('public-theme-light');
  } catch (e) {}

  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;

  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/sw.js?v=20261020v13', { scope: '/' }).then(function (reg) {
      if (reg) {
        reg.update();
        if (window.caches) {
          caches.keys().then(function (names) {
            names.forEach(function (name) {
              if (!name.includes('mohami-v13-domination-20261020')) {
                caches.delete(name);
              }
            });
          });
        }
      }
    }).catch(function () {});
  });
})();
`;
fs.writeFileSync(swRegPath, swRegContent, 'utf8');
console.log('Updated public/sw-register.js successfully!');
