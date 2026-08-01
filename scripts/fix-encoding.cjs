const fs = require('fs');
const path = 'src/components/CasesList.tsx';
let content = fs.readFileSync(path, 'utf8');

// تحويل cp1256 bytes إلى UTF-8 strings
// في cp1256: أ=0xC3, ت=0xCA, ع=0xC9, ا=0xC7, ب=0xC8 → utf8: أ=C3=D8=83
const cp1256ToUtf8 = {
  'ط£طھط¹ط§ط¨': 'أتعاب',
  'ظˆط§ط±ط¯': 'وارد',
  'ظ…طھط¯ط§ظˆظ„ط©': 'متداولة',
  'ظ…ط­ط¬ظˆط²ط© ظ„ظ„ط­ظƒظ…': 'محجوزة للحكم',
  'ظ‚ط§ط¯ظ…ط©': 'قادمة',
  'ظ…ظ†طھظ‡ظٹط©': 'منتهية',
  'طµط§ط¯ط±': 'صادر',
  'ظ…طµط±ظˆظپط§طھ ط¯ط¹ظˆظ‰': 'مصروفات دعوى',
  'ظ…طµط§ط±ظٹظپ ظ…ظƒطھط¨': 'مصاريف مكتب',
  'طھط´ط؛ظٹظ„ظٹط©': 'تشغيلية',
  'ط­ط§ظ„ط© ط§ظ„ظ‚ط¶ظٹط©': 'حالة القضية',
  'ط·ط؛ط¨ط§ط·': 'طباخ',
  'طھظ… ط§ظ„ط§ط³طھظ„ط§ظ… ظˆط§ظ„طھط³ظ„ظٹظ…': 'تم الاستلام والتسليم',
  'ظ…ط¬ظ„ط¯': 'مجلد',
  'ط§ظ„ط·ط¨ط§ط¹ط©': 'الطباعة',
  'ط­ط°ظپ': 'حذف',
};

let count = 0;
for (const [bad, good] of Object.entries(cp1256ToUtf8)) {
  if (content.includes(bad)) {
    content = content.split(bad).join(good);
    count++;
  }
}
fs.writeFileSync(path, content, 'utf8');
console.log('Replaced', count, 'patterns');