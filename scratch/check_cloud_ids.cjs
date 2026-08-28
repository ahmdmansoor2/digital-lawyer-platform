const sqlite3 = require('sqlite3').verbose();

const dbMeta = new sqlite3.Database('scratch/temp_meta.db', sqlite3.OPEN_READONLY);

dbMeta.all(`
  SELECT stable_id, cloud_id FROM stable_ids LIMIT 15
`, [], (err, rows) => {
  if (err) return console.error('Err stable_ids:', err);
  console.log('Sample stable_ids mapping:');
  console.log(rows);
});

dbMeta.all(`
  SELECT stable_id, id, local_title FROM items LIMIT 15
`, [], (err, rows) => {
  if (err) return console.error('Err items:', err);
  console.log('Sample items mapping:');
  console.log(rows);
});
