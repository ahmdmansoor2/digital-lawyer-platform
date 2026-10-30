const fs = require('fs');
const path = require('path');

const fbPath = path.join(__dirname, '..', 'firebase.json');
const fb = JSON.parse(fs.readFileSync(fbPath, 'utf8'));

// Find app target
const appTarget = fb.hosting.find(h => h.target === 'app');
if (appTarget && appTarget.headers) {
  // Check if noindex header already exists
  const hasNoIndex = appTarget.headers.some(h => h.source && h.source.includes('404'));
  if (!hasNoIndex) {
    appTarget.headers.push(
      {
        source: '/@(404|search|action).html',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow'
          }
        ]
      },
      {
        source: '/__/auth/**',
        headers: [
          {
            key: 'X-Robots-Tag',
            value: 'noindex, nofollow'
          }
        ]
      }
    );
    fs.writeFileSync(fbPath, JSON.stringify(fb, null, 2), 'utf8');
    console.log('Successfully added noindex headers to app target in firebase.json!');
  } else {
    console.log('Headers already present.');
  }
} else {
  console.error('App target or headers not found!');
}
