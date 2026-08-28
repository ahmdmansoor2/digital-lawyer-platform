const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const srcMeta = 'C:\\Users\\احمد منصور\\AppData\\Local\\Google\\DriveFS\\114376150451857670813\\mirror_metadata_sqlite.db';
const srcMirror = 'C:\\Users\\احمد منصور\\AppData\\Local\\Google\\DriveFS\\114376150451857670813\\mirror_sqlite.db';

if (!fs.existsSync('scratch')) fs.mkdirSync('scratch', { recursive: true });

fs.copyFileSync(srcMeta, 'scratch/temp_meta.db');
fs.copyFileSync(srcMirror, 'scratch/temp_mirror.db');

console.log('--- Inspecting temp_meta.db ---');
const dbMeta = new sqlite3.Database('scratch/temp_meta.db', sqlite3.OPEN_READONLY, () => {
  dbMeta.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
    if (err) return console.error('Meta err:', err);
    console.log('Meta tables:', rows.map(r => r.name));
    rows.forEach(r => {
      dbMeta.all(`PRAGMA table_info(${r.name})`, [], (e, cols) => {
        console.log(`Table ${r.name} columns:`, cols.map(c => c.name));
      });
    });
  });
});

console.log('--- Inspecting temp_mirror.db ---');
const dbMirror = new sqlite3.Database('scratch/temp_mirror.db', sqlite3.OPEN_READONLY, () => {
  dbMirror.all("SELECT name FROM sqlite_master WHERE type='table'", [], (err, rows) => {
    if (err) return console.error('Mirror err:', err);
    console.log('Mirror tables:', rows.map(r => r.name));
    rows.forEach(r => {
      dbMirror.all(`PRAGMA table_info(${r.name})`, [], (e, cols) => {
        console.log(`Table ${r.name} columns:`, cols.map(c => c.name));
      });
    });
  });
});
