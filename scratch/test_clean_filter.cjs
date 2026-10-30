const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'public', 'blog');
const PILLARS_DIR = path.join(ROOT, 'public', 'pillars');
const FORMS_DOCS_DIR = path.join(ROOT, 'public', 'legal-forms-docs');
const LIBRARY_TOPICS_DIR = path.join(ROOT, 'public', 'legal-library-topics');
const COURTS_DIR = path.join(ROOT, 'public', 'courts');
const BASE_URL = 'https://mohamidigital.online';

// 1. Read firebase redirects
const fbPath = path.join(ROOT, 'firebase.json');
const fbRedirectSources = new Set();
try {
  const fbData = JSON.parse(fs.readFileSync(fbPath, 'utf8'));
  const redirects = fbData.hosting?.[0]?.redirects || [];
  redirects.forEach(r => {
    if (r.source) {
      fbRedirectSources.add(r.source);
      fbRedirectSources.add(r.source.replace(/^\//, ''));
      fbRedirectSources.add(r.source.split('/').pop());
    }
  });
} catch (e) {
  console.error('Failed to read firebase.json redirects', e);
}

function listHtml(dir) {
  return fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((f) => /^[a-z0-9_-]+\.html$/.test(f) && f !== 'index.html').sort()
    : [];
}

function isIndexable(dir, filename, urlPath) {
  // If in firebase redirects
  if (fbRedirectSources.has(urlPath) || fbRedirectSources.has(filename)) return false;
  try {
    const full = path.join(dir, filename);
    const html = fs.readFileSync(full, 'utf8');
    if (/content=["'][^"']*noindex[^"']*["']/i.test(html)) return false;
    const cMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
    if (cMatch && cMatch[1]) {
      const canonical = cMatch[1].trim();
      const targetUrl = BASE_URL + urlPath;
      if (canonical !== targetUrl && canonical !== targetUrl.replace(/\/$/, '')) {
        return false;
      }
    }
    return true;
  } catch {
    return false;
  }
}

const blogFiles = listHtml(BLOG_DIR).filter(f => isIndexable(BLOG_DIR, f, `/blog/${f}`));
const pillarFiles = listHtml(PILLARS_DIR).filter(f => isIndexable(PILLARS_DIR, f, `/pillars/${f}`));
const formsDocFiles = listHtml(FORMS_DOCS_DIR).filter(f => isIndexable(FORMS_DOCS_DIR, f, `/legal-forms-docs/${f}`));
const libraryTopicFiles = listHtml(LIBRARY_TOPICS_DIR).filter(f => isIndexable(LIBRARY_TOPICS_DIR, f, `/legal-library-topics/${f}`));
const courtFiles = listHtml(COURTS_DIR).filter(f => isIndexable(COURTS_DIR, f, `/courts/${f}`));

console.log('Blog indexable files:', blogFiles.length);
console.log('Pillar files:', pillarFiles.length);
console.log('Forms doc files:', formsDocFiles.length);
console.log('Library topic files:', libraryTopicFiles.length);
console.log('Court files:', courtFiles.length);
