const fs = require('fs');

let pub = fs.readFileSync('public/real-estate.html', 'utf8');

const banner = `  <!-- CONTRACT RISK CHECKER BANNER -->
  <section style="max-width:1200px; margin:20px auto 30px; padding:0 20px;">
    <div style="background:linear-gradient(135deg, rgba(16,185,129,0.14), rgba(15,23,42,0.95)); border:1px solid rgba(16,185,129,0.4); border-radius:18px; padding:22px; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:14px;">
      <div>
        <h3 style="color:#fff; font-size:1.15rem; font-weight:900; margin:0 0 4px;">🛡️ هل لديك مسودة عقد بيع أو إيجار عقار وتريد فحصها قبل التوقيع؟</h3>
        <p style="color:#cbd5e1; font-size:0.86rem; margin:0;">استخدم أداة «الفاحص الذكي للثغرات التعاقدية» لاكتشاف البنود الناقصة (كالشرط الفاسخ الصريح، الشرط الجزائي، وخلو العقار من الرهون) وإضافتها بضغطة زر.</p>
      </div>
      <a href="/contract-generator.html#contract-risk-checker" style="padding:11px 20px; border-radius:12px; background:linear-gradient(135deg,#10b981,#059669); color:#fff; font-weight:800; font-size:0.88rem; text-decoration:none;">🔍 افتح الفاحص الذكي للعقود الآن</a>
    </div>
  </section>\n\n`;

if (!pub.includes('contract-risk-checker') && pub.includes('<footer')) {
  pub = pub.replace('<footer', banner + '<footer');
  fs.writeFileSync('public/real-estate.html', pub, 'utf8');
  console.log('Successfully injected contract-risk-checker banner into public/real-estate.html');
} else {
  console.log('Banner already exists or footer not found');
}
