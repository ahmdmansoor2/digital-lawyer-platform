'use strict';
const fs = require('fs');

// Blog audit
const blogDir = 'public/blog';
const blogFiles = fs.readdirSync(blogDir).filter(function(f) { return f.endsWith('.html') && f !== 'index.html'; });

var noRobots = [];
var noCanonical = [];
var noOgImage = [];
var duplicateTitles = {};
var shortContent = [];

blogFiles.forEach(function(f) {
  const html = fs.readFileSync(blogDir + '/' + f, 'utf8');
  const hasRobots = html.indexOf('name="robots"') !== -1 || html.indexOf("name='robots'") !== -1;
  const hasCanonical = html.indexOf('rel="canonical"') !== -1 || html.indexOf("rel='canonical'") !== -1;
  const hasOgImage = html.indexOf('og:image') !== -1;
  if (!hasRobots) noRobots.push(f);
  if (!hasCanonical) noCanonical.push(f);
  if (!hasOgImage) noOgImage.push(f);
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  if (titleMatch) {
    const t = titleMatch[1].trim();
    duplicateTitles[t] = (duplicateTitles[t] || 0) + 1;
  }
  const textLen = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().length;
  if (textLen < 3000) shortContent.push({ file: f, len: textLen });
});

const dupes = Object.entries(duplicateTitles).filter(function(e) { return e[1] > 1; });

console.log('Blog audit summary (' + blogFiles.length + ' articles):');
console.log('No robots meta: ' + noRobots.length + (noRobots.length > 0 ? ' | first5: ' + noRobots.slice(0, 5).join(', ') : ''));
console.log('No canonical: ' + noCanonical.length);
console.log('No og:image: ' + noOgImage.length);
console.log('Duplicate titles: ' + dupes.length + (dupes.length > 0 ? JSON.stringify(dupes.slice(0, 3)) : ''));
console.log('Short content (<3000 chars): ' + shortContent.length);
shortContent.slice(0, 5).forEach(function(s) { console.log('  ' + s.file + ': ' + s.len + ' chars'); });

// Pillars audit
const pillarsDir = 'public/pillars';
const pillarFiles = fs.readdirSync(pillarsDir).filter(function(f) { return f.endsWith('.html') && f !== 'index.html'; });
var pillarsNoSchema = [];
pillarFiles.forEach(function(f) {
  const html = fs.readFileSync(pillarsDir + '/' + f, 'utf8');
  if (html.indexOf('application/ld+json') === -1) pillarsNoSchema.push(f);
});
console.log('\nPillars (' + pillarFiles.length + '):');
console.log('No JSON-LD schema: ' + pillarsNoSchema.length);

// Courts audit
const courtsDir = 'public/courts';
const courtFiles = fs.readdirSync(courtsDir).filter(function(f) { return f.endsWith('.html'); });
var courtsNoSchema = [];
var courtsNoRobots = [];
var courtsNoCanonical = [];
courtFiles.forEach(function(f) {
  const html = fs.readFileSync(courtsDir + '/' + f, 'utf8');
  if (html.indexOf('application/ld+json') === -1) courtsNoSchema.push(f);
  if (html.indexOf('name="robots"') === -1) courtsNoRobots.push(f);
  if (html.indexOf('rel="canonical"') === -1) courtsNoCanonical.push(f);
});
console.log('\nCourts (' + courtFiles.length + '):');
console.log('No JSON-LD schema: ' + courtsNoSchema.length);
console.log('No robots meta: ' + courtsNoRobots.length);
console.log('No canonical: ' + courtsNoCanonical.length);

// Radar topics
const radarDir = 'public/radar-topics';
const radarFiles = fs.readdirSync(radarDir).filter(function(f) { return f.endsWith('.html'); });
var radarNoSchema = [];
var radarNoRobots = [];
radarFiles.forEach(function(f) {
  const html = fs.readFileSync(radarDir + '/' + f, 'utf8');
  if (html.indexOf('application/ld+json') === -1) radarNoSchema.push(f);
  if (html.indexOf('name="robots"') === -1) radarNoRobots.push(f);
});
console.log('\nRadar topics (' + radarFiles.length + '):');
console.log('No JSON-LD schema: ' + radarNoSchema.length);
console.log('No robots meta: ' + radarNoRobots.length);

// Check for internal links from homepage to blog
const indexHtml = fs.readFileSync('index.html', 'utf8');
const blogLinksInHome = (indexHtml.match(/href="\/blog\//gi) || []).length;
const pillarsLinksInHome = (indexHtml.match(/href="\/pillars\//gi) || []).length;
console.log('\nInternal links in index.html:');
console.log('Links to /blog/: ' + blogLinksInHome);
console.log('Links to /pillars/: ' + pillarsLinksInHome);
