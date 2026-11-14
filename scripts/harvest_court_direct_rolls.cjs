const https = require('https');
const fs = require('fs');
const path = require('path');

function fetchPage(url, timeoutMs = 12000) {
  return new Promise((resolve) => {
    try {
      const req = https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36'
        },
        timeout: timeoutMs
      }, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      });
      req.on('error', () => resolve(''));
      req.on('timeout', () => { req.destroy(); resolve(''); });
    } catch (e) {
      resolve('');
    }
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
  } else if (/الجيزة|الهرم|العجوزة|الدقي|بولاق الدكرور|أكتوبر|اكتوبر|الوراق|إمبابة|امبابة|العياط|البدرشين|الحوامدية/i.test(title)) {
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
  } else if (/مدني|تجاري|اقتصادي|عمالي|مستعجل|ابتدائي/i.test(title)) {
    catCode = 'civil'; catName = 'مدني ومحاكم اقتصادية';
  } else {
    catCode = 'misdemeanor'; catName = 'جنح وجنح مستأنف';
  }

  return { govCode, govName, catCode, catName };
}

async function harvestAll() {
  console.log('🚀 بدء حصاد واستخلاص روابط رول الجلسات المباشرة...');
  
  // 1. Get all post links from Category 193
  const catHtml = await fetchPage('https://lawhub.info/eg/?cat=193');
  const postRegex = /href=["'](https:\/\/lawhub\.info\/eg\/\?p=(\d+))["']/g;
  const postUrls = new Set();
  let m;
  while ((m = postRegex.exec(catHtml)) !== null) {
    postUrls.add(m[1]);
  }
  
  console.log(`✅ تم اكتشاف ${postUrls.size} محكمة ونيابة في الفهرس الشامل.`);
  
  // Load existing 104 items from v20 as title fallback
  let v20Titles = {};
  try {
    const v20Html = fs.readFileSync('scratch/extracted_plan_v20/courts-session-rolls.html', 'utf8');
    const match = v20Html.match(/var\s+ROLLS_DATA\s*=\s*(\[[\s\S]*?\]);/);
    if (match) {
      const data = JSON.parse(match[1]);
      data.forEach(d => { if (d.refUrl) v20Titles[d.refUrl] = d.title; });
    }
  } catch(e) {}

  const results = [];
  const urlsArray = Array.from(postUrls);
  
  // Concurrency worker
  const CONCURRENCY = 6;
  let index = 0;
  
  async function worker() {
    while (index < urlsArray.length) {
      const myIdx = index++;
      const url = urlsArray[myIdx];
      const pageHtml = await fetchPage(url);
      
      let title = v20Titles[url] || '';
      if (!title && pageHtml) {
        const titleM = pageHtml.match(/<h1[^>]*>(.*?)<\/h1>/i) || pageHtml.match(/<title>(.*?)<\/title>/i);
        if (titleM) {
          title = titleM[1].replace(/<[^>]+>/g, '').replace(/🚫 ACCESS PERMANENTLY DENIED/g, '').trim();
        }
      }
      
      // Clean up title
      if (!title || title.length < 5) {
        title = `جلسات محكمة ونيابة — رقم ${url.split('p=')[1]}`;
      }
      // Strip redundant "باركود QR code" prefix if desired, or keep neat
      title = title.replace(/^باركود\s+QR\s*code\s*[-–:]?\s*/i, '').trim();

      // Extract direct links
      const directLinks = [];
      if (pageHtml) {
        const linkRegex = /href=["'](https?:\/\/(?:drive\.google\.com|docs\.google\.com|t\.me|telegram\.me|forms\.gle|bit\.ly)[^"'>]+)["']/gi;
        let lm;
        while ((lm = linkRegex.exec(pageHtml)) !== null) {
          const l = lm[1].trim();
          if (!l.includes('share') && !l.endsWith('/LAWHUBinfo') && !directLinks.includes(l)) {
            directLinks.push(l);
          }
        }
      }

      const { govCode, govName, catCode, catName } = classifyCourt(title);
      
      const item = {
        id: `roll-${myIdx + 1}`,
        title: title,
        govCode,
        govName,
        catCode,
        catName,
        refUrl: url,
        directUrl: directLinks.length > 0 ? directLinks[0] : '',
        allDirectUrls: directLinks
      };
      
      results.push(item);
      if ((myIdx + 1) % 20 === 0 || myIdx + 1 === urlsArray.length) {
        console.log(`[${myIdx + 1}/${urlsArray.length}] تم فحص: ${title.substring(0, 40)} -> رابط مباشر: ${item.directUrl ? '✅' : '❌'}`);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  // Sort by id / importance
  results.sort((a, b) => {
    // Put items with direct links first
    if (a.directUrl && !b.directUrl) return -1;
    if (!a.directUrl && b.directUrl) return 1;
    return 0;
  });

  const outDir = path.join(__dirname, '../public/data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const jsonOut = path.join(outDir, 'courts-session-rolls.json');
  fs.writeFileSync(jsonOut, JSON.stringify(results, null, 2), 'utf8');

  const withDirect = results.filter(r => r.directUrl);
  console.log(`\n🎉 اكتمل الحصاد بنجاح!`);
  console.log(`- إجمالي المحاكم والنيابات المفهرسة: ${results.length}`);
  console.log(`- المحاكم التي تم استخلاص روابط Google Drive والتليجرام المباشرة لها: ${withDirect.length}`);
  console.log(`- تم حفظ البيانات في: ${jsonOut}`);
}

harvestAll();
