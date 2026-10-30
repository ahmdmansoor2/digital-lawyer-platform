const fs = require('fs');

const siPath = 'public/search-index.json';
const data = JSON.parse(fs.readFileSync(siPath, 'utf8'));

const newCalculators = [
  {
    id: '/calculate-old-rent.html',
    url: 'https://mohamidigital.online/calculate-old-rent.html',
    title: 'حاسبة زيادات الإيجار القديم وتاريخ الإخلاء القانوني 2026',
    description: 'احسب فوراً قيمة الزيادة السنوية الـ 15% في الإيجار القديم للأشخاص الاعتبارية وتاريخ الإخلاء الوجوبي في مارس 2027 وفق القانون 10 لسنة 2022 وأحكام المحكمة الدستورية العليا.',
    type: 'calculator',
    category: 'الحاسبات القانونية',
    keywords: 'حاسبة الإيجار القديم, القانون 10 لسنة 2022, زيادة الإيجار القديم 15%, إخلاء الإيجار القديم 2027, حكم الدستورية العليا الإيجار القديم',
    image: 'https://mohamidigital.online/og-image.jpg',
    snippet: 'حاسبة القيمة الإيجارية والزيادة السنوية للإيجار القديم وفق القانون 10 لسنة 2022 وأحكام المحكمة الدستورية العليا الصادرة في نوفمبر 2024.',
    wordCount: 1200,
    dateModified: new Date().toISOString()
  },
  {
    id: '/calculate-building-reconciliation.html',
    url: 'https://mohamidigital.online/calculate-building-reconciliation.html',
    title: 'حاسبة رسوم التصالح في مخالفات البناء 2026 وتقسيطها',
    description: 'احسب فوراً رسوم فحص وجدية التصالح ومقابل تقنين أوضاع مخالفات البناء وفق القانون الجديد رقم 187 لسنة 2023 ولائحته التنفيذية مع خصم الـ 25% للسداد الفوري.',
    type: 'calculator',
    category: 'الحاسبات القانونية',
    keywords: 'حاسبة التصالح في مخالفات البناء 2026, قانون التصالح الجديد 187 لسنة 2023, جدية التصالح 25%, تقسيط رسوم التصالح',
    image: 'https://mohamidigital.online/og-image.jpg',
    snippet: 'احسب رسوم فحص وجدية التصالح في مخالفات البناء وفق القانون رقم 187 لسنة 2023 مع إمكانية التقسيط حتى 5 سنوات أو خصم 25%.',
    wordCount: 1100,
    dateModified: new Date().toISOString()
  },
  {
    id: '/calculate-court-fees.html',
    url: 'https://mohamidigital.online/calculate-court-fees.html',
    title: 'حاسبة الرسوم القضائية النسبية والثابتة والكفالات 2026',
    description: 'احسب الرسوم القضائية النسبية ورسوم صندوق أبنية المحاكم ودمغة المحاماة والكفالات وفق قانون الرسوم القضائية رقم 90 لسنة 1944 وتعديلاته.',
    type: 'calculator',
    category: 'الحاسبات القانونية',
    keywords: 'حاسبة الرسوم القضائية, قانون الرسوم القضائية 90 لسنة 1944, حساب الرسم النسبي للدعوى, دمغة المحاماة 2026',
    image: 'https://mohamidigital.online/og-image.jpg',
    snippet: 'حساب الرسوم القضائية والدمغات النسبية والخدمات وصندوق الأبنية ومصروفات رفع الدعاوي أمام المحاكم الابتدائية والجزئية والاستئناف.',
    wordCount: 950,
    dateModified: new Date().toISOString()
  },
  {
    id: '/calculate-prescription-periods.html',
    url: 'https://mohamidigital.online/calculate-prescription-periods.html',
    title: 'حاسبة مدد التقادم المسقط والمكسب وسقوط الحق في القانون المصري 2026',
    description: 'احسب فوراً تاريخ سقوط الحق أو انقضاء الدعوى بالتقادم (التقادم الطويل 15 سنة، الخمسي 5 سنوات، الحولي، الجنائي، الشيكات) وفق القانون المدني والإجراءات الجنائية.',
    type: 'calculator',
    category: 'الحاسبات القانونية',
    keywords: 'حاسبة التقادم في القانون المصري, التقادم المسقط 15 سنة, التقادم الخمسي, انقضاء الدعوى الجنائية بمضي المدة',
    image: 'https://mohamidigital.online/og-image.jpg',
    snippet: 'احسب التاريخ الدقيق لاكتمال التقادم المدني أو التجاري وسقوط الحق بمضي المدة وانقضاء الدعاوى الجنائية وسقوط العقوبات.',
    wordCount: 1050,
    dateModified: new Date().toISOString()
  },
  {
    id: '/calculate-attorney-fees.html',
    url: 'https://mohamidigital.online/calculate-attorney-fees.html',
    title: 'حاسبة أتعاب المحاماة الاسترشادية ومصروفات الدعوى 2026',
    description: 'احسب أتعاب المحاماة الاسترشادية (مقدم ومؤخر الأتعاب) وفق المادة 82 من قانون المحاماة المصري رقم 17 لسنة 1983 مع تحرير عقد الأتعاب.',
    type: 'calculator',
    category: 'الحاسبات القانونية',
    keywords: 'حاسبة أتعاب المحاماة, نسبة أتعاب المحامي في مصر, المادة 82 قانون المحاماة, عقد اتفاق أتعاب محاماة',
    image: 'https://mohamidigital.online/og-image.jpg',
    snippet: 'تقدير أتعاب المحاماة الاسترشادية وصياغة بنود عقد الاتفاق على الأتعاب والمصروفات وفقاً لأحكام قانون المحاماة رقم 17 لسنة 1983.',
    wordCount: 980,
    dateModified: new Date().toISOString()
  },
  {
    id: '/calculate-traffic-compensation.html',
    url: 'https://mohamidigital.online/calculate-traffic-compensation.html',
    title: 'حاسبة تعويضات حوادث السيارات والإصابات والدية الشرعية 2026',
    description: 'احسب قيمة مبلغ التأمين الإجباري والتعويض التكميلي عن الوفاة أو العجز في حوادث السيارات وفق قانون التأمين الموحد الجديد رقم 155 لسنة 2024.',
    type: 'calculator',
    category: 'الحاسبات القانونية',
    keywords: 'حاسبة تعويضات حوادث السيارات, قانون التأمين الموحد 155 لسنة 2024, تعويض الوفاة في حوادث الطرق 100 ألف جنيه',
    image: 'https://mohamidigital.online/og-image.jpg',
    snippet: 'احسب مبالغ التأمين الإجباري والتعويض المادي والأدبي عن حوادث الطرق وفق قانون التأمين الموحد 155 لسنة 2024.',
    wordCount: 1150,
    dateModified: new Date().toISOString()
  }
];

const existingIds = new Set(data.items.map(it => it.id));
let added = 0;

newCalculators.forEach(calc => {
  if (!existingIds.has(calc.id)) {
    data.items.push(calc);
    added++;
  }
});

data.count = data.items.length;
let totalWords = 0;
data.items.forEach(it => totalWords += (it.wordCount || 0));
data.totalWords = totalWords;
data.generatedAt = new Date().toISOString();

fs.writeFileSync(siPath, JSON.stringify(data, null, 2), 'utf8');
console.log('✅ Added ' + added + ' calculators to search-index.json. Total items now:', data.count);
