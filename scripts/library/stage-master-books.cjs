#!/usr/bin/env node
/**
 * stage-master-books.cjs — تجهيز ونشر أمهات الكتب والموسوعات الكبرى على الموقع
 * 
 * ينسخ أمهات كتب الفقه والقضاء الكبرى (السنهوري، مليجي، المرصفاوي، عبيد، النقض)
 * إلى public/books/ بأسماء موحدة مع توليد روابط التصفح والتحميل المباشر للزوار.
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_LIB = 'D:\\المكتبة القانونية';
const PUBLIC_BOOKS_DIR = path.join(__dirname, '..', '..', 'public', 'books');

fs.mkdirSync(PUBLIC_BOOKS_DIR, { recursive: true });

console.log('🚀 بدء تجهيز ونشر أمهات الكتب والموسوعات القانونية الكبرى...');

// قائمة أمهات الكتب والموسوعات المختارة للنشر المباشر
const MASTER_BOOKS = [
  // موسوعة الوسيط للسنهوري (القانون المدني)
  {
    src: path.join(ROOT_LIB, 'الفلاشة 4', 'قانون مدني', 'السنهوري قانون مدني', '1_ الجزء الأول \' مصادر الإلتزام \' .pdf'),
    destName: 'sanhouri-waseet-vol-1-sources-of-obligation.pdf',
    title: 'موسوعة الوسيط في شرح القانون المدني — الجزء الأول (مصادر الالتزام)',
    author: 'د. عبد الرزاق السنهوري',
    branchId: 'civil'
  },
  {
    src: path.join(ROOT_LIB, 'الفلاشة 4', 'قانون مدني', 'السنهوري قانون مدني', '2_ الجزء الثاني \' الإثبات و أثار الإلتزام \' .pdf'),
    destName: 'sanhouri-waseet-vol-2-evidence-and-effects.pdf',
    title: 'موسوعة الوسيط في شرح القانون المدني — الجزء الثاني (الإثبات وآثار الالتزام)',
    author: 'د. عبد الرزاق السنهوري',
    branchId: 'civil'
  },
  {
    src: path.join(ROOT_LIB, 'الفلاشة 4', 'قانون مدني', 'السنهوري قانون مدني', '3_الجزء الثالث  الأوصاف  الحوالة  الإنقضاء \' .pdf'),
    destName: 'sanhouri-waseet-vol-3-assignment-and-extinction.pdf',
    title: 'موسوعة الوسيط في شرح القانون المدني — الجزء الثالث (الأوصاف والحوالة والانقضاء)',
    author: 'د. عبد الرزاق السنهوري',
    branchId: 'civil'
  },
  {
    src: path.join(ROOT_LIB, 'الفلاشة 4', 'قانون مدني', 'السنهوري قانون مدني', '4_الجزء الرابع عقود الملكية  البيع لمقايضة\'  .pdf'),
    destName: 'sanhouri-waseet-vol-4-sale-and-barter-contracts.pdf',
    title: 'موسوعة الوسيط في شرح القانون المدني — الجزء الرابع (عقود الملكية: البيع والمقايضة)',
    author: 'د. عبد الرزاق السنهوري',
    branchId: 'civil'
  },
  {
    src: path.join(ROOT_LIB, 'الفلاشة 4', 'قانون مدني', 'السنهوري قانون مدني', '5_ الجزء الخامس \' باقي العقود \' .pdf'),
    destName: 'sanhouri-waseet-vol-5-remaining-contracts.pdf',
    title: 'موسوعة الوسيط في شرح القانون المدني — الجزء الخامس (عقود الهبة والشركة والقرض والصلح)',
    author: 'د. عبد الرزاق السنهوري',
    branchId: 'civil'
  },
  {
    src: path.join(ROOT_LIB, 'الفلاشة 4', 'قانون مدني', 'السنهوري قانون مدني', '6_ الجزء السادس (1) العارية والايجار .pdf'),
    destName: 'sanhouri-waseet-vol-6-1-lease-and-loan-for-use.pdf',
    title: 'موسوعة الوسيط في شرح القانون المدني — الجزء السادس / 1 (الإيجار والعارية)',
    author: 'د. عبد الرزاق السنهوري',
    branchId: 'civil'
  },
  {
    src: path.join(ROOT_LIB, 'الفلاشة 4', 'قانون مدني', 'السنهوري قانون مدني', '8_ الجزء الثامن \' حق الملكية \' .pdf'),
    destName: 'sanhouri-waseet-vol-8-ownership-rights.pdf',
    title: 'موسوعة الوسيط في شرح القانون المدني — الجزء الثامن (حق الملكية)',
    author: 'د. عبد الرزاق السنهوري',
    branchId: 'civil'
  },
  {
    src: path.join(ROOT_LIB, 'الفلاشة 4', 'قانون مدني', 'السنهوري قانون مدني', '10_ الجزء العاشر \' تأمينات عينية و شخصية \' .pdf'),
    destName: 'sanhouri-waseet-vol-10-collaterals-and-guarantees.pdf',
    title: 'موسوعة الوسيط في شرح القانون المدني — الجزء العاشر (التأمينات العينية والشخصية)',
    author: 'د. عبد الرزاق السنهوري',
    branchId: 'civil'
  },

  // الفقه الجنائي (المرصفاوي ورؤوف عبيد ومأمون سلامة)
  {
    src: path.join(ROOT_LIB, 'الفلاشة 3', 'اجراءات جنائية', 'إجراءات جنائية. رؤوف عبيد.pdf'),
    destName: 'raouf-obeid-criminal-procedures.pdf',
    title: 'مبادئ الإجراءات الجنائية في القانون المصري',
    author: 'د. رؤوف عبيد',
    branchId: 'criminal'
  },
  {
    src: path.join(ROOT_LIB, 'الفلاشة 3', 'اجراءات جنائية', 'المرصفاوي', 'مرصفاوي اصول قانون الاجراءات الجنائية 1.pdf'),
    destName: 'marsafawi-criminal-procedures-vol-1.pdf',
    title: 'أصول قانون الإجراءات الجنائية — الجزء الأول',
    author: 'د. حسن صادق المرصفاوي',
    branchId: 'criminal'
  },

  // المرافعات والتنفيذ الجبري والقضاء المستعجل (أحمد مليجي والدناصوري وراتب)
  {
    src: path.join(ROOT_LIB, 'الفلاشة 5', 'المستعجل والتنفيذ', 'التنفيذ الجبري', 'موسوعة احمد مليجي', 'التنفيذ احمد مليجي 02.pdf'),
    destName: 'meleigy-forced-execution-vol-2.pdf',
    title: 'الموسوعة الشاملة في التنفيذ الجبري — الجزء الثاني',
    author: 'د. أحمد مليجي',
    branchId: 'procedures'
  },
  {
    src: path.join(ROOT_LIB, 'الفلاشة 5', 'المستعجل والتنفيذ', 'الامور المستعجلة', 'قضاء الامور المستعجلة على راتب.pdf'),
    destName: 'ali-rateb-summary-judiciary.pdf',
    title: 'قضاء الأمور المستعجلة في القانون المصري',
    author: 'د. علي راتب',
    branchId: 'procedures'
  },

  // مبادئ وأحكام محكمة النقض
  {
    src: path.join(ROOT_LIB, 'الفلاشة 1', 'احكام , فتاوي , تشريعات', 'المستحدث من المبادئ', 'المستحدث من المبادئ الصادرة عن الدوائر الايجارات', 'المستحدث من المبادئ الصادرة من دوائر الإيجارات بمحكمة النقض 2013-2014.pdf'),
    destName: 'cassation-leases-principles-2013-2014.pdf',
    title: 'المستحدث من مبادئ دوائر الإيجارات بمحكمة النقض',
    author: 'محكمة النقض المصرية',
    branchId: 'precedents'
  },
  {
    src: path.join(ROOT_LIB, 'الفلاشة 1', 'احكام , فتاوي , تشريعات', 'المستحدث من المبادئ', 'المستحدث من المبادئ الصادرة عن الدوائر الجنائية', 'المستحدث من المبادئ الصادرة من الدوائر الجنائية 2011 - 2012.pdf'),
    destName: 'cassation-criminal-principles-2011-2012.pdf',
    title: 'المستحدث من مبادئ الدوائر الجنائية بمحكمة النقض',
    author: 'محكمة النقض المصرية',
    branchId: 'precedents'
  }
];

let copiedCount = 0;
let totalBytes = 0;

MASTER_BOOKS.forEach(b => {
  if (fs.existsSync(b.src)) {
    const dest = path.join(PUBLIC_BOOKS_DIR, b.destName);
    fs.copyFileSync(b.src, dest);
    const sz = fs.statSync(dest).size;
    copiedCount++;
    totalBytes += sz;
    console.log(`✅ تم تجهيز ونشر: ${b.title} (${(sz / (1024*1024)).toFixed(1)} MB) → /books/${b.destName}`);
  } else {
    console.warn(`⚠️ لم يتم العثور على الملف: ${b.src}`);
  }
});

console.log(`\n🎉 تم نشر ${copiedCount} كتاباً وموسوعة كبرى بإجمالي ${(totalBytes / (1024*1024)).toFixed(1)} MB في public/books/ جاهزة للتحميل والقراءة المباشرة.`);
