/**
 * clean-dist.cjs — يحذف المجلدات/الملفات الضخمة من dist/ بعد بناء Vite
 * يطابق أنماط .firebaseignore.
 */
const fs = require('fs');
const path = require('path');

const DIST = 'D:\\قانوني 7\\dist';
const IGNORE_FILE = 'D:\\قانوني 7\\public\\.firebaseignore';

if (!fs.existsSync(IGNORE_FILE)) {
  console.log('No .firebaseignore found - nothing to clean.');
  process.exit(0);
}

const lines = fs.readFileSync(IGNORE_FILE, 'utf8')
  .split('\n')
  .map(l => l.trim())
  .filter(l => l && !l.startsWith('#'));

let totalRemoved = 0;
let totalSize = 0;

function getDirSize(dir) {
  const stat = fs.statSync(dir);
  if (!stat.isDirectory()) return stat.size;
  let total = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) total += getDirSize(f);
    else total += fs.statSync(f).size;
  }
  return total;
}

function getDirCount(dir) {
  const stat = fs.statSync(dir);
  if (!stat.isDirectory()) return 1;
  let total = 0;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const f = path.join(dir, e.name);
    if (e.isDirectory()) total += getDirCount(f);
    else total += 1;
  }
  return total;
}

function removeRecursive(p) {
  if (!fs.existsSync(p)) return;
  const stat = fs.statSync(p);
  if (stat.isDirectory()) {
    for (const e of fs.readdirSync(p)) {
      removeRecursive(path.join(p, e));
    }
    fs.rmdirSync(p);
  } else {
    totalSize += stat.size;
    fs.unlinkSync(p);
    totalRemoved++;
  }
}

function globToRegex(pattern) {
  let regex = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '__DSTAR__')
    .replace(/\*/g, '[^/]*')
    .replace(/__DSTAR__/g, '.*');
  return new RegExp('^' + regex + '$');
}

function shouldIgnore(name) {
  for (const pattern of lines) {
    const re = globToRegex(pattern);
    if (re.test(name) || re.test(name + '/')) return true;
  }
  return false;
}

function walkAndClean(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(DIST, full).replace(/\\/g, '/');
    if (shouldIgnore(rel) || shouldIgnore(entry.name)) {
      const subSize = getDirSize(full);
      const subCount = getDirCount(full);
      totalSize += subSize;
      totalRemoved += subCount;
      removeRecursive(full);
      console.log('  [REMOVED] ' + rel + ' (' + (subSize / 1048576).toFixed(1) + ' MB, ' + subCount + ' files)');
    } else if (entry.isDirectory()) {
      walkAndClean(full);
    }
  }
}

console.log('Cleaning dist/ based on .firebaseignore...');
walkAndClean(DIST);
console.log('');
console.log('Total removed: ' + totalRemoved + ' files, ' + (totalSize / 1048576).toFixed(1) + ' MB');

let remSize = 0;
for (const e of fs.readdirSync(DIST, { withFileTypes: true })) {
  const f = path.join(DIST, e.name);
  if (e.isDirectory()) remSize += getDirSize(f);
  else remSize += fs.statSync(f).size;
}
console.log('Remaining dist/ size: ' + (remSize / 1048576).toFixed(1) + ' MB');
