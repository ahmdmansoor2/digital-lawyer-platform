# إعداد Google Search Console — خطوة بخطوة

## الخطوة 1: افتح Google Search Console
https://search.google.com/search-console/

## الخطوة 2: إضافة الموقع
- اضغط **"إضافة خاصية"** (Add Property)
- اختار **"بادئة عنوان URL"** (URL prefix)
- اكتب: `https://mohamidigital.online/`
- اضغط **متابعة**

## الخطوة 3: التحقق من الملكية

هتظهر 5 طرق تحقق. **الأسهل والأسرع:** ملف HTML.

### طريقة ملف HTML
1. اختار **"ملف HTML"** من القائمة
2. اضغط على **اسم الملف** المُعطى (مثل: `google1234abcd.html`)
3. Google هينزّله على جهازك
4. **ابعتهولي** — هضيفه للموقع فوراً وأنشره
5. ارجع لـ GSC واضغط **"تحقق"**

أو لو عايز تضيفه بنفسك:
- انسخ الملف في `D:\قانوني 7\public\`
- شغّل:
  ```powershell
  npm run build
  npx firebase deploy --only hosting
  ```
- ارجع لـ GSC → **"تحقق"**

## الخطوة 4: إضافة Sitemap
- من القائمة الجانبية: **"Sitemaps"**
- في خانة "Add a new sitemap":
  - اكتب: `https://mohamidigital.online/sitemap.xml`
- اضغط **"إرسال"**

## الخطوة 5: طلب فهرسة الصفحة الرئيسية
- من القائمة: **"URL Inspection"** (أو "فحص عنوان URL")
- اكتب: `https://mohamidigital.online/`
- اضغط **"طلب الفهرسة"** (Request Indexing)
- كرر لأهم 5-10 صفحات (الـ pillars + أفضل المقالات)

## الخطوة 6: انتظر
- **24-48 ساعة:** Google يبدأ بزيارة الموقع
- **3-7 أيام:** الصفحات تظهر في Google Search Console
- **1-4 أسابيع:** الترتيب يتحسن

## أوامر مساعدة

### إضافة ملف التحقق تلقائياً
```powershell
node scripts/seo/gsc-verify.cjs google1234abcd.html
```

### نشر التحديثات
```powershell
npm run build
npx firebase deploy --only hosting
```

### التحقق من Sitemap
```powershell
# Google يقبل sitemap في: https://mohamidigital.online/sitemap.xml
```

## 📊 كيف تعرف إنك ناجح؟

بعد 3-7 أيام، في Google Search Console:
- **Pages → Indexed** = عدد الصفحات المفهرسة
- **Performance → Search Results** = عدد النقرات والظهور
- **Experience → Core Web Vitals** = أداء الموقع

## ⚠️ مشاكل شائعة

### "لم نتمكن من التحقق"
- تأكد إن الملف موجود على `https://mohamidigital.online/googleXXXX.html`
- اعمل hard refresh (Ctrl+Shift+R)
- استنى 5-10 دقايق بعد الـ deploy

### "Sitemap لا يمكن قراءته"
- تأكد إن Sitemap موجود: `https://mohamidigital.online/sitemap.xml`
- تحقق من صحة XML فيه (مش فيه syntax errors)

### "الصفحة غير مفهرسة"
- في URL Inspection → اضغط "طلب الفهرسة"
- استنى 1-2 أسبوع
