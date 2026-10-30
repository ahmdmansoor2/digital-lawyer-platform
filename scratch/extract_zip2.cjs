const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const zip = 'C:\\Users\\احمد منصور\\.gemini\\antigravity\\brain\\b15c9c9f-68d7-407e-98c8-cf10ec817cff\\.user_uploaded\\media_1792517211584_7da7e67f.zip';
const out = path.join(__dirname, 'extracted_new_zip_2');

if (fs.existsSync(out)) {
  fs.rmSync(out, { recursive: true, force: true });
}
fs.mkdirSync(out, { recursive: true });

execSync(`powershell -Command "Expand-Archive -LiteralPath '${zip}' -DestinationPath '${out}' -Force"`);

function listFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const full = path.join(dir, file);
    const stat = fs.statSync(full);
    if (stat && stat.isDirectory()) {
      results = results.concat(listFiles(full));
    } else {
      results.push({ path: path.relative(out, full), size: stat.size });
    }
  });
  return results;
}

const files = listFiles(out);
console.log(`Total files extracted: ${files.length}`);
files.forEach(f => console.log(`- ${f.path} (${f.size} bytes)`));
