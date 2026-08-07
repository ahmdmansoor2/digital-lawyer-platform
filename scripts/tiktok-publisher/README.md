# TikTok Auto-Publisher — منصة المحامي الرقمية

نظام توليد ونشر فيديوهات توعية قانونية على TikTok بشكل أوتوماتيكي.

## المعمارية (Pipeline)

```
ترندات جوجل (trending-topics.json) + مقالات المدونة (published-log.json) + topics.json
   ↓  (وضع المزامنة الافتراضي — Round-robin: ترند ثم مقال)
[1] Gemini يولّد سكريبت 60-90 ثانية (5-8 مشاهد)
   ↓
[2] Edge TTS يحوّل السكريبت لصوت عربي (Microsoft، مجاني)
   ↓
[3] صورة لكل مشهد: Pexels → Pollinations.ai → Gemini Imagen → SVG (بدل Imagen المحجوب)
   ↓
[4] ffmpeg يركّب: صور + صوت + كابشن عربي + براندينج
   ↓
[5] TikTok Content Posting API
```

## الإعداد (مرة واحدة)

### 1) حساب TikTok for Developers

1. روح على https://developers.tiktok.com/apps/
2. اعمل App جديد
3. اختار **Content Posting API**
4. في الـ Scopes فعّل: `user.info.basic`, `video.upload`, `video.publish`
5. في **Redirect URI** ضيف:
   - `http://localhost:8787/oauth/callback` (للتطوير)
   - `https://mohamidigital.online/tiktok-oauth-callback.html` (للإنتاج — هنضيفه بعدين)
6. انسخ **Client Key** و **Client Secret** في `.env`

### 2) متغيرات البيئة

عدّل `D:\قانوني 7\.env`:

```bash
GEMINI_API_KEY=...                  # موجود بالفعل
TIKTOK_CLIENT_KEY=...               # من البورتال
TIKTOK_CLIENT_SECRET=...            # من البورتال
TIKTOK_REDIRECT_URI=http://localhost:8787/oauth/callback
EDGE_TTS_VOICE=ar-EG-ShakirNeural   # جرّب أصوات تانية من القائمة
```

### 3) تثبيت الـ dependencies

```powershell
cd D:\قانوني 7
npm install --no-audit --no-fund ffmpeg-static node-edge-tts
```

### 4) ربط حساب TikTok (مرة واحدة)

```powershell
cd D:\قانوني 7\scripts\tiktok-publisher
node oauth-handler.cjs login
```

هيفتح المتصفح، وافق على الصلاحيات، ارجع للترمنال.

## الاستخدام اليومي

### توليد فيديو تجريبي (بدون نشر حقيقي)

```powershell
node tiktok-publish.cjs --dry-run --topic demo-001
```

هتلاقي المخرجات في:
- `output/audio/tts-demo-001.mp3` — الصوت
- `output/images/demo-001/scene-01.png` .. `scene-08.png` — الصور
- `output/videos/demo-001.mp4` — الفيديو النهائي

### نشر حقيقي

```powershell
node tiktok-publish.cjs --topic demo-001
```

### نشر كل المواضيع الجديدة (3 مثلاً)

```powershell
node tiktok-publish.cjs --count 3
```

### الوضع الافتراضي: مزامنة من النظام المتوازي 🆕

من غير أي فلاج، السكربت يجمع المواضيع من:

1. **ترندات جوجل** — `scripts/trending-topics.json` (يولّده `smart-publisher.cjs` يومياً من Google Trends RSS `geo=EG`)
2. **أحدث مقالات المدونة** — `scripts/blog-publisher/published-log.json` (اللي لم يتحوّل لفيديو بعد)
3. **مواضيع `topics.json` اليدوية**

بتداخل Round-robin (ترند ثم مقال ثم ترند...) وبحذف المكرر من `tiktok-published-log.json`.

```powershell
node tiktok-publish.cjs          # مواضيع مركّبة (ترندات + مدونة + manual)
node tiktok-publish.cjs --count 2
node tiktok-publish.cjs --sync   # تصريح بنفس الوضع
```

## جدولة يومية

### خيار A: GitHub Actions (الموصى به — cloud)

Workflow جاهز: `.github/workflows/daily-tiktok.yml` — فيديو واحد يومياً 9:00 م بتوقيت القاهرة.

**المرة الأولى:**
1. محلياً: `node scripts/tiktok-publisher/oauth-handler.cjs login` → يخزّن `tiktok-tokens.json`
2. رفّع في **GitHub Secrets**: `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET`, `TIKTOK_ACCESS_TOKEN`, `TIKTOK_REFRESH_TOKEN`, `TIKTOK_OPEN_ID`, `TIKTOK_EXPIRES_IN`, `TIKTOK_REFRESH_EXPIRES_IN`, `GEMINI_API_KEY`
3. الشغل بيتم تلقائياً. الـ workflow:
   - يبني `tiktok-tokens.json` من الـ secrets لو مش موجود
   - يجدد الـ access token أوتوماتيك
   - **يدوّر refresh_token ويلتزمه** (يرفع الملف بعد كل تشغيل — مفيش حاجة لـ PAT)
   - يثبّت خطوط Noto العربية للكابشن

> ⚠️ لو اتعطل الـ refresh، اعمل `git pull` وابعت `tiktok-tokens.json` المحدث (أو شغّل `login` من جديد).

### خيار B: Windows Task Scheduler

شغّل `scripts/blog-publisher/install-task.ps1` أو اعمل Task جديد:

- **Program:** `node.exe`
- **Arguments:** `D:\قانوني 7\scripts\tiktok-publisher\tiktok-publish.cjs --count 1`
- **Trigger:** يومياً 8:00 مساءً
- **Working dir:** `D:\قانوني 7\scripts\tiktok-publisher`

### خيار B: cron (لو WSL)

```bash
0 20 * * * cd /mnt/d/قانوني\ 7 && node scripts/tiktok-publisher/tiktok-publish.cjs --count 1 >> /tmp/tiktok.log 2>&1
```

## بنية المجلدات

```
scripts/tiktok-publisher/
├── tiktok-publish.cjs        # السكربت الرئيسي
├── oauth-handler.cjs         # OAuth + تخزين التوكنز
├── tts-generator.cjs         # Edge TTS
├── scene-generator.cjs       # Gemini سكريبت + صور
├── video-composer.cjs        # ffmpeg تركيب
├── topics.json               # قائمة المواضيع
├── tiktok-tokens.json        # (يُنشأ تلقائياً — حساس)
├── tiktok-published-log.json # سجل النشر
├── output/
│   ├── audio/                # ملفات TTS
│   ├── images/<topic-id>/    # صور المشاهد
│   └── videos/<topic-id>.mp4 # الفيديوهات النهائية
├── drafts/                   # (مستقبلي) مسودات
├── runs/                     # (مستقبلي) سجل التشغيل
└── README.md
```

## حدود TikTok اللي لازم تعرفها

- **حجم الفيديو:** ≤ 287 MB
- **المدة:** 60 ثانية أمثل (حتى 10 دقائق)
- **النوع:** MP4 / H.264 / AAC
- **الأبعاد:** 9:16 (1080x1920) — ده اللي بنولّده
- **Rate limits:** ~5-10 فيديوهات/يوم للحساب الشخصي، أكثر للحسابات الموثّقة
- **TikTok App approval:** ممكن ياخد 1-2 أسبوع. لو رفضوه، الـ scope `video.publish` مش هيشتغل

## استكشاف الأخطاء

### `ffmpeg مش موجود`

```powershell
npm install ffmpeg-static
```

### `edge-tts فشل`

- تأكد من اتصالك بالإنترنت
- جرّب صوت تاني: `ar-EG-SalmaNeural`، `ar-SA-HamedNeural`

### `TikTok init فشل: spam_risk_too_many_pending_share`

- يعني في فيديوهات في الـ queue. استنى شوية أو قلل عدد المنشورات اليومية

### `TikTok scope_video_publish denied`

- الـ App لسه ما اتوافقش. روح developers.tiktok.com وتابع حالة المراجعة

## ملاحظات

- **الستايل:** Hybrid (صور AI + عناوين) — قابل للتعديل في `scene-generator.cjs`
- **الجدولة الافتراضية:** 1 يومياً (GitHub Actions) — عدّل cron في `.github/workflows/daily-tiktok.yml`
- **مزامنة كاملة مع النشر الذكي:** مواضيع TikTok تُؤخذ من ترندات جوجل + مقالات المدونة تلقائياً

## المرجعيات

- TikTok Content Posting API: https://developers.tiktok.com/doc/tiktok-api-v2-video-upload
- Edge TTS voices: https://learn.microsoft.com/azure/ai-services/speech-service/language-support
- ffmpeg docs: https://ffmpeg.org/documentation.html
