const https = require('https');
const fs = require('fs');
const path = require('path');

function fetchPage(url) {
  return new Promise((resolve) => {
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, timeout: 12000 }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', () => resolve(''));
  });
}

function classifyCourt(title) {
  let govCode = 'cairo';
  let govName = 'القاهرة';
  let catCode = 'misdemeanor';
  let catName = 'جنح وجنح مستأنف';

  // Governorate detection
  if (/إسكندرية|اسكندرية|الدخيلة|المنتزه|المنشية|محرم بك|سيدي جابر|العامرية|برج العرب|اللبان|كرموز|الجمرك|الرمل|العطارين/i.test(title)) {
    govCode = 'alex'; govName = 'الإسكندرية';
  } else if (/الجيزة|الهرم|العجوزة|الدقي|بولاق الدكرور|أكتوبر|اكتوبر|الوراق|إمبابة|امبابة|العياط|البدرشين|الحوامدية|الصف|أطفيح/i.test(title)) {
    govCode = 'giza'; govName = 'الجيزة';
  } else if (/القليوبية|بنها|شبرا الخيمة|طوخ|قليوب|القناطر|الخانكة|شبين القناطر|كفر شكر/i.test(title)) {
    govCode = 'qalyubia'; govName = 'القليوبية';
  } else if (/البحيرة|دمنهور|كفر الدوار|إيتاي البارود|كوم حمادة|أبو المطامير|حوش عيسى|الدلنجات|رشيد|المحمودية/i.test(title)) {
    govCode = 'beheira'; govName = 'البحيرة';
  } else if (/الدقهلية|المنصورة|ميت غمر|السنبلاوين|دكرنس|بلقاس|شربين|أجا|طلخا/i.test(title)) {
    govCode = 'dakahlia'; govName = 'الدقهلية';
  } else if (/الغربية|طنطا|المحلة|زفتى|كفر الزيات|بسيون|قطور|سمنود/i.test(title)) {
    govCode = 'gharbia'; govName = 'الغربية';
  } else if (/الشرقية|الزقازيق|العاشر|بلبيس|منيا القمح|فاقوس|أبو حماد|ههيا/i.test(title)) {
    govCode = 'sharqia'; govName = 'الشرقية';
  } else if (/المنوفية|شبين الكوم|منوف|أشمون|قويسنا|تلا|بركة السبع|الشهداء/i.test(title)) {
    govCode = 'monufia'; govName = 'المنوفية';
  } else if (/كفر الشيخ|دسوق|فوه|بيلا|الحامول|مطوبس|بلطيم/i.test(title)) {
    govCode = 'kafr-elsheikh'; govName = 'كفر الشيخ';
  } else if (/دمياط|فارسكور|الزرقا|كفر سعد/i.test(title)) {
    govCode = 'damietta'; govName = 'دمياط';
  } else if (/بورسعيد|بورفؤاد/i.test(title)) {
    govCode = 'portsaid'; govName = 'بورسعيد';
  } else if (/الإسماعيلية|الاسماعيلية|التل الكبير|فايد|القنطرة/i.test(title)) {
    govCode = 'ismailia'; govName = 'الإسماعيلية';
  } else if (/السويس/i.test(title)) {
    govCode = 'suez'; govName = 'السويس';
  } else if (/الفيوم|سنورس|إطسا|طامية/i.test(title)) {
    govCode = 'fayoum'; govName = 'الفيوم';
  } else if (/بني سويف|الواسطى|ناصر|ببا|الفشن/i.test(title)) {
    govCode = 'beni-suef'; govName = 'بني سويف';
  } else if (/المنيا|ملوي|مغاغة|بني مزار|سمالوط|أبو قرقاص/i.test(title)) {
    govCode = 'minya'; govName = 'المنيا';
  } else if (/أسيوط|اسيوط|ديروط|القوصية|منفلوط|أبنوب/i.test(title)) {
    govCode = 'assiut'; govName = 'أسيوط';
  } else if (/سوهاج|طهطا|جرجا|أخميم|المراغة|البلينا/i.test(title)) {
    govCode = 'sohag'; govName = 'سوهاج';
  } else if (/قنا|نجع حمادي|قوص|دشنا|فرشوط/i.test(title)) {
    govCode = 'qena'; govName = 'قنا';
  } else if (/الأقصر|الاقصر|إسنا|أرمنت/i.test(title)) {
    govCode = 'luxor'; govName = 'الأقصر';
  } else if (/أسوان|اسوان|إدفو|كوم أمبو|نصر النوبة/i.test(title)) {
    govCode = 'aswan'; govName = 'أسوان';
  } else if (/مطروح|العلمين|الحمام|الضبعة/i.test(title)) {
    govCode = 'matrouh'; govName = 'مطروح';
  } else if (/شمال سيناء|العريش|جنوب سيناء|شرم الشيخ|الطور/i.test(title)) {
    govCode = 'sinai'; govName = 'سيناء';
  } else if (/البحر الأحمر|الغردقة|سفاجا|القصير/i.test(title)) {
    govCode = 'red-sea'; govName = 'البحر الأحمر';
  }

  // Category detection
  if (/مجلس الدولة|القضاء الإداري|المحكمة الإدارية|التأديبية/i.test(title)) {
    catCode = 'state_council'; catName = 'مجلس الدولة والقضاء الإداري';
  } else if (/أسرة|شئون الأسرة|ولاية على النفس|ولاية على المال/i.test(title)) {
    catCode = 'family'; catName = 'محاكم ونيابات الأسرة';
  } else if (/جنايات|استئناف جنايات/i.test(title)) {
    catCode = 'felony'; catName = 'الجنايات والاستئناف';
  } else if (/مدني|تجاري|اقتصادي|عمالي|مستعجل|ابتدائي|كلية/i.test(title)) {
    catCode = 'civil'; catName = 'مدني ومحاكم اقتصادية';
  } else {
    catCode = 'misdemeanor'; catName = 'جنح وجنح مستأنف';
  }

  return { govCode, govName, catCode, catName };
}

async function runEnrichment() {
  console.log('Fetching Category 193 index...');
  const html = await fetchPage('https://lawhub.info/eg/?cat=193');
  
  // Match: href="https://lawhub.info/eg/?p=18276" ... <h4>باركود QR code مدنى كلى و جزئى محكمة شرق طنطا</h4>
  const regex = /href=["']https:\/\/lawhub\.info\/eg\/\?p=(\d+)["'][\s\S]*?<h4[^>]*>([\s\S]*?)<\/h4>/gi;
  const titleMap = {};
  let m;
  while ((m = regex.exec(html)) !== null) {
    const id = m[1];
    let rawTitle = m[2].replace(/<[^>]+>/g, '').trim();
    rawTitle = rawTitle.replace(/^باركود\s+QR\s*code\s*[-–:]?\s*/i, '').trim();
    if (rawTitle) {
      titleMap[id] = rawTitle;
    }
  }

  console.log(`Found ${Object.keys(titleMap).length} exact titles from index.`);

  const jsonPath = path.join(__dirname, '../public/data/courts-session-rolls.json');
  const list = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

  let updatedCount = 0;
  list.forEach(item => {
    const id = item.refUrl.split('p=')[1];
    if (titleMap[id]) {
      item.title = titleMap[id];
      const cls = classifyCourt(item.title);
      item.govCode = cls.govCode;
      item.govName = cls.govName;
      item.catCode = cls.catCode;
      item.catName = cls.catName;
      updatedCount++;
    }
  });

  fs.writeFileSync(jsonPath, JSON.stringify(list, null, 2), 'utf8');
  console.log(`✅ تم تحديث وتصنيف ${updatedCount} محكمة ونيابة بأسماء رسمية دقيقة 100%!`);
}

runEnrichment();
