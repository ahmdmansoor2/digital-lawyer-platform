const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const dbMirror = new sqlite3.Database('scratch/temp_mirror.db', sqlite3.OPEN_READONLY);

// Attach meta database
dbMirror.all(`ATTACH DATABASE 'scratch/temp_meta.db' AS meta;`, [], (err) => {
  if (err) return console.error('Attach error:', err);

  // First, get all folders and their names to reconstruct path
  dbMirror.all(`
    SELECT local_stable_id, parent_local_stable_id, local_filename, local_type
    FROM mirror_item
  `, [], (err, allItems) => {
    if (err) return console.error(err);

    const itemMap = new Map();
    allItems.forEach(it => itemMap.set(it.local_stable_id, it));

    function getFullPath(local_stable_id) {
      const parts = [];
      let cur = itemMap.get(local_stable_id);
      while (cur && cur.parent_local_stable_id) {
        parts.unshift(cur.local_filename);
        cur = itemMap.get(cur.parent_local_stable_id);
      }
      return parts.join('/');
    }

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
        AND NOT (m.local_filename LIKE '$%')
        AND NOT (m.local_filename LIKE '~%')
        AND i.id IS NOT NULL
      ORDER BY m.local_size DESC
    `, [], (err, rows) => {
      if (err) return console.error(err);

      console.log('Total extracted files with valid Drive ID:', rows.length);

      const catalog = [];
      const seenTitles = new Set();

      rows.forEach(r => {
        const fullPath = getFullPath(r.local_stable_id);
        const fileName = r.local_filename;
        const cleanTitle = fileName.replace(/\.(pdf|docx|doc)$/i, '').replace(/_/g, ' ').trim();

        if (!cleanTitle || cleanTitle.length < 3) return;
        if (cleanTitle.startsWith('~$') || cleanTitle.startsWith('.')) return;

        // Determine category based on path and title
        let category = 'general';
        let categoryName = 'الموسوعات العامة والتشريعات';
        let icon = '📚';

        const p = (fullPath + ' ' + cleanTitle).toLowerCase();
        if (p.includes('مدني') || p.includes('سنهوري') || p.includes('تناغو') || p.includes('عقد') || p.includes('التزام') || p.includes('بيوع') || p.includes('شفعة')) {
          category = 'civil';
          categoryName = 'القانون المدني';
          icon = '🏛️';
        } else if (p.includes('جنائ') || p.includes('عقوبات') || p.includes('جنح') || p.includes('تلبس') || p.includes('مخدرات') || p.includes('تفتيش') || p.includes('طب شرعي') || p.includes('سرور') || p.includes('حسني')) {
          category = 'criminal';
          categoryName = 'القانون الجنائي';
          icon = '⚖️';
        } else if (p.includes('مجلس الدولة') || p.includes('اداري') || p.includes('إداري') || p.includes('إلغاء') || p.includes('تأديب') || p.includes('فتوى') || p.includes('فتاوى')) {
          category = 'admin';
          categoryName = 'القضاء الإداري ومجلس الدولة';
          icon = '🏛️';
        } else if (p.includes('تجار') || p.includes('شركات') || p.includes('شيك') || p.includes('كمبيالة') || p.includes('إفلاس') || p.includes('تحكيم') || p.includes('قليوبي')) {
          category = 'commercial';
          categoryName = 'القانون التجاري والشركات';
          icon = '💼';
        } else if (p.includes('شخصية') || p.includes('أسرة') || p.includes('اسرة') || p.includes('خلع') || p.includes('طلاق') || p.includes('نفقة') || p.includes('ميراث') || p.includes('تركات') || p.includes('وصية') || p.includes('حضانة')) {
          category = 'family';
          categoryName = 'الأحوال الشخصية والأسرة';
          icon = '👨‍👩‍👧';
        } else if (p.includes('عمل') || p.includes('تأمين') || p.includes('معاش') || p.includes('فصل') || p.includes('عمال')) {
          category = 'labor';
          categoryName = 'قانون العمل والتأمينات';
          icon = '👷';
        } else if (p.includes('نقض') || p.includes('مكتب فني') || p.includes('مبدأ') || p.includes('مبادئ') || p.includes('أحكام')) {
          category = 'cassation';
          categoryName = 'مبادئ وأحكام محكمة النقض';
          icon = '📜';
        } else if (p.includes('صيغ') || p.includes('عقد ') || p.includes('مذكرة') || p.includes('مذكرات') || p.includes('دعوى') || p.includes('صحيفة')) {
          category = 'forms';
          categoryName = 'الصيغ والمذكرات القضائية';
          icon = '📝';
        } else if (p.includes('دستور') || p.includes('تشريع') || p.includes('قانون ') || p.includes('كود')) {
          category = 'legislation';
          categoryName = 'التشريعات والقوانين الدستورية';
          icon = '📖';
        }

        // Deduplicate duplicate names in same folder
        const dedupeKey = cleanTitle.toLowerCase() + '|' + category;
        if (seenTitles.has(dedupeKey)) return;
        seenTitles.add(dedupeKey);

        // Extract author if available
        let author = 'نخبة من كبار فقهاء القانون';
        if (cleanTitle.includes('السنهوري')) author = 'د. عبد الرزاق أحمد السنهوري';
        else if (cleanTitle.includes('سمير تناغو') || cleanTitle.includes('تناغو')) author = 'د. سمير تناغو';
        else if (cleanTitle.includes('سميحة القليوبي') || cleanTitle.includes('القليوبي')) author = 'د. سميحة القليوبي';
        else if (cleanTitle.includes('محمود نجيب حسني') || cleanTitle.includes('نجيب حسني')) author = 'د. محمود نجيب حسني';
        else if (cleanTitle.includes('فتحي سرور') || cleanTitle.includes('سرور')) author = 'د. أحمد فتحي سرور';
        else if (cleanTitle.includes('أبو الوفا') || cleanTitle.includes('ابو الوفا')) author = 'د. أحمد أبو الوفا';
        else if (cleanTitle.includes('الديناصوري')) author = 'المستشار عز الدين الديناصوري';
        else if (cleanTitle.includes('البسيوني') || cleanTitle.includes('البسيونى')) author = 'أ. البسيوني عبده المحامي';
        else if (cleanTitle.includes('مكتب فني') || cleanTitle.includes('محكمة النقض')) author = 'المكتب الفني لمحكمة النقض';
        else if (cleanTitle.includes('مجلس الدولة')) author = 'الجمعية العمومية والمحكمة الإدارية العليا';

        const sizeMb = (r.local_size / (1024 * 1024)).toFixed(2);

        catalog.push({
          id: r.drive_id,
          title: cleanTitle,
          author: author,
          category: category,
          categoryName: categoryName,
          icon: icon,
          size: sizeMb + ' MB',
          path: fullPath,
          directDriveUrl: `https://drive.google.com/file/d/${r.drive_id}/view`,
          downloadDriveUrl: `https://drive.google.com/uc?export=download&id=${r.drive_id}`
        });
      });

      console.log('Final clean distinct books catalog count:', catalog.length);

      const outDir = path.resolve('public/data');
      if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

      const outFile = path.join(outDir, 'legal-library-catalog.json');
      fs.writeFileSync(outFile, JSON.stringify(catalog, null, 2), 'utf8');
      console.log('Saved catalog JSON to:', outFile);
      console.log('File size:', (fs.statSync(outFile).size / 1024).toFixed(2), 'KB');
    });
  });
});
