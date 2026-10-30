const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const regex = /"@type":\s*\["Organization",\s*"LegalService"\],\r?\n\s*"@id":\s*"https:\/\/mohamidigital\.online\/#organization",\r?\n\s*"name":\s*"منصة المحامي الرقمية",\r?\n\s*"alternateName":\s*\["المحامي الرقمي",/;

const replacement = `"@type": ["Organization", "LegalService"],
      "@id": "https://mohamidigital.online/#organization",
      "name": "المحامي الرقمي",
      "alternateName": ["منصة المحامي الرقمية",`;

if (regex.test(html)) {
  html = html.replace(regex, replacement);
  fs.writeFileSync('index.html', html, 'utf8');
  console.log('Schema 1 updated successfully via regex');
} else {
  console.log('Regex did not match');
}
