const fs = require('fs');
const path = require('path');

const BLOG_DIR = 'public/blog';
const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html') && f !== 'index.html');
console.log('Total blog html files:', files.length);

const logData = JSON.parse(fs.readFileSync('scripts/published-log.json', 'utf8'));
const published = logData.published || [];
const logBySlug = {};
published.forEach(p => {
  logBySlug[p.slug] = p;
  logBySlug[p.slug + '.html'] = p;
});

const articles = [];

for (const file of files) {
  const filePath = path.join(BLOG_DIR, file);
  const slug = file.replace(/\.html$/, '');
  const html = fs.readFileSync(filePath, 'utf8');

  // Extract title
  let title = '';
  const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
  if (titleMatch) {
    title = titleMatch[1].replace(/\s*\|.*$/, '').trim();
  }
  if (!title) {
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    if (h1Match) title = h1Match[1].trim();
  }

  // Extract meta description
  let metaDesc = '';
  const descMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i) ||
                    html.match(/<meta\s+content=["']([^"']+)["']\s+name=["']description["']/i);
  if (descMatch) metaDesc = descMatch[1].trim();

  // Extract date
  let date = '';
  if (logBySlug[slug] && logBySlug[slug].date) {
    date = logBySlug[slug].date;
  }
  if (!date) {
    const timeMatch = html.match(/<time[^>]*datetime=["']([^"']+)["']/i) ||
                      html.match(/📅\s*([^\n<]+)/);
    if (timeMatch) date = timeMatch[1].trim();
  }
  // Try schema datePublished
  if (!date) {
    const schemaMatch = html.match(/"datePublished":\s*"([^"]+)"/);
    if (schemaMatch) date = schemaMatch[1].slice(0, 10);
  }
  if (!date) {
    date = '2026-10-15'; // Default fallback
  }

  // Extract category / tag
  let tag = '';
  if (logBySlug[slug] && logBySlug[slug].tags && logBySlug[slug].tags.length > 0) {
    tag = logBySlug[slug].tags[0];
  }
  if (!tag) {
    const tagMatch = html.match(/<span\s+class=["'][^"']*tag[^"']*["']>([^<]+)<\/span>/i) ||
                     html.match(/<a\s+class=["'][^"']*category[^"']*["']>([^<]+)<\/a>/i);
    if (tagMatch) tag = tagMatch[1].trim();
  }
  if (!tag) tag = 'استشارات قانونية';

  // Extract image
  let image = '';
  const ogImgMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
  if (ogImgMatch) {
    image = ogImgMatch[1].trim();
    if (image.startsWith('https://mohamidigital.online')) {
      image = image.replace('https://mohamidigital.online', '');
    }
  }
  if (!image) {
    if (fs.existsSync(`public/blog/images/${slug}.jpg`)) {
      image = `/blog/images/${slug}.jpg`;
    } else if (fs.existsSync(`public/blog/images/${slug}.webp`)) {
      image = `/blog/images/${slug}.webp`;
    } else {
      image = '/blog/assets/civil-compensation.jpg';
    }
  }

  articles.push({
    file,
    slug,
    title: title || slug,
    metaDesc: metaDesc || 'دليل واستشارة قانونية متخصصة ومحدثة وفق أحكام القانون المصري ومحكمة النقض.',
    date,
    tag,
    image,
    readTime: '6'
  });
}

console.log('Extracted articles count:', articles.length);

// Sort articles descending by date
articles.sort((a, b) => {
  const da = new Date(a.date).getTime() || 0;
  const db = new Date(b.date).getTime() || 0;
  return db - da;
});

console.log('Top 10 newest articles:');
articles.slice(0, 10).forEach(a => console.log(a.date, a.slug, a.title));

console.log('Bottom 5 oldest articles:');
articles.slice(-5).forEach(a => console.log(a.date, a.slug, a.title));
