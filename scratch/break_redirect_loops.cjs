const fs = require('fs');
const path = require('path');

const fbPath = path.join(__dirname, '..', 'firebase.json');
const fb = JSON.parse(fs.readFileSync(fbPath, 'utf8'));
const hosting = fb.hosting.find(h => h.target === 'app');

// Remove any redirect whose source is the master:
const MASTERS = new Set([
  '/blog/cybercrime-defamation-laws-egypt.html',
  '/blog/cybercrime-defamation-laws-egypt',
  '/blog/foreign-currency-laws-egypt.html',
  '/blog/foreign-currency-laws-egypt'
]);

let redirects = hosting.redirects.filter(r => !MASTERS.has(r.source));

// Update any redirect that pointed to the loop target to point directly to master
redirects.forEach(r => {
  if (r.destination === '/blog/cyber-defamation-slander-laws-egypt.html') {
    r.destination = '/blog/cybercrime-defamation-laws-egypt.html';
  }
  if (r.destination === '/blog/cybercrime-data-leaks-laws-egypt.html') {
    r.destination = '/blog/cybercrime-defamation-laws-egypt.html';
  }
  if (r.destination === '/blog/foreign-currency-illegal-trading-egypt.html') {
    r.destination = '/blog/foreign-currency-laws-egypt.html';
  }
});

// Ensure cyber-defamation-slander redirects to cybercrime-defamation-laws-egypt
const hasSlanderHtml = redirects.some(r => r.source === '/blog/cyber-defamation-slander-laws-egypt.html');
if (!hasSlanderHtml) {
  redirects.push({
    source: '/blog/cyber-defamation-slander-laws-egypt.html',
    destination: '/blog/cybercrime-defamation-laws-egypt.html',
    type: 301
  });
}
const hasSlanderNoExt = redirects.some(r => r.source === '/blog/cyber-defamation-slander-laws-egypt');
if (!hasSlanderNoExt) {
  redirects.push({
    source: '/blog/cyber-defamation-slander-laws-egypt',
    destination: '/blog/cybercrime-defamation-laws-egypt.html',
    type: 301
  });
}

// Verify loop detection
const map = {};
redirects.forEach(r => {
  map[r.source] = r.destination;
});

const loops = [];
for (const [src, dest] of Object.entries(map)) {
  let curr = dest;
  let visited = [src];
  while (map[curr]) {
    if (visited.includes(curr)) {
      loops.push([...visited, curr]);
      break;
    }
    visited.push(curr);
    curr = map[curr];
  }
}

if (loops.length > 0) {
  console.error('ERROR: Remaining loops found:', loops);
  process.exit(1);
}

console.log('Verification passed: 0 redirect loops remaining!');
hosting.redirects = redirects;
fs.writeFileSync(fbPath, JSON.stringify(fb, null, 2), 'utf8');
console.log('firebase.json updated successfully with', redirects.length, 'redirects.');
