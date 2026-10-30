# التقرير الجنائي العميق لأسباب توقف أرشفة موقع منصة المحامي الرقمية (`mohamidigital.online`) وحزمة الإنقاذ الجذري الشامل (`v12`)

بعد إجراء فحص جنائي عميق لكود الموقع الفعلي، وحزمة الجافاسكربت الرئيسية (`index-DRT7DlW7.js`)، وملف `sw.js`، وخرائط الموقع (`sitemap.xml` و`news-sitemap.xml`)، وسجلات التغطية الفعلية في [تقرير تغطية فهرسة Google Search Console](https://docs.google.com/spreadsheets/d/1H4m9Fvf6fPE1wY25m_TBvz9vKbN6bcVvrBvo_pXFl9Q/edit?usp=drivesdk&ouid=114376150451857670813)، وإشعارات [فشل التحقق من إصلاح التحويل في Search Console](https://mail.google.com/mail/?authuser=ahmdmansoor2@gmail.com#all/thread-f:1875622043030228938) و[إشعارات الصفحة البديلة ذات العلامة الأساسية](https://mail.google.com/mail/?authuser=ahmdmansoor2@gmail.com#all/thread-f:1874244612700545366)، تبيّن وجود **8 أسباب تقنية قاتلة داخل ملفات الموقع الحالية** تمنع زاحف جوجل (`Googlebot`) من فهرسة الصفحات أو إظهارها في نتائج البحث.

> **لماذا لم تعالج الحزمتان السابقتان (`v10` و`v11`) هذه المشكلة في صفحاتك الـ 607 القديمة؟**
> لأننا التزمنا في `v10` و`v11` بعدم لمس ملفاتك القديمة (إضافة 12 أداة جديدة فقط)، وبالتالي بقيت الأخطاء البرمجية القاتلة (مثل انهيار الجافاسكربت في `<head>`، وكود `location.replace`، وخطأ `sw.js`، والروابط المسممة في `sitemap.xml`) موجودة داخل صفحاتك الـ 607 الحية!
> لذلك صممنا في هذا **الإصدار الثاني عشر (`v12`)** محرك الإصلاح الجراحي الموضعي **`mohami_deep_indexing_doctor.py`** الذي يصلح صفحاتك الحية الـ 607 **في مكانها على جهازك (`In-Place Repair`) دون أن يحذف أو يستبدل أي مقال من مقالاتك الـ 402!**

## 1. الأسباب الـ 8 الحقيقية لتوقف أرشفة الموقع وكيف تم علاجها جذرياً في `v12`

| # | السبب الجذري المكتشف بالفحص الجنائي | الدليل التقني من ملفات الموقع وسجلات Search Console | كيف يعالجه محرك الإنقاذ `mohami_deep_indexing_doctor.py` في `v12`؟ |
| :--- | :--- | :--- | :--- |
| **1** | **جدار تسجيل الدخول الإجباري في حزمة React (`index-DRT7DlW7.js`) على الصفحة الرئيسية** | عند زيارة `Googlebot` للصفحة الرئيسية `/`، يقوم محرك الرندر في جوجل (WRS) بتشغيل `index-DRT7DlW7.js` الذي يبحث عن جلسة دخول في `Firebase Auth`، فيرسم شاشة تسجيل دخول مغلقة (`FirebaseLoginScreen`)، بينما المحتوى النصي في [index.html الأصلي](https://drive.google.com/file/d/16wepqQ_n6Q_OsN-Yj7F7gJ3gIDiDPE5Q/view?usp=drivesdk) مخفي داخل `<noscript style="display:none">` | تم تحويل تحميل حزمة React في `index.html` إلى **التحميل الكسول عند الطلب فقط (`On-Demand Lazy Loading`)**؛ فلا يتم تحميل `index-*.js` إطلاقاً عند دخول `Googlebot` أو الزائر العادي، بل يشتغل فقط عندما يضغط المحامي على زر «💼 فتح نظام إدارة المكتب السحابي» |
| **2** | **انهيار الجافاسكربت (`Uncaught TypeError`) في `<head>` وفي جسم 36+ صفحة ومئات المقالات** | تحوّل المعامل المنطقي `||` بالخطأ إلى `|` أحادية في عشرات الملفات مثل [cheque-return-egypt.html](https://drive.google.com/file/d/1danp6iY_IZK0-vZHPOVibwKc9q8CjdBW/view?usp=drivesdk) و[دليل المحامين](https://drive.google.com/file/d/1mEwHNCLh1bh8MqOE50oJ_vxDbYrlPvPg/view?usp=drivesdk) و[الحاسبات](https://drive.google.com/file/d/1B_0INfv3L3pp3bBwznrDx3nLwgunenTy/view?usp=drivesdk): الكود `(self.SWG_BASIC = self.SWG_BASIC \| []).push` يتحول إلى `(0).push` فينهار فوراً في `<head>`، والكود `(l.specialties \| [])` و`NOTARY_DATA \| []` يمنع رسم محتوى الصفحات فتظهر فارغة أمام Googlebot | يمر `mohami_deep_indexing_doctor.py` على كافة ملفات `.html` الحية في مشروعك ويصلح كل `\|` برمجية تالفة إلى `\|\|` في مكانها (`In-Place`) دون المساس بالنصوص العربية |
| **3** | **انكسار ترويسة `<head>` قبل وسم `canonical` بسبب حقن `<a href>` داخل `<meta description>`** | في مقالات المدونة (مثل [cheque-return-egypt.html](https://drive.google.com/file/d/1danp6iY_IZK0-vZHPOVibwKc9q8CjdBW/view?usp=drivesdk)) تم حقن `<a href="/blog/...">` داخل خاصية `content` لوسم `meta description` مع علامتي تنصيص مكررتين `""` في `og:title`، مما يكسر تحليل `<head>` في Googlebot قبل الوصول لوسم `canonical` | يقوم السكريبت بتطهير جميع وسوم `<meta>` داخل `<head>` من أي وسوم `<a>` خام وإصلاح علامات التنصيص المكررة `""` في جميع الـ 402 مقال |
| **4** | **كود التحويل بالجافاسكربت في أول سطر من `<head>` (`location.replace`)** | أول سطر في `<head>` في جميع الصفحات يحتوي على `if(location.hostname==="www.mohamidigital.online")location.replace(...)` وهو ما أدى لفشل التحقق من مشكلة **«صفحة تتضمن إعادة توجيه»** في [إشعار Search Console رقم WNC-10031170](https://mail.google.com/mail/?authuser=ahmdmansoor2@gmail.com#all/thread-f:1875622043030228938) | يزيل السكريبت هذا السطر من كافة ملفات `.html` الحية ويعتمد على التوجيه النظيف من السيرفر |
| **5** | **خطأ `sw.js` الذي يعيد الصفحة الرئيسية `'/'` كبديل لأي صفحة فرعية** | في [ملف sw.js الأصلي](https://drive.google.com/file/d/1FOrGwToeLN_kZK9RcVoHqvNsuPnLRSEb/view?usp=drivesdk) السطر 79: `e.respondWith(networkFirst(req, '/'))` يعيد محتوى الرئيسية (مع الكانونيكال الخاص بالرئيسية `/`) عند أي بطء في الشبكة، مما تسبب في مشكلة **«صفحة بديلة تتضمن علامة أساسية مناسبة»** (`WNC-10030260`) | تم استبدال `sw.js` بنسخة `mohami-v12-seo` تستثني زواحف البحث تماماً ولا تعيد `'/'` أبداً كبديل لأي صفحة فرعية |
| **6** | **تسمم `sitemap.xml` بـ 76 صفحة ترندات غير قانونية (`/radar-topics/`) وصفحات نظام (`404.html` و`__/auth/action.html`)** | يحتوي [ملف sitemap.xml](https://drive.google.com/file/d/15sN_8aOq8otVH0zhTk8SQOCq5C0idVA6/view?usp=drivesdk) على `/__/auth/action.html` و`/404.html` و76 صفحة في `/radar-topics/` عن الطقس وحجوزات بوكينج وهانتر بايدن، مما أضعف التخصص القانوني للموقع (`Topical Authority`) وأدخل 34+ صفحة في فلتر **«تم الزحف إلى الصفحة - لم تتم فهرستها حاليًا»** | يقرأ السكريبت ملف `sitemap.xml` الحي لديك، **ويحافظ على 100% من مقالاتك القانونية الـ 402 ومحاكمك الـ 116 وأدواتك**، ويحذف منه فقط روابط النظام والترندات غير القانونية، كما يضيف ترويسة `X-Robots-Tag: noindex` على `/radar-topics/**` في `firebase.json` |
| **7** | **ملف `news-sitemap.xml` المخالف لمعايير Google News (177 مقالاً قديماً بنفس الثانية)** | ملف `news-sitemap.xml` المعلن في `robots.txt` يضم 177 مقالاً كلها مؤرخة بـ `2026-09-03T16:00:04.520Z`، بينما يشترط جوجل ألا تزيد أخبار `news-sitemap.xml` عن 48 ساعة، فرفضه جوجل وظهر كصفحة معطلة في [تقرير التغطية](https://docs.google.com/spreadsheets/d/1H4m9Fvf6fPE1wY25m_TBvz9vKbN6bcVvrBvo_pXFl9Q/edit?usp=drivesdk&ouid=114376150451857670813) | تم تحديث `robots.txt` لإزالة الإشارة إلى `news-sitemap.xml` المخالف والاكتفاء بـ `sitemap.xml` القياسي النظيف |
| **8** | **عزلة المقالات الـ 402 والمحاكم الـ 116 في عمق الموقع (`Crawl Depth > 4`) وغياب الدفع الفوري `IndexNow`** | زاحف Googlebot لا يجد روابط مباشرة من الصفحة الرئيسية إلى مئات المقالات الفرعية وصفحات المحاكم | يقوم السكريبت بتوليد صفحة **«الفهرس القانوني الشامل للمنصة» (`html-sitemap-hub.html`)** من ملفاتك الحية وربطها مباشرة بالصفحة الرئيسية ليصبح كل مقال على بُعد **نقرة واحدة فقط (`Crawl Depth = 1`)**، مع توفير سكريبت `instant_indexnow_pusher.py` لدفع جميع الروابط فوراً عبر **IndexNow API** |

## 2. خطوات التنفيذ الشاملة على جهازك (في 3 دقائق فقط)

1. **فك ضغط الحزمة (`mohami_firebase_seo_domination_pack.zip`) داخل مجلد مشروعك:**
   انسخ ملفات الحزمة إلى مجلد النشر الحي على جهازك (مثل `public/` أو `dist/`)، وضع `firebase.json` في جذر المشروع.

2. **تشغيل المحرك الجراحي الشامل (`mohami_deep_indexing_doctor.py`):**
   افتح الطرفية (`Terminal` أو `Command Prompt`) وشغّل الأمر:
   ```bash
   python mohami_deep_indexing_doctor.py ./public
   ```
   سيقوم المحرك في ثوانٍ بـ:
   - إصلاح جميع أخطاء الجافاسكربت (`|`) وترويسات `<head>` في جميع صفحاتك ومقالاتك الـ 402 في مكانها (`In-Place`) دون حذف أي مقال.
   - توليد صفحة `html-sitemap-hub.html` شاملةً روابط كافة مقالاتك الـ 402 ومحاكمك الـ 116 وأدواتك الـ 18.
   - تطهير `sitemap.xml` الحي وحفظ نسخة احتياطية منه في `sitemap.backup.xml`.
   - ترقية الصفحة الرئيسية `index.html` بالتحميل الكسول لتطبيق React وحفظ نسخة احتياطية في `index.backup.html`.

3. **نشر التحديث إلى Firebase Hosting:**
   ```bash
   firebase deploy --only hosting
   ```

4. **تشغيل دافع الفهرسة الفوري (`instant_indexnow_pusher.py`):**
   ```bash
   python instant_indexnow_pusher.py ./public
   ```
   ثم افتح **Google Search Console**، وأعد إرسال `https://mohamidigital.online/sitemap.xml`، واطلب فهرسة الرابطين المحوريين:
   - `https://mohamidigital.online/`
   - `https://mohamidigital.online/html-sitemap-hub.html` (الذي سيرشد زاحف Googlebot فوراً إلى كافة صفحات ومقالات الموقع بنقرة واحدة).
