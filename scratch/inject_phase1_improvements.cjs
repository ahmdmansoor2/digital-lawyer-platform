const fs = require('fs');
const path = require('path');

const eeatCardHtml = `
      <!-- ⚖️ بطاقة الموثوقية والتدقيق التشريعي (E-E-A-T Authority & Review Card) -->
      <section class="eeat-review-card" style="margin: 36px 0 20px; padding: 22px 24px; background: linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(30, 41, 59, 0.9)); border: 1px solid rgba(52, 211, 153, 0.35); border-right: 5px solid #10b981; border-radius: 12px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25); direction: rtl; font-family: 'Cairo', sans-serif;">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 12px; border-bottom: 1px solid rgba(148, 163, 184, 0.2); padding-bottom: 10px;">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="font-size: 26px;">⚖️</span>
            <div>
              <div style="font-size: 15px; font-weight: 800; color: #34d399;">تم التدقيق والمراجعة القانونية والتشريعية</div>
              <div style="font-size: 13px; color: #cbd5e1; font-weight: 600;">إشراف وتدقيق: <strong style="color: #fff;">المستشار أحمد منصور</strong> — محامٍ بالنقض والدستورية العليا</div>
            </div>
          </div>
          <span style="display: inline-block; padding: 4px 10px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 20px; font-size: 11px; font-weight: 700; color: #6ee7b7;">✓ تحديث تشريعي وقضائي مستمر ٢٠٢٦</span>
        </div>
        <p style="margin: 0 0 12px; font-size: 13px; line-height: 1.8; color: #94a3b8;">
          تم فحص وتدقيق هذه المادة القانونية بالرجوع إلى أحدث نصوص التشريعات المنشورة في الجريدة الرسمية وأحكام دوائر محكمة النقض المصرية والمحكمة الإدارية العليا، وفقاً لمعايير الرصانة والنزاهة التحريرية المعتمدة للمنصة.
        </p>
        <div style="display: flex; flex-wrap: wrap; gap: 14px; font-size: 12px; align-items: center;">
          <a href="/editorial-policy.html" style="color: #38bdf8; text-decoration: none; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
            <span>📖 السياسة التحريرية ومعايير النشر</span>
          </a>
          <span style="color: #475569;">•</span>
          <a href="/why-trust-us.html" style="color: #38bdf8; text-decoration: none; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
            <span>🛡️ منهجية الثقة والمصادر</span>
          </a>
          <span style="color: #475569;">•</span>
          <a href="/contact.html" style="color: #38bdf8; text-decoration: none; font-weight: 700; display: inline-flex; align-items: center; gap: 4px;">
            <span>💬 استشارة قضائية متخصصة</span>
          </a>
        </div>
      </section>
`;

function injectEeatCard(dirPath) {
  const files = fs.readdirSync(dirPath).filter(f => f.endsWith('.html'));
  let count = 0;
  for (const f of files) {
    const p = path.join(dirPath, f);
    let html = fs.readFileSync(p, 'utf8');
    if (html.includes('eeat-review-card')) continue;

    if (html.includes('<div class="back-link">')) {
      html = html.replace('<div class="back-link">', eeatCardHtml + '\n      <div class="back-link">');
      fs.writeFileSync(p, html, 'utf8');
      count++;
    } else if (html.includes('</article>')) {
      html = html.replace('</article>', eeatCardHtml + '\n    </article>');
      fs.writeFileSync(p, html, 'utf8');
      count++;
    }
  }
  return { dir: dirPath, count, total: files.length };
}

// 1. Inject EEAT cards
const blogRes = injectEeatCard('public/blog');
console.log(`Blog: injected in ${blogRes.count}/${blogRes.total} articles.`);

const pillarsRes = injectEeatCard('public/pillars');
console.log(`Pillars: injected in ${pillarsRes.count}/${pillarsRes.total} guides.`);

// 2. Link Calculators to Contract / Lawsuit Generator
const calculators = [
  {
    file: 'public/calculate-alimony.html',
    btnText: '⚖️ توليد صحيفة دعوى النفقة بالصيغة القانونية المعتمدة فوراً',
    query: 'نفقة'
  },
  {
    file: 'public/calculate-end-of-service.html',
    btnText: '⚖️ توليد صحيفة دعوى المطالبة بالمستحقات ومكافأة نهاية الخدمة فوراً',
    query: 'عمالية'
  },
  {
    file: 'public/calculate-inheritance.html',
    btnText: '🏛️ توليد طلب إعلام الوراثة وصيغة قسمة التركة الرضائية فوراً',
    query: 'وراثة'
  },
  {
    file: 'public/appeal-deadlines.html',
    btnText: '📜 توليد مذكرة أسباب الطعن بالاستئناف / النقض بالصيغة المعتمدة',
    query: 'استئناف'
  },
  {
    file: 'public/real-estate-registration-fees.html',
    btnText: '🏢 توليد عقد بيع عقاري ابتدائي نهائي مع بند التسجيل فوراً',
    query: 'عقد بيع'
  }
];

let calcCount = 0;
for (const calc of calculators) {
  if (!fs.existsSync(calc.file)) continue;
  let html = fs.readFileSync(calc.file, 'utf8');
  if (html.includes('contract-generator.html?q=')) continue;

  const btnHtml = `\n          <a href="/contract-generator.html?q=${encodeURIComponent(calc.query)}" style="display:inline-flex; align-items:center; justify-content:center; gap:8px; background:linear-gradient(135deg, #059669, #10b981); color:#fff; padding:11px 20px; border-radius:10px; text-decoration:none; font-weight:800; font-size:13px; box-shadow:0 4px 14px rgba(16,185,129,0.35); flex:1 1 100%; text-align:center; margin-top:8px;">\n            <span>${calc.btnText}</span>\n          </a>`;

  if (html.includes('class="whatsapp-btn"')) {
    html = html.replace(/(<button class="whatsapp-btn"[^>]*>[\s\S]*?<\/button>)/, '$1' + btnHtml);
    fs.writeFileSync(calc.file, html, 'utf8');
    calcCount++;
    console.log(`Calculator: Linked ${calc.file} -> ?q=${calc.query}`);
  }
}

console.log(`Calculators linked: ${calcCount}/${calculators.length}`);

// Also inject into remaining pillars that lack back-link or article tag
const remainingPillars = [
  'public/pillars/egyptian-administrative-judiciary-state-council-guide.html',
  'public/pillars/egyptian-civil-code-ultimate-guide.html',
  'public/pillars/egyptian-criminal-procedure-code-guide.html',
  'public/pillars/egyptian-evidence-law-comprehensive-guide.html',
  'public/pillars/egyptian-labor-law-2026-comprehensive-guide.html'
];

for (const fp of remainingPillars) {
  if (!fs.existsSync(fp)) continue;
  let html = fs.readFileSync(fp, 'utf8');
  if (html.includes('eeat-review-card')) continue;
  if (html.includes('class="smart-download-banner"')) {
    html = html.replace('<div class="smart-download-banner"', eeatCardHtml + '\n<div class="smart-download-banner"');
    fs.writeFileSync(fp, html, 'utf8');
    console.log(`Pillars: Injected EEAT in ${fp}`);
  }
}
