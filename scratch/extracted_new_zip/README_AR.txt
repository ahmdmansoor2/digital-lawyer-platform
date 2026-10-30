================================================================================
دليل تطبيق الإصلاحات الجذرية لموقع منصة المحامي الرقمية (mohamidigital.online)
================================================================================

محتويات حزمة الإصلاح (mohami_seo_fixes_v2.zip):
------------------------------------------------
1. .htaccess
   - إصلاح خطأ التحويل القاتل (إضافة $1 في نهاية RewriteRule) حتى لا يتم تحويل الصفحات الفرعية إلى الصفحة الرئيسية.
   - إلغاء قاعدة (RewriteRule . /index.html) التي كانت تسبب أخطاء Soft 404 وخطأ "صفحة بديلة تتضمن علامة أساسية مناسبة"، واستبدالها بـ ErrorDocument 404 /404.html.
   - إضافة تحويلات 301 للمقالات المكررة (30 مقالاً مكرراً في قسم المدونة) لمنع تآكل الكلمات المفتاحية (Keyword Cannibalization).
   - إضافة ترويسة X-Robots-Tag: noindex, follow لملفات .xml وصفحتي 404.html و search.html لمنع محاولة جوجل فهرسة ملف news-sitemap.xml كصفحة ويب.

2. index.html
   - إخراج المحتوى التعريفي والروابط الداخلية والأقسام والأسئلة الشائعة من وسم <noscript> وإظهارها بشكل مرئي مباشر في كود الـ HTML الأساسي (#public-landing-portal).
   - إخفاء شاشة تسجيل الدخول الخاصة بنظام إدارة المكتب (#root) لغير المسجلين حتى ينقر المحامي على زر "دخول نظام إدارة المكتب"، مما يقضي نهائياً على مشكلة حائط تسجيل الدخول (Login Wall) أمام Googlebot وزاحف Google AdSense.
   - دمج وتصحيح بيانات Schema.org JSON-LD وإصلاح مسار البحث (/search.html?q=...) ورابط الشعار (/logo.svg).

3. sitemap.xml
   - تنقيح خريطة الموقع لتضم 387 رابطاً قانونياً أساسياً فقط بعد إزالة صفحات النظام غير القابلة للفهرسة (404.html، __/auth/action.html، googlec03a96f2162c19b9.html، search.html، sitemap.html) وإزالة المقالات المكررة وصفحات الترندات غير القانونية.

4. robots.txt
   - السماح الكامل لزواحف Googlebot وMediapartners-Google (AdSense) مع حظر مسارات النظام (/__/، /404.html، /search.html، /data/forms-chunks/) والإشارة إلى sitemap.xml فقط.

5. sw.js
   - تحديث الـ Service Worker إلى الإصدار mohami-v5-seo وإلغاء إسقاط طلبات الصفحات الفاشلة على الصفحة الرئيسية '/'.

6. fix_all_static_pages.py
   - سكربت بايثون لتنظيف كافة صفحات الـ HTML الفرعية في الموقع دفعة واحدة من كود التحويل (location.replace) وإصلاح الأخطاء البرمجية في وسوم الميتا (<title> و <meta name="description"> و <meta property="og:title">).

خطوات الرفع والتطبيق:
----------------------
1. ارفع الملفات (.htaccess, index.html, robots.txt, sitemap.xml, sw.js) إلى مجلد public_html في استضافة Hostinger (مع استبدال الملفات القديمة).
2. احذف ملف news-sitemap.xml من مجلد public_html ومن قسم Sitemaps في Google Search Console (لأنه يحتوي على مقالات قديمة بتواريخ ثابتة وهو ما يخالف سياسة Google News Sitemaps التي تشترط أخبار آخر 48 ساعة فقط).
3. قم بتشغيل السكربت fix_all_static_pages.py على مجلد ملفات الموقع لتنظيف كافة الصفحات الفرعية ثم ارفع الصفحات المحدثة.
4. في Google Search Console:
   - انتقل إلى "خرائط الموقع" (Sitemaps) وأعد إرسال: https://mohamidigital.online/sitemap.xml
   - انتقل إلى "فحص عنوان URL" (URL Inspection) وافحص https://mohamidigital.online/ ثم اضغط "طلب الفهرسة" (Request Indexing).
   - انتقل إلى قسم "الصفحات" (Pages) واضغط "التحقق من الإصلاح" (Validate Fix) لمشاكل:
     * "صفحة تتضمن إعادة توجيه" (Page with redirect)
     * "صفحة بديلة تتضمن علامة أساسية مناسبة" (Alternate page with proper canonical tag)
     * "تم الزحف إلى الصفحة - لم تتم فهرستها حاليًا" (Crawled - currently not indexed)
