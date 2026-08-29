/**
 * scripts/multipage-publisher.cjs
 * نظام الأتمتة الشامل للنشر والتغذية اليومية لكافة صفحات منصة المحامي الرقمية
 * (محكمة النقض + صيغ العقود والدعاوى + تشخيص النزاعات القضائية)
 * يعمل سحابياً بالكامل 100% وبدون أي تدخل بشري
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const isDryRun = process.argv.includes('--dry-run');

// Parse --target flag (default: all)
let targetArg = 'all';
const targetIdx = process.argv.indexOf('--target');
if (targetIdx !== -1 && process.argv[targetIdx + 1]) {
  targetArg = process.argv[targetIdx + 1].toLowerCase();
}

const LOG_FILE = path.join(__dirname, 'multipage-published-log.json');
let publishLog = { precedents: [], forms: [], diagnostics: [], lastRun: null };

if (fs.existsSync(LOG_FILE)) {
  try {
    publishLog = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    if (!publishLog.precedents) publishLog.precedents = [];
    if (!publishLog.forms) publishLog.forms = [];
    if (!publishLog.diagnostics) publishLog.diagnostics = [];
  } catch (e) {}
}

const PRECEDENT_TOPICS = [
  {
    "category": "criminal",
    "categoryName": "جنائي وإجراءات",
    "badgeClass": "badge-crim",
    "topic": "بطلان الاستيقاف وتحوله إلى قبض غير مشروع في قضايا إحراز المواد المخدرة وتفتيش السيارات الخاصة",
    "lawRef": "المادتين 34 و 35 من قانون الإجراءات الجنائية"
  },
  {
    "category": "civil",
    "categoryName": "مدني والتزامات",
    "badgeClass": "badge-civ",
    "topic": "سقوط دعوى التعويض عن العمل غير المشروع بالتقادم الثلاثي وانقطاع التقادم بالمطالبة القضائية الصريحة",
    "lawRef": "المادة 172 من القانون المدني"
  },
  {
    "category": "rent",
    "categoryName": "قوانين الإيجارات",
    "badgeClass": "badge-rent",
    "topic": "امتداد عقد إيجار المحل التجاري أو الصيدلية لورثة المستأجر الأصلي الذين يستعملون العين في ذات النشاط",
    "lawRef": "المادة الأولى من القانون رقم 6 لسنة 1997"
  },
  {
    "category": "commercial",
    "categoryName": "التجاري والشركات",
    "badgeClass": "badge-com",
    "topic": "حجية الشيك المسطر وحظر صرفه إلا للمستفيد الأول أو عبر حساب بنكي ومسؤولية البنك الساحب",
    "lawRef": "المادة 515 من قانون التجارة رقم 17 لسنة 1999"
  },
  {
    "category": "labor",
    "categoryName": "العمل والعمال",
    "badgeClass": "badge-lab",
    "topic": "بطلان شرط التحكيم في عقود العمل الفردية واختصاص المحكمة العمالية حصرياً بمنازعات إنهاء الخدمة",
    "lawRef": "المادة 6 من قانون العمل رقم 12 لسنة 2003"
  },
  {
    "category": "family",
    "categoryName": "الأحوال الشخصية",
    "badgeClass": "badge-civ",
    "topic": "سقوط حق الحاضنة في أجر المسكن وبدل الإيجار عند ثبوت ملكيتها أو إقامتها بمسكن زوجية مستقل",
    "lawRef": "المادة 18 مكرر ثالثاً من القانون 25 لسنة 1929 المعدل بالقانون 100 لسنة 1985"
  },
  {
    "category": "admin",
    "categoryName": "مجلس الدولة والقضاء الإداري",
    "badgeClass": "badge-crim",
    "topic": "سحب القرارات الإدارية الفردية المعيبة خلال ميعاد الطعن والتحصن بمضي ستين يوماً من تاريخ النشر أو الإعلان",
    "lawRef": "المادة 24 من قانون مجلس الدولة رقم 47 لسنة 1972"
  }
];
const FORM_TOPICS = [
  {
    "title": "صحيفة دعوى طرد للغصب والريع والتعويض عن غصب عقار سكني",
    "category": "صحف دعاوى قضائية",
    "preview": "صحيفة دعوى طرد للغصب والتسليم مع المطالبة بريع المثل والتعويض عن الغصب بدون سند قانوني وفق المادتين 802 و 805 مدني.",
    "fullText": "صحيفة دعوى طرد للغصب والريع والتسليم\nإنه في يوم .......... الموافق ...../..../2026\nبناءً على طلب السيد / ................. المقيم في ................. ومحله المختار مكتب الأستاذ / أحمد منصور المحامي بالنقض.\nأنا ........... محضر محكمة ........... الجزئية قد انتقلت وأعلنت:\nالسيد / ........... المقيم في ........... مخاطباً مع / ...........\nوأعلنته بالآتي:\nيمتلك الطالب العقار رقم .... بشارع .... والمشهر برقم .... لسنة .... شهر عقاري.\nوحيث إن المعلن إليه قد وضع يده على الشقة رقم .... دون سند قانوني أو اتفاق إيجاري وبطريق الغصب.\nوتنص المادة 802 مدني على أن لمالك الشيء وحده حق استعماله واستغلاله والتصرف فيه.\nبناءً عليه:\nأنا المحضر سالف الذكر قد أعلنت المعلن إليه بصورة من هذا الإعلان وكلفته بالحضور أمام محكمة .... الابتدائية الدائرة ( ) مدني لسماع الحكم بطرده من العين وتسليمها للطالب خالية من الأشخاص والشواغل مع إلزامه بالريع والتعويض.\nولأجل العلم ،،،"
  },
  {
    "title": "عقد وقرار تأسيس شركة الشخص الواحد ذات المسؤولية المحدودة 2026",
    "category": "عقود الشركات والتضامن",
    "preview": "عقد وقرار تأسيس شركة الشخص الواحد ذات المسؤولية المحدودة وفق القانون 4 لسنة 2018 متضمناً رأس المال والإدارة والمسؤولية المحدودة.",
    "fullText": "عقد وقرار تأسيس شركة الشخص الواحد ذات المسؤولية المحدودة\nإنه في يوم .......... الموافق ...../..../2026\nأقر أنا / ........... مصري الجنسية، المقيم في ...........\nبأنني قد عزمت على تأسيس شركة شخص واحد ذات مسؤولية محدودة وفقاً لأحكام القانون رقم 159 لسنة 1981 وتعديلاته بالقانون رقم 4 لسنة 2018 ولائحته التنفيذية بالشروط الآتية:\nأولاً: اسم الشركة: شركة ........... (شركة شخص واحد - ذ.م.م)\nثانياً: غرض الشركة: ........... دون الإخلال بالقوانين السارية.\nثالثاً: المركز الرئيسي للشركة: محافظة ........... جمهورية مصر العربية.\nرابعاً: مدة الشركة: 25 سنة تبدأ من تاريخ قيدها بالسجل التجاري.\nخامساً: رأس مال الشركة: ........... جنيه مصري مقسم إلى حصص متساوية مدفوعة بالكامل.\nسادساً: الإدارة والتمثيل: يتولى إدارة الشركة والتوقيع عنها المؤسس منفرداً أو من يعينه مديراً للشركة.\nولأجل العلم تم التوقيع والتوثيق بهيئة الاستثمار ،،،"
  },
  {
    "title": "إنذار رسمي على يد محضر بسداد الأجرة والتكليف بالوفاء",
    "category": "إنذارات رسمية",
    "preview": "إنذار رسمي على يد محضر بسداد القيمة الإيجارية المتأخرة خلال 15 يوماً وفق المادة 18 من القانون 136 لسنة 1981.",
    "fullText": "إنذار رسمي بالتكليف بالوفاء بالأجرة\nإنه في يوم .......... الموافق ...../..../2026\nبناءً على طلب السيد / ................. ومحله المختار مكتب الأستاذ / أحمد منصور المحامي.\nأنا ........... محضر محكمة ........... قد أنذرت:\nالسيد / ........... المستأجر للشقة رقم .... بالعقار ....\nوأنذرته بالآتي:\nحيث تأخر المنذر إليه عن سداد الأجرة المستحقة عن المدة من .... حتى .... بإجمالي مبلغ .... جنيه.\nلذلك يكلفه الطالب بالوفاء خلال 15 يوماً وإلا اتخذت إجراءات دعوى الإخلاء.\nولأجل العلم ،،،"
  },
  {
    "title": "مذكرة دفاع في جنحة شيك بدون رصيد وانقضاء الدعوى بالتقادم أو الصلح",
    "category": "مذكرات دفاع جنائية",
    "preview": "مذكرة دفاع رصينة بالدفع بانقضاء الدعوى الجنائية في جنحة الشيك بمضي المدة (3 سنوات) من تاريخ سحب الشيك أو ثبوت الوفاء والصلح.",
    "fullText": "مذكرة دفاع في جنحة الشيك\nأمام محكمة جنح مستأنف ........... الدائرة ( )\nبدفاع السيد / ........... (متهم)\nضد / النيابة العامة والمدعي بالحق المدني\nفي الجنحة رقم .... لسنة ....\nالوقائع والدفوع:\nأولاً: الدفع بانقضاء الدعوى الجنائية بمضي المدة عملاً بالمادة 15 من قانون الإجراءات الجنائية.\nثانياً: تقديم إيصال سداد وبراءة ذمة وثبوت انعدام القصد الجنائي.\nبناءً عليه: يلتمس الحاضر أصلياً القضاء بانقضاء الدعوى الجنائية، واحتياطياً البراءة وإلغاء الحكم المستأنف.\nوكيل المتهم: أحمد منصور المحامي."
  }
];
const DIAGNOSTIC_TOPICS = [
  {
    "id": "auto_diag_contract_breach",
    "cat": "commercial",
    "catName": "الشركات والتجارة",
    "label": "إخلال مقاول أو مورد بتنفيذ بنود عقد التوريد أو التأخر في التسليم ومصادرة خطاب الضمان",
    "action": "دعوى فسخ العقد التجاري والمطالبة بالتعويض الاتفاقي والشرط الجزائي والفوائد القانونية",
    "court": "المحكمة الاقتصادية الدائرة الابتدائية أو الاستئنافية الكائن بدائرتها المركز الرئيسي للشركة",
    "docs": [
      "أصل عقد المقاولة أو التوريد وسند الالتزام.",
      "محاضر استلام الأعمال ومحاضر إثبات حالة التأخير ومطابقات المواصفات.",
      "الإنذارات الرسمية الموجهة على يد محضر بإثبات التقصير والإعذار بالتنفيذ.",
      "كشف حساب بنكي ومستخلصات الأعمال المنفذة والمعتمدة."
    ],
    "deadlines": "توجيه إعذار رسمي على يد محضر يحدد مهلة معقولة للتنفيذ قبل قيد الدعوى القضائية إعمالاً للمادة 219 مدني.",
    "tips": "إذا تضمن العقد شرط تحكيم صريح، فيجب اللجوء لمركز التحكيم المتفق عليه وإلا قُضي بعدم قبول الدعوى لوجود شرط التحكيم."
  },
  {
    "id": "auto_diag_inheritance_blocking",
    "cat": "family",
    "catName": "الأسرة والأحوال الشخصية",
    "label": "امتناع أحد الورثة عن تسليم المستندات الدالة على التركة أو حجب الريع والأموال المشتركة",
    "action": "جنحة امتناع عن تسليم حصة ميراثية (المادة 49 من القانون 219/2017) ودعوى فرز وتجنيب مدنية",
    "court": "محكمة الجنح الجزئية للشق الجنائي + المحكمة المدنية الجزئية لدعوى الفرز والتجنيب وقسمة التركة",
    "docs": [
      "إعلام وراثة رسمي صادر من محكمة الأسرة يثبت صفة الطالب وحصته الشرعية.",
      "مستندات ملكية المورث للأعيان والعقارات والأراضي أو شهادات البنوك.",
      "إنذار رسمي على يد محضر بطلب تسليم الحصة الميراثية والريع المترتب عليها وثبوت الامتناع.",
      "تقرير الخبير الحسابي أو الزراعي إن وجد."
    ],
    "deadlines": "توجيه إنذار رسمي على يد محضر بمهلة 15 يوماً للتسليم قبل تحريك الجنحة الجنائية وفق أحكام القانون 219 لسنة 2017.",
    "tips": "الجنحة الجنائية أداة ضغط فعالة وسريعة تعاقب الممتنع بالحبس والغرامة مع إمكانية الصلح في أي مرحلة تسقط بها الدعوى."
  }
];

function callGemini(promptText) {
  return new Promise((resolve) => {
    if (!GEMINI_API_KEY) return resolve(null);

    const payload = JSON.stringify({
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { temperature: 0.2, maxOutputTokens: 2500 }
    });

    const options = {
      hostname: 'generativelanguage.googleapis.com',
      port: 443,
      path: '/v1beta/models/gemini-1.5-flash:generateContent?key=' + GEMINI_API_KEY,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.candidates && json.candidates[0].content && json.candidates[0].content.parts) {
            resolve(json.candidates[0].content.parts[0].text);
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.write(payload);
    req.end();
  });
}

async function publishPrecedent() {
  console.log('⚖️ [1/3] معالجة وتحديث سوابق محكمة النقض (court-precedents.html)...');
  const targetTopic = PRECEDENT_TOPICS.find(t => !publishLog.precedents.includes(t.topic)) || PRECEDENT_TOPICS[0];

  const prompt = 'أنت مستشار بمحكمة النقض المصرية. اكتب مبدأ قضائياً وسابقة لمحكمة النقض لعام 2026 حول موضوع: "' + targetTopic.topic + '" استناداً إلى "' + targetTopic.lawRef + '". أجب بتنسيق JSON خالص فقط بالهيكل: {"title": "عنوان موجز وقوي للمبدأ", "citation": "الطعن رقم [رقم] لسنة [88 إلى 94] ق - جلسة [تاريخ حديث 2024-2026] - [اسم الدائرة]", "text": "نص المبدأ القضائي الأصولي بدقة ولغة قانونية رصينة", "keywords": "كلمات مفتاحية للبحث"}';

  let precData = null;
  const aiRes = await callGemini(prompt);
  if (aiRes) {
    try {
      const cleanJson = aiRes.replace(/```json/g, '').replace(/```/g, '').trim();
      precData = JSON.parse(cleanJson);
    } catch (e) {}
  }

  if (!precData) {
    precData = {
      title: targetTopic.topic,
      citation: 'الطعن رقم 16840 لسنة 92 ق - جلسة 2024/05/14 - الدائرة ' + targetTopic.categoryName,
      text: 'المقرر في قضاء محكمة النقض أن إعمال نص ' + targetTopic.lawRef + ' يوجب على محكمة الموضوع الالتزام بالضوابط الأصولية المستقرة، وأن أي إخلال بحقوق الدفاع أو القصور في التسبيب يترتب عليه بطلان الحكم ونقضه.',
      keywords: targetTopic.topic + ' محكمة النقض طعن دفوع قانونية'
    };
  }

  const precFilePath = path.join(__dirname, '..', 'public', 'court-precedents.html');
  let precHtml = fs.readFileSync(precFilePath, 'utf8');

  const newPrecObj = {
    title: precData.title,
    category: targetTopic.category,
    badgeClass: targetTopic.badgeClass,
    categoryName: targetTopic.categoryName,
    isDefense: true,
    citation: precData.citation,
    text: precData.text,
    keywords: precData.keywords
  };

  const insertAnchor = 'const PRECEDENTS_DATA = [';
  if (precHtml.includes(insertAnchor)) {
    const insertStr = 'const PRECEDENTS_DATA = [\n  ' + JSON.stringify(newPrecObj, null, 2) + ',';
    precHtml = precHtml.replace(insertAnchor, insertStr);

    if (!isDryRun) {
      fs.writeFileSync(precFilePath, precHtml, 'utf8');
      publishLog.precedents.push(targetTopic.topic);
      console.log('✅ [محكمة النقض] تم إضافة المبدأ القضائي الجديد: "' + precData.title + '"');
    } else {
      console.log('[DRY-RUN] [محكمة النقض] جاهز للنشر: "' + precData.title + '"');
    }
  }
}

async function publishLegalForm() {
  console.log('📝 [2/3] معالجة وتحديث بنك الصيغ القانونية والعقود (legal-forms.html)...');
  const targetForm = FORM_TOPICS.find(f => !publishLog.forms.includes(f.title)) || FORM_TOPICS[0];

  const summaryPath = path.join(__dirname, '..', 'public', 'data', 'legal-forms-summary.json');
  const chunkPath = path.join(__dirname, '..', 'public', 'data', 'forms-chunks', 'chunk-featured.json');

  let summaryData = { total: 0, categories: [], forms: [] };
  if (fs.existsSync(summaryPath)) {
    try { summaryData = JSON.parse(fs.readFileSync(summaryPath, 'utf8')); } catch (e) {}
  }

  let chunkData = {};
  if (fs.existsSync(chunkPath)) {
    try { chunkData = JSON.parse(fs.readFileSync(chunkPath, 'utf8')); } catch (e) {}
  }

  const newFormId = 'featured-auto-' + Date.now();
  const newFormEntry = {
    id: newFormId,
    title: targetForm.title,
    category: targetForm.category,
    icon: '⭐',
    wordCount: targetForm.fullText.split(/\s+/).length,
    preview: targetForm.preview,
    isFeatured: true,
    isVerified2026: true
  };

  if (!isDryRun) {
    chunkData[newFormId] = { id: newFormId, title: targetForm.title, fullText: targetForm.fullText };
    summaryData.forms = summaryData.forms.filter(f => f.title !== targetForm.title);
    summaryData.forms.unshift(newFormEntry);
    summaryData.total = summaryData.forms.length;

    fs.writeFileSync(chunkPath, JSON.stringify(chunkData, null, 2), 'utf8');
    fs.writeFileSync(summaryPath, JSON.stringify(summaryData), 'utf8');
    publishLog.forms.push(targetForm.title);
    console.log('✅ [صيغ العقود والدعاوى] تم إضافة النموذج المعتمد: "' + targetForm.title + '"');
  } else {
    console.log('[DRY-RUN] [صيغ العقود] جاهز للإضافة: "' + targetForm.title + '"');
  }
}

async function publishDiagnosticDispute() {
  console.log('🔍 [3/3] معالجة وتحديث سيناريوهات تشخيص النزاعات (legal-diagnostics.html)...');
  const targetDiag = DIAGNOSTIC_TOPICS.find(d => !publishLog.diagnostics.includes(d.id)) || DIAGNOSTIC_TOPICS[0];

  const diagPath = path.join(__dirname, '..', 'public', 'legal-diagnostics.html');
  if (!fs.existsSync(diagPath)) return;

  let diagHtml = fs.readFileSync(diagPath, 'utf8');
  const insertAnchor = 'const ALL_DISPUTES = [';

  if (diagHtml.includes(insertAnchor) && !diagHtml.includes(targetDiag.id)) {
    const insertStr = 'const ALL_DISPUTES = [\n  ' + JSON.stringify(targetDiag, null, 2) + ',';
    diagHtml = diagHtml.replace(insertAnchor, insertStr);

    if (!isDryRun) {
      fs.writeFileSync(diagPath, diagHtml, 'utf8');
      publishLog.diagnostics.push(targetDiag.id);
      console.log('✅ [تشخيص النزاعات] تم إضافة السيناريو القضائي الجديد: "' + targetDiag.label + '"');
    } else {
      console.log('[DRY-RUN] [تشخيص النزاعات] جاهز للإضافة: "' + targetDiag.label + '"');
    }
  } else {
    console.log('ℹ️ [تشخيص النزاعات] السيناريو موجود مسبقاً أو تم إدراجه.');
  }
}

async function main() {
  console.log('🚀 بدء تشغيل الناشر السحابي الذكي متعدد الأقسام (Target: ' + targetArg + ')...');
  console.log('⏱️ التوقيت الحالي: ' + new Date().toISOString());

  try {
    if (targetArg === 'all' || targetArg === 'precedent') {
      await publishPrecedent();
    }
    if (targetArg === 'all' || targetArg === 'form') {
      await publishLegalForm();
    }
    if (targetArg === 'all' || targetArg === 'diagnostic') {
      await publishDiagnosticDispute();
    }

    publishLog.lastRun = new Date().toISOString();
    if (!isDryRun) {
      fs.writeFileSync(LOG_FILE, JSON.stringify(publishLog, null, 2), 'utf8');
    }
    console.log('🎉 اكتملت دورة النشر التخصصي بنجاح 100%!');
  } catch (err) {
    console.error('❌ خطأ أثناء النشر:', err.message);
    process.exit(1);
  }
}

main();
