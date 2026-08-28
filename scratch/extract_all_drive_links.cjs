const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const dbMeta = new sqlite3.Database('scratch/temp_meta.db', sqlite3.OPEN_READONLY);

dbMeta.all(`
  SELECT id, local_title, mime_type, is_folder, file_size
  FROM items
  WHERE trashed = 0
  ORDER BY local_title ASC
`, [], (err, rows) => {
  if (err) return console.error('Err:', err);
  console.log('Total items in items table:', rows.length);
  const files = rows.filter(r => !r.is_folder && (r.local_title.endsWith('.pdf') || r.local_title.endsWith('.doc') || r.local_title.endsWith('.docx')));
  const folders = rows.filter(r => r.is_folder);
  console.log('Total book files:', files.length);
  console.log('Total folders:', folders.length);
  console.log('Sample books with exact Drive IDs:');
  files.slice(0, 10).forEach((f, i) => {
    console.log(`${i+1}. ${f.local_title} -> https://drive.google.com/file/d/${f.id}/view (${(f.file_size / (1024*1024)).toFixed(2)} MB)`);
  });
});
