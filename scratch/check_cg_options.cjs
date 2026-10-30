const fs = require('fs');

const v6 = fs.readFileSync('scratch/extracted_v6/contract-generator.html', 'utf8').split('\n');
const pub = fs.readFileSync('public/contract-generator.html', 'utf8').split('\n');

console.log('v6 lines:', v6.length, 'pub lines:', pub.length);

// Check new templates or options in select
const getOptions = (lines) => lines.filter(l => l.includes('<option value=')).map(l => l.trim());
console.log('v6 options count:', getOptions(v6).length);
console.log('pub options count:', getOptions(pub).length);

const v6Opt = getOptions(v6);
const pubOpt = new Set(getOptions(pub));
const addedOpt = v6Opt.filter(o => !pubOpt.has(o));
console.log('Added options in v6:', addedOpt);
