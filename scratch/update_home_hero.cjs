const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const oldHeroRegex = /<span class="ns-badge">[\s\S]*?<\/span>\s*<h1 id="hero-heading">[\s\S]*?<\/h1>/;

const newHero = `<span class="ns-badge">⚖️ المنظومة القانونية والتشريعية الأولى في مصر — برعاية المستشار أحمد منصور</span>
          <h1 id="hero-heading" class="ns-hero-main-title">
            <span class="ns-brand-headline">المحامي الرقمي</span>
            <span class="ns-brand-tagline">المنظومة القانونية والتشريعية الذكية الأولى في جمهورية مصر العربية</span>
          </h1>`;

if (oldHeroRegex.test(html)) {
  html = html.replace(oldHeroRegex, newHero);
  
  // Add CSS
  const oldCss = '.ns-hero h1 {';
  const newCss = `.ns-hero-main-title {
        margin: 16px 0 24px 0;
        line-height: 1.2;
      }
      .ns-brand-headline {
        display: block;
        font-size: clamp(44px, 8vw, 84px);
        font-weight: 900;
        letter-spacing: -0.5px;
        background: linear-gradient(135deg, #ffffff 0%, #facc15 45%, #d4af37 70%, #ffffff 100%);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 4px 30px rgba(212, 175, 55, 0.4);
        margin-bottom: 12px;
        line-height: 1.15;
      }
      .ns-brand-tagline {
        display: block;
        font-size: clamp(19px, 3.2vw, 30px);
        font-weight: 700;
        color: #e2e8f0;
        line-height: 1.4;
      }
      .ns-hero h1 {`;
  
  html = html.replace(oldCss, newCss);
  fs.writeFileSync('index.html', html, 'utf8');
  console.log('index.html hero updated successfully!');
} else {
  console.log('oldHeroRegex did not match');
}
