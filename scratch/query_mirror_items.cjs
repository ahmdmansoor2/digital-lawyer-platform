const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');

const dbMirror = new sqlite3.Database('scratch/temp_mirror.db', sqlite3.OPEN_READONLY);

dbMirror.all(`
  SELECT local_filename, cloud_filename, stable_id, local_type, local_size
  FROM mirror_item
  WHERE (local_filename LIKE '%.pdf' OR local_filename LIKE '%.doc%')
  LIMIT 25
`, [], (err, rows) => {
  if (err) return console.error(err);
  console.log('Sample mapped files from mirror_item:');
  console.log(JSON.stringify(rows, null, 2));
});
