const fs = require('fs');
const path = require('path');

const jsonPath = path.join('d:', 'قانوني 7', 'fazlka-news', 'output', 'articles', '2026-09-18', 'نيران ترامب تلاحق مسربي «وثائق إيران»_ تهديدات علنية ووعيد ب.json');
const article = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const outText = `==================================================
📰 مقال جاهز للنشر الفوري على «صوت مصر 24»
==================================================

1️⃣ العنوان (Title):
${article.title}

2️⃣ التسميات / القسم (Labels):
${article.category}, ${article.tags.join(', ')}

3️⃣ كود المقال (HTML) - انسخه بالكامل وضعه في محرر بلوجر (وضع عرض HTML):
--------------------------------------------------
${article.full_blogger_html}
--------------------------------------------------
`;

const desktopFile = path.join(process.env.USERPROFILE || 'C:\\\\Users\\\\احمد منصور', 'Desktop', 'مقال_للنشر_صوت_مصر_24.txt');
fs.writeFileSync(desktopFile, outText, 'utf8');
console.log('Saved to desktop:', desktopFile);
