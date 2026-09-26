'use strict';
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');

// Find all schema blocks
const schemas = [];
let idx = 0;
const needle = 'application/ld+json';

while (true) {
  const scriptStart = html.indexOf('<script', idx);
  if (scriptStart === -1) break;
  const scriptTagEnd = html.indexOf('>', scriptStart);
  const scriptTag = html.slice(scriptStart, scriptTagEnd + 1);
  const endTag = html.indexOf('</script>', scriptTagEnd);
  if (scriptTag.indexOf(needle) !== -1) {
    schemas.push({
      start: scriptStart,
      end: endTag + 9,
      content: html.slice(scriptTagEnd + 1, endTag).trim()
    });
  }
  idx = endTag + 9;
}

console.log('Total Schema blocks: ' + schemas.length);
schemas.forEach(function(s, i) {
  try {
    const json = JSON.parse(s.content);
    const type = Array.isArray(json) ? json.map(function(x) { return x['@type']; }).join(', ') : json['@type'];
    const lineNum = html.slice(0, s.start).split('\n').length;
    console.log('[' + i + '] @type=' + type + ' | line~' + lineNum);
  } catch (e) {
    const lineNum = html.slice(0, s.start).split('\n').length;
    console.log('[' + i + '] PARSE ERROR: ' + e.message.slice(0, 80) + ' | line~' + lineNum);
    console.log('  First 200 chars: ' + s.content.slice(0, 200));
  }
});
