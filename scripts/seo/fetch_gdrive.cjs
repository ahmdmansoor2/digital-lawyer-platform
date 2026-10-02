'use strict';
const https = require('https');
const fs = require('fs');

const url = 'https://drive.google.com/file/d/1itM9kbXo8DqwTqTzEIJsBeOz9LnXbSf1/view?usp=sharing';

https.get(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'ar,en;q=0.9'
  }
}, res => {
  console.log('Status:', res.statusCode);
  if (res.headers.location) console.log('Location:', res.headers.location);
  let chunks = [];
  res.on('data', d => chunks.push(d));
  res.on('end', () => {
    const buf = Buffer.concat(chunks);
    console.log('Total bytes:', buf.length);
    fs.writeFileSync('gdrive_viewer.html', buf);
    const text = buf.toString('utf8');
    const title = text.match(/<title>([^<]+)<\/title>/i);
    console.log('Page Title:', title ? title[1] : 'None');
    
    // Check for JSON embedded metadata
    const jsonMatch = text.match(/window\['_DRIVE_ivd'\]\s*=\s*(\[[^;]+\]);/);
    if (jsonMatch) {
      console.log('Found DRIVE_ivd data!');
      fs.writeFileSync('gdrive_ivd.json', jsonMatch[1]);
    }
  });
}).on('error', err => console.error(err));
