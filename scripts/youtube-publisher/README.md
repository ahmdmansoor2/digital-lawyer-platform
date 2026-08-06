# YouTube Auto-Publisher — منصة المحامي الرقمية

يرفع الفيديوهات التي يولّدها النظام (نفس خط إنتاج TikTok) على قناة YouTube عبر
**YouTube Data API v3** — برفع Resumable و OAuth2 (refresh token).

## الفكرة

- `reel-publisher.cjs` يولّد فيديو عمودي 9:16 وينشره **ريلز على فيسبوك** (5 مرات يومياً).
- في نفس الـ workflow، `youtube-publish.cjs --from-fb-log --as-video` يقرأ آخر سجل في
  `facebook-published-log.json` ويرفع نفس الفيديو على **قناة فيروز** **نشراً مزدوجاً**:
  1. كـ **Short** (9:16) — يظهر في تبويب Shorts.
  2. كـ **فيديو أفقي 16:9** (بخلفية ضبابية عبر ffmpeg) — يظهر في تبويب **Videos** بصفحة القناة.
- أو يولّد فيديو مستقل (بدون `--from-fb-log`)، أو يرفع فيديو TikTok عبر `--from-tiktok-log`.

## الإعداد (مرة واحدة)

### 1) إنشاء مشروع Google Cloud + تفعيل الـ API

1. افتح https://console.cloud.google.com/ واعمل **New Project** (مثلاً `legal-publisher`).
2. من **APIs & Services → Library** فعّل **YouTube Data API v3**.
3. من **APIs & Services → OAuth consent screen**:
   - External → اعمل App (الاسم أي شيء، الـ email = حسابك).
   - **Scopes**: ضيف scope مخصص:
     `https://www.googleapis.com/auth/youtube.upload`
   - **Test users**: ضيف بريد حساب اليوتيوب (المستخدم نفسه).
4. من **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Application type: **Web application**
   - **Authorized redirect URIs** — ضيف بالضبط:
     ```
     http://localhost:8788/oauth/callback
     ```
   - انسخ **Client ID** و **Client Secret**.

> ⚠️ الرقم 8788 يجب يطابق `YT_OAUTH_PORT` (افتراضي). لو غيّرت المنفذ، غيّر الـ redirect URI في الحالتين.
> الـ client من نوع "Web application" هو الأضمن للـ callback المحلي (جوجل تسمح بـ `http://localhost`).

### 2) متغيرات البيئة المحلية

عدّل `D:\قانوني 7\.env`:

```bash
YT_CLIENT_ID=...appss.apps.googleusercontent.com
YT_CLIENT_SECRET=...
YT_REDIRECT_URI=http://localhost:8788/oauth/callback
YT_CHANNEL_URL=https://www.youtube.com/channel/UClYcsQJiwn0TkpmeVCQy-VA
```

### 3) ربط قناة YouTube (مرة واحدة — محلياً)

```powershell
cd D:\قانوني 7\scripts\youtube-publisher
node youtube-oauth.cjs login
```

- هيفتح المتصفح → سجّل بحساب اليوتيوب → وافق على صلاحية الرفع.
- لو ظهر تحذير "Google hasn't verified this app" → Advanced → Go to project (آمن — تطبيقك الخاص).
- يرجع للترمنال → يُحفظ `youtube-tokens.json`.

### 4) نقل التوكنز إلى GitHub Secrets

افتح `youtube-tokens.json` وانسخ القيم إلى **repo secrets**:

| Secret | من |
|---|---|
| `YT_CLIENT_ID` | client_id |
| `YT_CLIENT_SECRET` | client_secret |
| `YT_ACCESS_TOKEN` | access_token |
| `YT_REFRESH_TOKEN` | refresh_token |
| `YT_EXPIRES_IN` | `3600` |

بعدها الـ workflow يجدد الـ access token أوتوماتيك عند الحاجة.

## الاستخدام

```powershell
node youtube-publish.cjs --dry-run --from-fb-log --as-video  # معاينة بدون رفع
node youtube-publish.cjs --from-fb-log --as-video             # Short + فيديو أفقي (الوضع المستخدم في CI)
node youtube-publish.cjs --from-fb-log                        # Short فقط
node youtube-publish.cjs --from-tiktok-log                    # رفع آخر فيديو TikTok
node youtube-publish.cjs --from-fb-log --privacy unlisted
node youtube-publish.cjs --topic demo-001                     # توليد + رفع موضوع محدد
node youtube-publish.cjs                                      # توليد + رفع (ترندات + مدونة)
```

> **لماذا التحويل لأفقي؟** يوتيوب يصنّف الفيديو العمودي (9:16) الأقصر من 3 دقائق كـ Short
> تلقائياً ولا يظهر في تبويب Videos. تحويله لـ 16:9 (عرض أكبر من الطول) يجعله فيديو عادياً
> يظهر في صفحة القناة. التحويل يتم عبر `ffmpeg-static` (خلفية ضبابية + الفيديو في المنتصف).

المخرجات المولّدة في `output/` (مستقلة عن مجلد TikTok).

## الجدولة

مدمجة في `.github/workflows/daily-reels.yml` — بعد كل ريلز فيسبوك يُرفع نفس الفيديو
على قناة فيروز تلقائياً (حتى 5 فيديوهات يومياً).

## ملاحظات

- **الحد الأقصى للرفع:** الفيديوهات هنا ~10-30 MB — آمنة للرفع أحادي الدفعة.
- **الخصوصية:** `public` افتراضياً (غيّر بـ `--privacy unlisted` للتجربة).
- **الفئة:** `27` (Education) — غيّر بـ `--category`.
- **Shorts:** الفيديو عمودي 9:16 وأقل من 3 دقائق → يوتيوب يعتبره Short تلقائياً.
- **صلاحية access token:** ساعة — يُجدّد أوتوماتيك من refresh token (لا ينتهي ما لم يُسحب).
- **حالة OAuth:** لا يحتاج مراجعة App (خلافاً لـ TikTok) — التطبيق اختبار ويعمل بحسابك.

## استكشاف الأخطاء

| الخطأ | الحل |
|---|---|
| `invalid_client` | تحقق من YT_CLIENT_ID / YT_CLIENT_SECRET |
| `redirect_uri_mismatch` | تأكد أن `http://localhost:8788/oauth/callback` مسجّل بالضبط في Console |
| `unauthorized_client` | فعّل YouTube Data API v3 في المشروع |
| `403 quotaExceeded` | حد الرفع اليومي 100 فيديو/يوم مجاناً — نحن نرفع 1 يومياً |
| `access_denied` | أعد `login` (ربما نُشط "Don't allow" أو انتهت الجلسة) |
| التوكن نُسحب | أعد `node youtube-oauth.cjs login` وحدّث `YT_REFRESH_TOKEN` في secrets |

## المرجعيات

- YouTube Data API v3 (resumable upload): https://developers.google.com/youtube/v3/guides/using_resumable_upload_protocol
- Google OAuth2: https://developers.google.com/identity/protocols/oauth2/web-server
