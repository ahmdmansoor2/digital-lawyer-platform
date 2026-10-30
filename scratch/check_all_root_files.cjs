const fs = require('fs');
const path = require('path');

const dirV6 = 'scratch/extracted_v6';
const pubDir = 'public';

const files = fs.readdirSync(dirV6, { withFileTypes: true });

for (const f of files) {
  if (f.isFile() && f.name.endsWith('.html')) {
    const pV6 = path.join(dirV6, f.name);
    const pPub = path.join(pubDir, f.name);
    if (!fs.existsSync(pPub)) {
      console.log('NEW FILE in v6:', f.name, fs.statSync(pV6).size);
    } else {
      const sV6 = fs.statSync(pV6).size;
      const sPub = fs.statSync(pPub).size;
      if (sV6 > sPub) {
        console.log(`v6 LARGER: ${f.name} (v6: ${sV6} > pub: ${sPub})`);
      } else if (sV6 < sPub) {
        console.log(`pub LARGER: ${f.name} (pub: ${sPub} > v6: ${sV6})`);
      } else {
        console.log(`SAME SIZE: ${f.name} (${sV6})`);
      }
    }
  }
}
