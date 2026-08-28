const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const dbMirror = new sqlite3.Database('scratch/temp_mirror.db', sqlite3.OPEN_READONLY);
const dbMeta = new sqlite3.Database('scratch/temp_meta.db', sqlite3.OPEN_READONLY);

// Attach meta database to mirror database so we can join in one query
dbMirror.all(`
  ATTACH DATABASE 'scratch/temp_meta.db' AS meta;
`, [], (err) => {
  if (err) return console.error('Attach error:', err);
  
  dbMirror.all(`
    SELECT 
      m.local_stable_id,
      m.parent_local_stable_id,
      m.local_filename,
      m.local_type,
      m.local_size,
      i.id as drive_id,
      i.mime_type
    FROM mirror_item m
    LEFT JOIN meta.items i ON m.stable_id = i.stable_id
    WHERE m.local_type = 1 -- file
      AND (m.local_filename LIKE '%.pdf' OR m.local_filename LIKE '%.doc%')
      AND NOT (m.local_filename LIKE '$%') -- ignore temp word files
    ORDER BY m.local_size DESC
  `, [], (err, rows) => {
    if (err) return console.error('Query error:', err);
    console.log('Clean valid books count:', rows.length);
    console.log('Sample top major books with real Drive IDs:');
    rows.slice(0, 15).forEach((r, idx) => {
      const mb = (r.local_size / (1024 * 1024)).toFixed(2);
      console.log(`${idx + 1}. [${mb} MB] ${r.local_filename} -> https://drive.google.com/file/d/${r.drive_id}/view`);
    });
  });
});
