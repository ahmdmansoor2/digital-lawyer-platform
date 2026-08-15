#!/usr/bin/env node
/**
 * index-library.cjs — محرك الفهرسة والتصنيف الذكي للمكتبة القانونية
 * 
 * وضع القراءة فقط (READ-ONLY) — لا يعدل ولا يحذف ولا ينقل أي ملف أصلي.
 * يمسح D:\المكتبة القانونية ويصنف جميع الـ 10,333 ملفاً إلى 10 فروع قانونية
 * ويستخرج البيانات الوصفية (المؤلف، الفرع، الحجم، الامتداد، الوسوم).
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_LIBRARY = 'D:\\المكتبة القانونية';
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'public', 'data');
const CATALOG_OUTPUT = path.join(OUTPUT_DIR, 'legal-catalog.json');
const STATS_OUTPUT = path.join(OUTPUT_DIR, 'legal-library-stats.json');

if (!fs.existsSync(ROOT_LIBRARY)) {
  console.error(`❌ المسار غير موجود: ${ROOT_LIBRARY}`);
  process.exit(1);
}

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// ── خريطة كبار الفقهاء والمؤلفين القانونيين ──
const AUTHORS_MAP = [
  { name: 'د. عبد الرزاق السنهوري', keywords: ['السنهوري', 'سنهوري', 'الوسيط في شرح القانون المدني'] },
  { name: 'د. أحمد مليجي', keywords: ['احمد مليجي', 'أحمد مليجي', 'مليجي', 'الموسوعة الشاملة في التنفيذ'] },
  { name: 'د. محمود نجيب حسني', keywords: ['محمود نجيب حسني', 'نجيب حسني'] },
  { name: 'د. مأمون سلامة', keywords: ['مامون سلامة', 'مأمون سلامة'] },
  { name: 'د. رؤوف عبيد', keywords: ['رؤوف عبيد', 'رءوف عبيد'] },
  { name: 'د. حسن صادق المرصفاوي', keywords: ['المرصفاوي', 'مرصفاوي'] },
  { name: 'د. عبد الفتاح عبد الباقي', keywords: ['عبد الفتاح عبد الباقي'] },
  { name: 'د. عز الدين الدناصوري وحامد عكاز', keywords: ['الدناصوري', 'دناصوري', 'عكاز', 'الدناصوري وعكاز'] },
  { name: 'د. علي راتب', keywords: ['علي راتب', 'د. راتب', 'قضاء الامور المستعجلة على راتب'] },
  { name: 'د. سمير تناغو', keywords: ['تناغو', 'سمير تناغو'] },
  { name: 'د. جلال علي العدوي', keywords: ['العدوي', 'جلال العدوي'] },
  { name: 'د. رمضان أبو السعود', keywords: ['رمضان ابو السعود', 'رمضان أبو السعود'] },
  { name: 'د. فتحي والي', keywords: ['فتحي والي', 'والي'] },
  { name: 'د. حسام الدين الأهواني', keywords: ['الأهواني', 'الاهواني'] },
  { name: 'د. أحمد فتحي سرور', keywords: ['فتحي سرور', 'أحمد فتحي سرور'] },
  { name: 'د. محمد كامل ليلة', keywords: ['كامل ليلة'] },
  { name: 'د. سليمان الطماوي', keywords: ['الطماوي', 'سليمان الطماوي'] },
  { name: 'محكمة النقض المصرية', keywords: ['محكمة النقض', 'المستحدث من المبادئ', 'احكام النقض', 'أحكام النقض', 'طعن نقض'] },
  { name: 'مجلس الدولة المصري', keywords: ['مجلس الدولة', 'المحكمة الإدارية العليا', 'الجمعية العمومية لقسمي الفتوى والتشريع', 'فتوى'] },
  { name: 'المحكمة الدستورية العليا', keywords: ['المحكمة الدستورية', 'دستورية', 'المشرع الدستوري'] },
];

// ── الفروع القانونية العشرة الرئيسية ──
const BRANCHES_MAP = [
  {
    id: 'civil',
    name: 'القانون المدني والعقود',
    icon: '📕',
    color: '#3b82f6',
    keywords: ['قانون مدني', 'السنهوري', 'التزام', 'عقود', 'مسؤولية', 'تعويض', 'بيع', 'مقايضة', 'تأمينات', 'ملكية', 'شفعة', 'حيازة', 'بطلان', 'فسخ']
  },
  {
    id: 'criminal',
    name: 'القانون الجنائي والإجراءات الجنائية',
    icon: '⚖️',
    color: '#ef4444',
    keywords: ['قانون الجنائي', 'قانون العقوبات', 'اجراءات جنائية', 'جنح', 'جنايات', 'المرصفاوي', 'رؤوف عبيد', 'مامون سلامة', 'سرور', 'مخدرات', 'قتل', 'سرقة', 'تزوير', 'رشوة', 'اختلاس', 'حبس']
  },
  {
    id: 'personal-status',
    name: 'الأحوال الشخصية والمواريث والأسرة',
    icon: '👨‍👩‍👧‍👦',
    color: '#ec4899',
    keywords: ['احوال شخصية', 'أحوال شخصية', 'خلع', 'طلاق', 'نفقة', 'حضانة', 'رؤية', 'مواريث', 'ميراث', 'تركات', 'وصية', 'نسب', 'مسلمين', 'غير المسلمين', 'زواج', 'مهر', 'متعة']
  },
  {
    id: 'admin',
    name: 'القانون الإداري ومجلس الدولة',
    icon: '🏛️',
    color: '#8b5cf6',
    keywords: ['قانون الاداري', 'قانون الإداري', 'مجلس الدولة', 'دعوى الإلغاء', 'قضاء اداري', 'القضاء الادارى', 'موظفين', 'تأديب', 'منازعات ادارية', 'عقود ادارية', 'قرارات ادارية', 'طماوي']
  },
  {
    id: 'commercial',
    name: 'القانون التجاري والشركات والتحكيم',
    icon: '💼',
    color: '#f59e0b',
    keywords: ['قانون التجاري', 'قانون الشركات', 'قانون التحكيم', 'قانون الاقتصاد', 'اوراق تجارية', 'شيك', 'كمبيالة', 'سند لاذن', 'افلاس', 'تأسيس شركات', 'تحكيم تجاري', 'سجل تجاري', 'علامات تجارية', 'ملكية فكرية']
  },
  {
    id: 'leases',
    name: 'قانون الإيجارات والملكية العقارية',
    icon: '🏢',
    color: '#10b981',
    keywords: ['قانون الإيجار', 'إيجار', 'ايجار', 'اخلاء', 'إخلاء', 'طرد', 'أماكن', 'قانون 4 لسنة 1996', 'قانون 136 لسنة 1981', 'امتداد قانوني', 'سجل عيني', 'شهر عقاري', 'مباني', 'عقارات']
  },
  {
    id: 'procedures',
    name: 'قانون المرافعات والإثبات والتنفيذ الجبري',
    icon: '📑',
    color: '#06b6d4',
    keywords: ['قانون المرافعات', 'قانون الاثبات', 'المستعجل والتنفيذ', 'التنفيذ الجبري', 'حجز تحفظي', 'حجز تنفيذي', 'اشكال تنفيذ', 'إشكال', 'قضاء مستعجل', 'مليجي', 'دناصوري', 'اثبات', 'يمين', 'شهادة', 'خبرة']
  },
  {
    id: 'forms',
    name: 'صيغ ونماذج العقود والصحف والدعاوى',
    icon: '📜',
    color: '#6366f1',
    keywords: ['صيغ', 'إجراءات دعاوي', 'صحيفة', 'عريضة', 'نموذج', 'صيغة', 'عقد', 'انذار', 'إنذار', 'مذكرة دفاع', 'طعن']
  },
  {
    id: 'precedents',
    name: 'مبادئ وأحكام محكمة النقض والفتاوى',
    icon: '🛡️',
    color: '#14b8a6',
    keywords: ['المستحدث من المبادئ', 'احكام', 'أحكام', 'فتاوي', 'فتاوى', 'تشريعات', 'نقض', 'مبادئ', 'دوائر الإيجارات', 'الدوائر الجنائية', 'الدوائر المدنية', 'دستوري']
  },
  {
    id: 'encyclopedias',
    name: 'الموسوعات العامة والطب الشرعي والمذكرات',
    icon: '📚',
    color: '#a855f7',
    keywords: ['مؤلفات ومنوعات', 'سلسلة الطب الشرعي', 'شئون نقابة المحامين', 'المواعيد والمدد', 'مذكرات', 'قانون الطفل', 'قانون المرور', 'قانون العمل', 'تأمينات', 'معاشات', 'عسكري', 'جمارك']
  }
];

// دالة تنظيف اسم الملف
function cleanTitle(filename) {
  const ext = path.extname(filename);
  let name = path.basename(filename, ext);
  // إزالة الأرقام العشوائية في بداية أو نهاية الاسم
  name = name.replace(/^[\d\s_\-—.]+/, '').replace(/[\d\s_\-—.]+$/, '');
  name = name.replace(/[_\-]+/g, ' ').trim();
  return name || path.basename(filename, ext);
}

// دالة تحديد المؤلف من المسار والاسم
function detectAuthor(filePath, fileName) {
  const text = (filePath + ' ' + fileName).toLowerCase();
  for (const author of AUTHORS_MAP) {
    for (const kw of author.keywords) {
      if (text.includes(kw.toLowerCase())) {
        return author.name;
      }
    }
  }
  return 'فقه وقضاء مصري';
}

// دالة تحديد الفرع القانوني
function detectBranch(filePath, fileName) {
  const text = (filePath + ' ' + fileName).toLowerCase();
  
  // إذا كان في مجلد الصيغ الصريح بالفلاشة 2
  if (filePath.includes('الفلاشة 2\\صيغ') || filePath.includes('الفلاشة 2/صيغ') || filePath.includes('إجراءات دعاوي')) {
    return BRANCHES_MAP.find(b => b.id === 'forms');
  }

  // إذا كان في مجلد الأحكام والمبادئ بالفلاشة 1
  if (filePath.includes('المستحدث من المبادئ') || filePath.includes('احكام , فتاوي')) {
    return BRANCHES_MAP.find(b => b.id === 'precedents');
  }

  for (const branch of BRANCHES_MAP) {
    for (const kw of branch.keywords) {
      if (text.includes(kw.toLowerCase())) {
        return branch;
      }
    }
  }
  return BRANCHES_MAP.find(b => b.id === 'encyclopedias');
}

// دالة استخراج نوع المرجع
function detectDocType(ext, fileName, branchId) {
  const cleanExt = ext.toLowerCase();
  if (branchId === 'forms') return 'صيغة ونموذج قانوني';
  if (branchId === 'precedents') return 'مبدأ قضائي / حكم نقض';
  if (cleanExt === '.pdf') {
    if (fileName.includes('قانون') || fileName.includes('كود')) return 'تشريع وكود قانوني';
    return 'كتاب / مرجع فقهي';
  }
  if (cleanExt === '.doc' || cleanExt === '.docx') return 'مذكرة / صياغة قانونية';
  return 'وثيقة قانونية';
}

console.log('🚀 بدء الفحص الشامل وفهرسة المكتبة القانونية...');
console.time('indexing');

const allItems = [];
const branchStats = {};
BRANCHES_MAP.forEach(b => {
  branchStats[b.id] = { id: b.id, name: b.name, icon: b.icon, color: b.color, count: 0, totalBytes: 0, pdfCount: 0, docCount: 0 };
});

let totalFiles = 0;
let totalBytes = 0;

function scanRecursive(dir) {
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scanRecursive(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        // نستثني الملفات المؤقتة وملفات النظام
        if (entry.name.startsWith('~$') || ext === '.db' || ext === '.part') continue;

        try {
          const stat = fs.statSync(fullPath);
          const relPath = path.relative(ROOT_LIBRARY, fullPath);
          const branch = detectBranch(fullPath, entry.name);
          const author = detectAuthor(fullPath, entry.name);
          const title = cleanTitle(entry.name);
          const docType = detectDocType(ext, entry.name, branch.id);

          const item = {
            id: `lib-${totalFiles + 1}`,
            title,
            originalName: entry.name,
            relPath: relPath.replace(/\\/g, '/'),
            ext: ext.replace('.', ''),
            sizeBytes: stat.size,
            sizeFormatted: (stat.size / (1024 * 1024)).toFixed(1) + ' MB',
            branchId: branch.id,
            branchName: branch.name,
            author,
            docType,
            isDownloadable: true,
            isPdf: ext === '.pdf',
            isWord: ext === '.doc' || ext === '.docx',
          };

          allItems.push(item);
          totalFiles++;
          totalBytes += stat.size;

          // إحصاءات الفرع
          const bs = branchStats[branch.id];
          if (bs) {
            bs.count++;
            bs.totalBytes += stat.size;
            if (ext === '.pdf') bs.pdfCount++;
            if (ext === '.doc' || ext === '.docx') bs.docCount++;
          }
        } catch (err) {}
      }
    }
  } catch (err) {}
}

scanRecursive(ROOT_LIBRARY);

console.timeEnd('indexing');
console.log(`✅ تم فحص وفهرسة ${totalFiles} ملفاً قانونياً بإجمالي ${(totalBytes / (1024*1024*1024)).toFixed(2)} GB`);

// إنشاء الفهرس المحسّن للويب (خفيف وسريع التحميل)
const catalogData = {
  version: '2.0.0',
  generatedAt: new Date().toISOString(),
  totalItems: totalFiles,
  totalSizeFormatted: (totalBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
  branches: Object.values(branchStats),
  items: allItems
};

fs.writeFileSync(CATALOG_OUTPUT, JSON.stringify(catalogData), 'utf8');
fs.writeFileSync(STATS_OUTPUT, JSON.stringify({
  totalItems: totalFiles,
  totalSizeFormatted: (totalBytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB',
  branches: Object.values(branchStats)
}, null, 2), 'utf8');

console.log(`📁 تم حفظ الفهرس في: ${CATALOG_OUTPUT} (الحجم: ${(fs.statSync(CATALOG_OUTPUT).size / (1024 * 1024)).toFixed(2)} MB)`);
console.log(`📊 إحصاءات الفروع العشرة:`);
Object.values(branchStats).forEach(b => {
  console.log(`  - ${b.icon} ${b.name}: ${b.count} ملف (PDF: ${b.pdfCount}, Word: ${b.docCount}) - ${(b.totalBytes / (1024*1024)).toFixed(1)} MB`);
});
