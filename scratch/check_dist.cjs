const fs = require('fs');
const distHtml = fs.readFileSync('dist/index.html', 'utf8');
console.log('has public-landing-portal:', distHtml.includes('public-landing-portal'));
console.log('has app-workspace-wrapper:', distHtml.includes('app-workspace-wrapper'));
console.log('has root:', distHtml.includes('id="root"'));
console.log('has script module:', distHtml.includes('type="module"'));
console.log('html size:', distHtml.length);
