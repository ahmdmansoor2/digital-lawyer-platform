'use strict';
const fs = require('fs');

// Check news-sitemap freshness
const news = fs.readFileSync('public/news-sitemap.xml', 'utf8');
const dates = (news.match(/<publication_date>([^<]+)<\/publication_date>/g) || []).map(function(d) { return d.replace(/<[^>]+>/g, ''); });
const now = Date.now();
const stale = dates.filter(function(d) { return (now - new Date(d).getTime()) > 48 * 3600 * 1000; });
console.log('News sitemap - total URLs: ' + (news.match(/<loc>/g) || []).length);
console.log('Stale articles (>48h): ' + stale.length + (stale.length > 0 ? ' WARNING: GOOGLE NEWS IGNORES THESE!' : ''));
dates.forEach(function(d) { console.log('  Date: ' + d + ' | Age: ' + Math.round((now - new Date(d).getTime()) / 3600000) + 'h'); });

// Check for | | title issue
const blogDir = 'public/blog';
const blogFiles = fs.readdirSync(blogDir).filter(function(f) { return f.endsWith('.html') && f !== 'index.html'; });
var titleIssues = [];
blogFiles.forEach(function(f) {
  const html = fs.readFileSync(blogDir + '/' + f, 'utf8');
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    const t = titleMatch[1].trim();
    if (t.indexOf('| |') !== -1) titleIssues.push({ file: f, title: t });
  }
});
console.log('\nBlog titles with | | issue: ' + titleIssues.length);
titleIssues.slice(0, 5).forEach(function(t) { console.log('  ' + t.file + ': ' + t.title); });

// Check keywords repeated in meta description (keyword stuffing check)
var descKeywordOveruse = [];
blogFiles.slice(0, 20).forEach(function(f) {
  const html = fs.readFileSync(blogDir + '/' + f, 'utf8');
  const descMatch = html.match(/<meta[^>]*name="description"[^>]*content="([^"]+)"/i);
  if (descMatch) {
    const d = descMatch[1];
    if (d.indexOf('| المحامي الرقمي') !== -1) descKeywordOveruse.push(f);
  }
});
console.log('\nBlog descriptions with | المحامي الرقمي: ' + descKeywordOveruse.length + '/20 sample');

// Mega important: Does Firebase serve the React SPA for /blog/post.html pages?
// Check if any blog/article is missing from dist/blog
const distBlogFiles = fs.existsSync('dist/blog') ? fs.readdirSync('dist/blog').filter(function(f) { return f.endsWith('.html'); }) : [];
const publicBlogFiles = blogFiles.map(function(f) { return f; });
const missingFromDist = publicBlogFiles.filter(function(f) { return distBlogFiles.indexOf(f) === -1; });
console.log('\nDist/blog file count: ' + distBlogFiles.length);
console.log('Missing from dist/blog: ' + missingFromDist.length);
if (missingFromDist.length > 0) missingFromDist.slice(0, 10).forEach(function(f) { console.log('  MISSING: ' + f); });

// Check blog/index.html for article links count
const blogIndex = fs.readFileSync('public/blog/index.html', 'utf8');
const patt = /href="\/blog\/[a-z0-9-]+\.html"/gi;
const articleLinks = (blogIndex.match(patt) || []).length;
console.log('\nBlog index.html article links: ' + articleLinks);
console.log('Blog index file size: ' + blogIndex.length + ' bytes');
