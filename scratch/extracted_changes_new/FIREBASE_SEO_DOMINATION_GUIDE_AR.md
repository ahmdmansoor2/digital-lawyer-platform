# دليل تصدر محركات البحث الآمن (Zero-Regression Firebase SEO Pack) — منصة المحامي الرقمية (`mohamidigital.online`)

صُممت هذه الحزمة خصيصاً لبيئة **Google Firebase Hosting** الخاصة بموقع [منصة المحامي الرقمية](https://mohamidigital.online/) بأسلوب **إضافي خالص (100% Additive / Zero Overwrite)**؛ أي أنها **لا تحتوي على أي ملف يستبدل `blog/index.html` (الـ 402 مقال) أو `sitemap.xml` (الـ 607 روابط) أو `search-index.json` (الـ 935 صفحة)**، بل تضيف **7 صفحات أدوات وحاسبات مستقلة جديدة فقط** مع سكريبت دمج آمن يضيف روابطها إلى ملفاتك الحالية دون حذف حرف واحد.

## 1. محتويات الحزمة (9 ملفات جديدة تماماً لا تتعارض مع أي ملف في موقعك)

| اسم الملف في الحزمة | وظيفته في خطة تصدر جوجل | هل يستبدل أي ملف حالي؟ |
| :--- | :--- | :--- |
| `firebase.json` | إعدادات **Google Firebase Hosting** القياسية للسيو (`cleanUrls: false`، `trailingSlash: false`، وترويسات الكاش فائقة السرعة لرفع **Core Web Vitals** إلى 100/100) | يُوضع في جذر مشروع Firebase |
| `calculate-old-rent.html` | **حاسبة زيادات الإيجار القديم وتاريخ الإخلاء 2026** (القانون 10 لسنة 2022 + حكم الدستورية العليا نوفمبر 2024) | **لا** (ملف جديد تماماً) |
| `calculate-building-reconciliation.html` | **حاسبة رسوم التصالح في مخالفات البناء 2026 وتقسيطها** (القانون 187 لسنة 2023 + خصم الـ 25%) | **لا** (ملف جديد تماماً) |
| `calculate-court-fees.html` | **حاسبة الرسوم القضائية النسبية والثابتة والكفالات 2026** (قانون الرسوم القضائية 90 لسنة 1944) | **لا** (ملف جديد تماماً) |
| `calculate-prescription-periods.html` | **حاسبة مدد التقادم المسقط والمكسب وانقضاء الدعوى الجنائية** (مدني، شيكات، جنح، جنايات) | **لا** (ملف جديد تماماً) |
| `calculate-attorney-fees.html` | **حاسبة أتعاب المحاماة الاسترشادية ومصروفات الدعوى** (المادة 82 من قانون المحاماة 17 لسنة 1983) | **لا** (ملف جديد تماماً) |
| `calculate-traffic-compensation.html` | **حاسبة تعويضات حوادث السيارات والإصابات والدية الشرعية** (قانون التأمين الموحد 155 لسنة 2024) | **لا** (ملف جديد تماماً) |
| `legal-glossary.html` | **المعجم القانوني والقضائي التفاعلي** بالثيم الأصلي للموقع مع هيكلة `DefinedTermSet Schema` | **لا** (ملف جديد تماماً) |
| `seo_safe_injector.py` | سكريبت بايثون آمن يقرأ ملفك الحي `sitemap.xml` (607 روابط) ويضيف إليه الروابط الـ 7 الجديدة ليصبح **614 رابطاً**، ويقرأ `search-index.json` (935 صفحة) ليصبح **942 صفحة**، ويربط مقالات المدونة الـ 402 بالحاسبات | **لا يمسح أي رابط أو مقال** |

## 2. خطوات التطبيق الآمن على جهازك (في 3 دقائق)

1. **نسخ صفحات الأدوات الـ 7 الجديدة:**
   انسخ ملفات الـ HTML السبعة الجديدة (`calculate-old-rent.html`، `calculate-building-reconciliation.html`، `calculate-court-fees.html`، `calculate-prescription-periods.html`، `calculate-attorney-fees.html`، `calculate-traffic-compensation.html`، `legal-glossary.html`) وضعها داخل مجلد النشر في مشروعك (مثل `public/` أو `dist/`).
2. **تشغيل سكريبت الإلحاق الآمن (`seo_safe_injector.py`):**
   افتح الطرفية (`Terminal` أو `Command Prompt`) داخل مجلد المشروع وشغّل الأمر:
   ```bash
   python seo_safe_injector.py ./public
   ```
   سيطبع لك السكريبت تأكيداً بالإبقاء على كافة روابط `sitemap.xml` الـ 607 وإضافة الـ 7 روابط الجديدة فقط (الإجمالي 614 رابطاً)، وتحديث `search-index.json`، وحقن صناديق الربط الداخلي العنقودي (`Topic Clusters`) داخل مقالات المدونة الـ 402.
3. **النشر إلى Firebase Hosting:**
   ```bash
   firebase deploy --only hosting
   ```
4. **طلب فهرسة الصفحات الـ 7 الجديدة في Google Search Console:**
   افتح أداة **فحص عنوان URL (URL Inspection)** في Google Search Console، واطلب فهرسة الروابط السبعة الجديدة، وأعد إرسال `https://mohamidigital.online/sitemap.xml`.
