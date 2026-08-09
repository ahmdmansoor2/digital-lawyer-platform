# Facebook Reels Auto-Publisher — منصة المحامي الرقمية

نظام توليد ونشر Reels قصيرة (60-90 ثانية) على Facebook من مقالات المدونة أوتوماتيكياً.

## المعمارية (Pipeline)

```
مقال المدونة (HTML) أو topics.json
   ↓
[1] Gemini يولّد سكريبت 60-90 ثانية (Hook + مشاهد + CTA)
   ↓
[2] Edge TTS يحوّل السكريبت لصوت عربي + word timings
   ↓
[3] Pexels يوفّر صور stock احترافية (portrait)
   ↓
[4] ffmpeg يركّب: صور + صوت + كابشن عربي متحرك + براندينج
   ↓
[5] Facebook Graph API → ينشر على الصفحة كـ Reel
```

**نقطة مهمة:** يعيد استخدام `scene-generator` و `tts-generator` و `video-composer` من `tiktok-publisher/`. الفرق بس في OAuth + API call.

## الإعداد (مرة واحدة)

### 1) تطبيق Facebook

1. روح على https://developers.facebook.com/apps/
2. اعمل App جديد (نوع: Business)
3. فعّل **Facebook Login for Business** + **Graph API**
4. في **App Settings → Basic**: انسخ **App ID** و **App Secret**
5. في **Facebook Login → Settings → Valid OAuth Redirect URIs** ضيف:
   - `http://localhost:8788/oauth/callback`

### 2) Page المطلوبة

- لازم تكون Admin لصفحة Facebook هتنشر عليها
- الـ Page ID موجود في: Page → About → Page ID

### 3) متغيرات البيئة

عدّل `D:\قانوني 7\.env`:

```bash
FB_APP_ID=...                # من الخطوة 1
FB_APP_SECRET=...            # من الخطوة 1
FB_REDIRECT_URI=http://localhost:8788/oauth/callback
FB_OAUTH_PORT=8788
FB_PAGE_ID=...               # من الخطوة 2
REELS_AUTO=1                 # لتفعيل النشر التلقائي بعد المدونة
```

### 4) ربط حساب Facebook (مرة واحدة)

```powershell
cd D:\قانوني 7\scripts\facebook-reels
node facebook-oauth.cjs login
```

هيفتح المتصفح. سجّل دخولك، وافق على الصلاحيات. هيرجع لقائمة الصفحات اللي تديرها.

### 5) تحقق

```powershell
node facebook-oauth.cjs status
```

لازم يعرض الـ Page ID والاسم.

## الاستخدام

### توليد Reel تجريبي (بدون نشر)

```powershell
node reels-publish.cjs --dry-run --article legal-practice-tips
```

### نشر حقيقي

```powershell
node reels-publish.cjs --article legal-practice-tips
```

### من آخر مقال في المدونة

```powershell
node reels-publish.cjs --latest-article
```

## الجدولة الدورية

### خيار A: Windows Task Scheduler (الموصى به)

```powershell
# كـ Admin
cd D:\قانوني 7\scripts\facebook-reels
powershell -ExecutionPolicy Bypass -File install-task.ps1
```

ده بيعمل Task اسمه `FacebookReelsPublisher` يشتغل يومياً 10:00 صباحاً.

لتغيير التوقيت:
```powershell
powershell -ExecutionPolicy Bypass -File install-task.ps1 -Time "20:00"
```

للإلغاء:
```powershell
Unregister-ScheduledTask -TaskName "FacebookReelsPublisher" -Confirm:$false
```

### خيار B: مع daily-publish (Triggered)

في `.env`:
```bash
REELS_AUTO=1
```

كده كل ما `daily-publish.cjs` ينشر مقال جديد، الـ Reel يتولد أوتوماتيك (DRY-RUN) — تراجعه، ولو تمام تشغّل `--dry-run=false` يدوياً.

أو تضيف خطوة نشر حقيقي بعد كل مدونة:
```javascript
// في daily-publish.cjs (السطر ~988)
execSync(`node scripts/facebook-reels/reels-publish.cjs --article ${lastSlug}`, { ... })
// (احذف --dry-run للنشر الفعلي)
```

## بنية المجلدات

```
scripts/facebook-reels/
├── reels-publish.cjs        # السكربت الرئيسي
├── facebook-oauth.cjs       # OAuth + Page token
├── facebook-tokens.json     # (يُنشأ تلقائياً — حساس)
├── facebook-reels-log.json  # سجل النشر
├── install-task.ps1         # Task Scheduler installer
├── output/
│   ├── audio/
│   ├── images/<topic-id>/
│   └── videos/<topic-id>.mp4
└── README.md
```

## الحدود والقيود

- **مدة Reel:** حتى 90 ثانية أمثل (حتى 3 دقائق في Facebook)
- **حجم الفيديو:** حتى 1 GB
- **النوع:** MP4 / H.264 / AAC
- **Rate limits:** Graph API عنده حدود — 200 طلب/ساعة للحساب، أقل للنشر
- **فحص Facebook:** بعد النشر بياخد 1-3 أيام للمراجعة

## Troubleshooting

### `OAuth error: invalid redirect_uri`

- تأكد إن `FB_REDIRECT_URI` في `.env` مطابق للـ URI المسجّل في Facebook App Settings
- لازم يكون `http://localhost:8788/oauth/callback` بالظبط (https في الإنتاج)

### `FB_PAGE_ID مش في التوكنز`

- شغّل `node facebook-oauth.cjs login` تاني
- تأكد إنك Admin للصفحة
- جرّب FB_PAGE_ID تاني من Page Settings

### `Facebook API فشل: permissions error`

- الـ App لازم يكون Live (ليس Development)
- أو ضيف الـ Test User في App Roles

### الفيديو طلع قصير (30 ثانية بدل 60+)

- ده كان bug في إصدار سابق (إصلاح)
- تأكد إنك محدث بآخر `video-composer.cjs`

## المرجعيات

- Facebook Graph API: https://developers.facebook.com/docs/graph-api
- Reels API: https://developers.facebook.com/docs/video-api/guides/reels
- OAuth: https://developers.facebook.com/docs/facebook-login
