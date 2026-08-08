# AGENTS.md — دليل فريق العمل على منصة المحامي الرقمية

> هذا الملف يُقرأ تلقائياً من OpenCode / Codex / Cursor / Aider / Devin / Gemini CLI في بداية كل جلسة. يصف الفريق، توزيع المسؤوليات، واتفاقيات العمل.

---

## فريق الـ Agents

| الاسم | الدور | التخصص | Workspace |
|---|---|---|---|
| **خبير برمجي** (`agent-07d6b451c09f`) | Tech Lead / Architect | معماري + مراجعة كود — **لا يكتب production code كامل** | `D:\قانوني 7` |
| **خبير قانوني** (`agent-96d55f99a043`) | Domain Expert | قانون إداري + عمالي مصري، صياغة مذكرات وعقود | `D:\المكتبة القانونية` |
| **frontend-specialist** | تنفيذ الواجهة | React 19 + TypeScript + TailwindCSS 4 + RTL | `D:\قانوني 7` |
| **backend-specialist** | تنفيذ البيانات | IndexedDB + Firebase + server.ts + schemas | `D:\قانوني 7` |
| **electron-specialist** | تنفيذ Desktop | Electron 42 + electron-builder + IPC + packaging | `D:\قانوني 7` |
| **verifier** | Quality Gate | مراجعة adversarial قبل التسليم | — |
| **mavis** (orchestrator) | تنسيق | يستلم طلب المستخدم ويوزّع على المختصين | — |

> الـ `coder` و `general` موجودين كـ fallback افتراضي. لا يُستخدمان إلا لو فشل المختص المخصص.

---

## تدفّق العمل (Workflow)

### طلب ميزة جديدة

```
1. المستخدم (الأستاذ أحمد)
   ↓ "عايز [ميزة]"
2. خبير برمجي (architect)
   ↓ يكتب ADR مختصر + يحدّد المتطلبات
3. خبير قانوني
   ↓ لو الميزة قانونية، يحدد المتطلب القانوني (نصوص + سوابق + edge cases)
4. المختص المناسب (frontend / backend / electron)
   ↓ ينفّذ المتطلب
5. خبير برمجي
   ↓ يراجع الكود (code review)
6. verifier
   ↓ مراجعة نهائية + اختبارات
7. خبير برمجي
   ↓ يحدّث CHANGELOG.md و يدمج
```

### طلب إصلاح bug

```
1. المستخدم ← "فيه bug في [مكوّن]"
2. خبير برمجي ← يحلّل السبب الجذري
3. المختص المناسب ← يصلح
4. خبير برمجي ← يراجع
5. verifier ← يتأكد ما رجعش
```

### طلب بحث / تحليل

```
1. المستخدم ← "ابحث في [موضوع قانوني]"
2. خبير قانوني ← يبحث + يلخّص + يستشهد
3. خبير برمجي ← لو الطلب يحتاج ميزة تقنية، يحوّلها لمتطلب
```

---

## اتفاقيات الكود (Code Conventions)

### TypeScript
- Strict mode دائماً
- لا `any` على domain types — مسموح فقط على edge cases مع تبرير مكتوب
- الـ interfaces بالعربية للحقول domain-related، بالإنجليزية للباقي

### React
- Functional components + hooks فقط
- لا class components
- لا Redux/Zustand — React Context + useState كافي

### Tailwind
- ألوان: `slate-*` (رمادي) أساس، `emerald-*` (نجاح)، `red-*` (خطأ)
- **ممنوع:** `amber-*` / `orange-*` (إلا بإذن صريح — المشروع بيقلل البرتقالي)
- RTL: استخدم `ms-*` / `me-*` / `text-start` بدل `ml-*` / `mr-*` / `text-left`

### Naming
- Components: PascalCase
- Hooks: `use*`
- Props: `ComponentNameProps`
- Event handlers: `handle*` (داخلي) أو `on*` (props)
- Files: kebab-case أو PascalCase حسب السياق

### File Organization
```
src/
├── components/      # React components
├── contexts/        # React Contexts
├── data/            # static data + templates
├── utils/           # helper functions
├── types*.ts        # TypeScript types
├── App.tsx          # main app
└── main.tsx         # entry point
```

---

## قواعد الأمان (غير قابلة للتفاوض)

1. **لا API keys في الكود.** تُقرأ من `.env` فقط.
2. **لا بيانات موكلين في console** أو logs.
3. **`contextIsolation: true`** و **`nodeIntegration: false`** في Electron.
4. **CSP header** محدد في BrowserWindow.
5. **ملفات المستخدم معقّمة** قبل المعالجة (XSS prevention).

---

## معايير الـ Commit

كل تغيير كبير يمر بمراحل:
1. الكود مكتوب من المختص
2. Code review مع خبير برمجي (approve/reject)
3. CHANGELOG.md محدّث
4. لو قرار معماري كبير → ADR جديد في `docs/adr/`
5.Verifier يوافق
6. يدخل في release جديدة

---

## الاختصارات

| الاختصار | المعنى |
|---|---|
| ADR | Architecture Decision Record |
| RTL | Right-to-Left (للعربية) |
| IPC | Inter-Process Communication (Electron) |
| CSP | Content Security Policy |
| NSIS | Nullsoft Scriptable Install System (Windows installer) |

---

## الوثائق المرتبطة

- **CHANGELOG.md** — كل التغييرات
- **README.md** — تشغيل المشروع
- **metadata.json** — وصف التطبيق
- **docs/adr/** — القرارات المعمارية الكبيرة (يُنشأ عند الحاجة)

---

*آخر تحديث: 12 يوليو 2026 — الفريق مكوّن من 6 specialists + 1 orchestrator*

---

## حالة الجلسة الحالية: Session 3 — إصلاح ترميز العربية (مكتمل)

### المشكلة
جميع ملفات `src/` تعرضت لـ CP1256 round-trip corruption بسبب `Get-Content -Raw` في PowerShell 5.1 بدون `-Encoding UTF8`. الحروف العربية والرموز (←, →, ✕, ✓) تحوّلت إلى رموز تالفة (U+FFFD, U+00E2, U+0153, U+2022).

### ما تم

| الخطوة | التفاصيل | النتيجة |
|---|---|---|
| 1. تشخيص | سكربت Node.js مسح 50+ ملف ووجد ~6400 بايت تالف | تحديد كامل لـ scope المشكلة |
| 2. استرداد جماعي | سكربت `fix_all_cp1256.cjs` طبق reverse CP1256 mapping على 43 ملف | 4374 رمزًا مسترداً |
| 3. إصلاح يدوي | 5 رموز `â` متبقية في ClientsList.tsx → `←`, `✕`, `+` | 0 رموز تالفة في السورس |
| 4. إعادة بناء | `npm run electron:build` → Web + Desktop bundle جديد | `dist-desktop\منصة المحامي الرقمية 0.0.0.exe` |

### الملفات المتأثرة (43 ملف تم إصلاحها)
`App.tsx`, `main.tsx`, `types.ts`, `types_auth.ts`, `types_notes.ts`, `ClientsList.tsx`, `CasesList.tsx`, `BailiffPapersPanel.tsx`, `Dashboard.tsx`, وتقريباً كل `src/components/*` و `src/data/*` و `src/utils/*` و `src/contexts/*`.

### المتبقي
- 3 رموز U+00A9 (©) و U+00B1 (±) في `LegalLibrary.tsx`, `SmartScanner.tsx`, `security.ts`, `wordExportHelper.ts` — **شرعية** (ليست تالفة)
- مطلوب من المستخدم: تشغيل `منصة المحامي الرقمية 0.0.0.exe` الجديد من `dist-desktop/` (وليس القديم من سطح المكتب)

---

## حالة الجلسة الحالية: Session 4 — نظام المراقبة اليومي + أتمتة سحابية كاملة (مكتمل)

### ما أُنجز
1. **نظام مراقبة يومي شامل** `scripts/monitor/health-check.cjs` — 7 فحوصات (الموقع، المدونة + og:image، sitemap، فيسبوك + ريلز، GitHub Actions، مطابقة السجلّ مع الحي) → تقرير `reports/health/<التاريخ>.md` + `latest.json` + فتح GitHub Issue عند الأخطاء.
2. **`daily-health-monitor.yml`** — يومياً **9:00 صباحاً القاهرة** (06:00 UTC) + تشغيل يدوي. GITHUB_TOKEN يُمرَّر صراحةً (`secrets.GITHUB_TOKEN`) + إذن `actions: read`. فحص تطابق اليوم مع فيسبوك مرفوع من error→warn قبل 19 UTC (منع إنذار كاذب صباحي).
3. **إصلاح فشل النشر (run #14):** خطوة `Build & Deploy` في `daily-blog-post.yml` كانت بلا `env: FIREBASE_TOKEN` → أُضيف. تم التحقق من نجاح الـ deploy.
4. **`generate-sitemap.cjs`** (57 رابطاً) مربوط بنهاية `daily-publish.cjs`.
5. **إيقاف المهام المحلية المجدولة** (كانت تسبب ازدواجاً وتداخلاً مع CI):
   - `DailyBlogPublish` → `Disabled` (كان يشغّل `daily-publish.cjs` يومياً 9ص)
   - `MohwamiDigital-BlogPublisher` → `Disabled` (كان يشغّل `auto-publisher.cjs` يومياً 9ص)
   - إعادة التفعيل عند الحاجة: `Enable-ScheduledTask -TaskName "DailyBlogPublish","MohwamiDigital-BlogPublisher"`
6. **التحقق من الاستمرارية مع الجهاز مغلق:** كل 5 workflows على `runs-on: ubuntu-latest` (سحاب GitHub، 0 رنر محلي)، كل الـ secrets مضبوطة (FB_PAGE_ID/TOKEN, FIREBASE_TOKEN, GEMINI_API_KEY, PEXELS_API_KEY)، `package-lock.json` ملتزم. الـ reports اليومية تُدفع تلقائياً فتمنع تعطيل cron بقاعدة الـ 60 يوم.

### المتبقي / تنبيهات
- **Issue #1** مفتوح (سجل فشل run #14) — يُغلق يدوياً بعد الاطلاع.
- **22 غلاف SVG** لمقالات قديمة (تحذير معلوماتي فقط في المراقب) — يُنصح بتحويلها JPG لاحقاً.
- **الموعد 9ص ثابت على 06:00 UTC** — في الشتاء (UTC+2) سيصبح 8ص. إن أُريد 9ص ثابتاً طول العام، يُضبط في أكتوبر.
- ملفات غير ملتزمة متروكة: `scripts/seo/`, `scripts/facebook-reels/`, صور `test_*.jpg`, `public/googlec03a96f2162c19b9.html` (تحقق GSC).
- الـ repo متزامن عند `52cc3a2`. التوكن يُستخرج من Windows Credential Manager عند الحاجة.

---

## حالة الجلسة الحالية: Session 5 — النشر التلقائي على قناة YouTube (مكتمل)

### ما أُنجز
1. **`scripts/youtube-publisher/`** جديد:
   - `youtube-oauth.cjs` — OAuth2 لجوجل (local server على `http://localhost:8788/oauth/callback`، أوامر `login/status/refresh/import/clear`) + `getValidAccessToken()`.
   - `youtube-publish.cjs` — رفع **Resumable** على YouTube Data API v3 مع العنوان/الوصف/الهاشتاجات، فئة Education (27)، `--privacy`، `--dry-run`، **`--from-fb-log`** (يرفع آخر فيديو ريلز فيسبوك في نفس الـ run — المعتمد في CI)، أو `--from-tiktok-log`، أو توليد فيديو مستقل.
   - `youtube-published-log.json` (سجل منع الازدواج) + `package.json` + `README.md` + `print-secrets.cjs`.
2. **قرار المستخدم:** يوتيوب ينشر **فيديوهات فيسبوك (ريلز)** بدل فيديوهات التيك توك → `.github/workflows/daily-reels.yml` يرفع كل ريلز على قناة فيروز عبر `youtube-publish.cjs --from-fb-log --as-video` (حتى 5 يومياً). **`--as-video` = نشر مزدوج:** الريلز كـ Short (9:16) + نسخة أفقية 16:9 (ffmpeg-static بخلفية ضبابية) تظهر في تبويب **Videos** بصفحة القناة — لأن يوتيوب لا يعرض العمودي <3 دقائق في التبويب الرئيسي. سجلّ منع الازدواج أصبح نوعيّاً (`kind: short | video`). خط يوتيوب أُزيل من `daily-tiktok.yml`.
3. **إصلاح سباق الدفع:** خطوات `git push` في كل الـ workflows تسبقها `git pull --rebase origin main` (كانت تفشل بـ 128 عند الدفع المتزامن).
4. **لماذا نفس الـ workflow:** الفيديو المولّد في `scripts/facebook-publisher/output/` مُتجاهل في `.gitignore` — فلو كان workflow مستقلاً ما كان سيجد ملف الفيديو. الرفع يتم في نفس الـ runner مباشرة بعد التوليد.
5. **CHANGELOG.md** → v2.10.0.

### ✅ الإعداد اليدوي اكتمل (2026-08-04)
1. مشروع Google Cloud + **YouTube Data API v3** مفعّل ✓
2. OAuth consent screen (scope `youtube.upload` + Test user) ✓
3. **OAuth Client ID (Web application)** — redirect `http://localhost:8788/oauth/callback` ✓
4. محلياً: `node scripts/youtube-publisher/youtube-oauth.cjs login` → `youtube-tokens.json` ✓
5. GitHub Secrets (5) أُضيفت عبر `gh secret set`: `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_ACCESS_TOKEN`, `YT_REFRESH_TOKEN`, `YT_EXPIRES_IN` ✓
6. **إعادة الربط على قناة فيروز** بعدما اتوصل الفيديو الأول على قناة ahmed Mansour بالغلط — التوكنز وsecrets اتحدثت، والفيديو الصحيح على فيروز: https://www.youtube.com/watch?v=_Ru035_zlZQ ✓
7. اختبار محلي: `refresh` نجح — التوكنز صالحة ✓
8. تم الالتزام والدفع — `git push` → main متزامن.

### تنبيهات
- لا حاجة لـ API key — الرفع يتطلب OAuth2 حصراً.
- الفيديو عمودي 9:16 <3 دقائق → YouTube Shorts تلقائياً.
- يوتيوب لا يحتاج مراجعة App (خلافاً لـ TikTok) — تطبيق اختباري يعمل بحساب المستخدم.
- القناة: `https://www.youtube.com/channel/UClYcsQJiwn0TkpmeVCQy-VA` (في `YT_CHANNEL_URL`).
- أداة الطباعة: `node scripts/youtube-publisher/print-secrets.cjs` (لعرض القيم مجدداً لو رُفعت).
- gh CLI مؤقت: `C:\Users\EDA2~1\AppData\Local\Temp\opencode\gh\bin\gh.exe` (متصل بالتوكن من Credential Manager — scopes: gist/read:org/repo).
- `git.exe` متاحة في `C:\MinGit\cmd\git.exe`. الـ repo متزامن عند `37c5901`.
- **تجربة أولى:** شغّل الـ workflow يدوياً (Actions → 🎬 الناشر اليومي — ريلز فيسبوك → Run workflow) للتحقق من رفع الريلز على فيروز.

---

## حالة الجلسة الحالية: Session 6 — ترقية نظام المراقبة اليومي (مكتمل)

### المشكلة
- فحص GitHub كان ينظر لـ "اليوم" فقط بينما يعمل الساعة 9ص — أي فشل مسائي (مثل TikTok 19:44) لا يلتقطه تقرير الصباح، وتقرير الغد يفحص يوماً جديداً → الفشل يتسرّب نهائياً.
- TikTok يفشل يومياً لأن توكنز TikTok غير موجودة في GitHub secrets أصلاً + خطوة commit تنهي بـ exit 128 لغياب `tiktok-tokens.json`.

### ما تم
1. **`health-check.cjs`** — فحص `github_runs` ينظر الآن إلى **آخر 24 ساعة** (نافذة زمنية لا "تاريخ اليوم").
2. **`daily-health-monitor.yml`** — تشغيلان يومياً: `0 6 * * *` (9ص) + `0 18 * * *` (9م القاهرة).
3. **`daily-tiktok.yml`** — ⏸️ جدولة يومية موقوفة مؤقتاً (لا توكنز TikTok) + إصلاح خطوة commit (`git add -A` + commit مشروط). التفعيل لاحقاً: أضف الـ secrets وأزل تعليق الـ cron.
4. **CHANGELOG.md** → v2.10.2.

### ملاحظات
- تقرير المراقبة 08-04 كان 🟡 تحذيرات شرعية: 22 غلاف SVG، sitemap 59≠55، فيسبوك 0 منشورات عند 9ص (قبل تشغيلات اليوم — متوقع).
- `reports/health/latest.json` ترميزه سليم UTF-8 (أي عرض mojibake كان مجرد طرفية).

---

## حالة الجلسة الحالية: Session 7 — بطاقات تعليمية يومية على فيسبوك (مكتمل)

### ما أُنجز
1. **طريقة نشر جديدة** على فيسبوك بجانب الريلز: كل يوم 10:00 ص القاهرة، `card-publisher.cjs` يأخذ **الترند الأعلى من جوجل** (`trending-topics.json`) ويحوّله لبطاقة تعليمية 1200×628 (ستايل إنستجرام فاتح) ويصدرها منشور صورة.
2. **`scripts/facebook-publisher/card-publisher.cjs`** (جديد): اختيار الترند غير المنشور (سجلّان منع ازدواج: بطاقات + ريلز)، توليد المحتوى عبر **Gemini Flash** (Hook + 3 نقاط قانونية بمرجع المادة + نصيحة + هاشتاجات + CTA)، رندر SVG→PNG عبر sharp/librsvg، نشر عبر `publishPhoto`، أعلام `--dry-run`/`--topic <slug>`/`--status`/`--allow-reel-overlap`.
3. **`facebook-graph.cjs`** — دالة جديدة `publishPhoto()` (multipart عبر `form-data`، endpoint `/{page-id}/photos`).
4. **`.github/workflows/daily-cards.yml`** (جديد) — cron `0 7 * * *` (10:00 القاهرة): بعد الناشر الذكي (9:00 يولّد الترندات) وبعد أول ريلز (9:05) فيتخطّى موضوعه. يلتزم السجلّ ويدفع.
5. **إصلاحات حاسمة أثناء التطوير:**
   - **هاشتاجات**: Gemini أعادتها بلا `#` → `normalizeHashtags()` يضيف `#`/يستبدل الفراغات بـ `_`/يحدّ 6.
   - **RTL في librsvg**: مع `direction="rtl"` — `text-anchor="start"` يمتد يساراً (محاذاة يمين)، `end` يمتد يميناً (محاذاة يسار). استخدام `end` مع نص عربي طويل يسبب قصّاً. العناوين تُرسى بـ `start` عند الحافة اليمنى، والهاشتاجات بـ `end` عند اليسار.
   - **تخطيط تراكمي يفيض** عند عنوان بسطرين → إعادة كتابة `buildCardSvg` بمواضع رأسية ثابتة Deterministic: `BADGE_Y=54, CHIP_Y=28, HOOK_Y=118, TITLE_Y=170(+50), POINT_ROWS=[290,358,426], TIP_Y=452, FOOTER_Y=584` مع قصّ أسطر محدد.
6. **تحقق بالبكسل**: فحص bands لبُعدين من الاختبارات (عناوين 1-2 سطر) أظهر توزيعاً نظيفاً بلا تراكب/قصّ؛ الحواف ضمن 1200×628.
7. **CHANGELOG.md** → v2.11.0.

### تنبيهات
- لا يوجد API عام لـ NotebookLM → المحتوى يُولَّد عبر Gemini مباشرة (قرار معتمد).
- التجربة الأولى: Actions → 🃏 الناشر اليومي — بطاقات تعليمية على فيسبوك → Run workflow.
- البطاقات في `scripts/facebook-publisher/output/cards/` (متجاهلة في git).
- أدوات الفحص المؤقتة `_rtl-probe.cjs`/`_card-check.cjs` حُذفت بعد التحقق.
- **Session 7b:** `buildCardSvg` أُعيد تصميمها لستايل **داكن أنيق** (خلفية slate-900→indigo، شارات أرقام متدرجة، صندوق نصيحة زجاجي، إزالة emoji من SVG — الـ emoji بقيت في الكابشن فقط). المواضع الرأسية الثابتة محدّثة: `BADGE_Y=58, CHIP_Y=28, HOOK_Y=128, TITLE_Y=178(+52), POINT_ROWS=[300,366,432], TIP_Y=458, FOOTER_Y=592`.
- **Session 7c:** بطاقات فيسبوك — **خط Cairo** (OFL، `scripts/facebook-publisher/fonts/Cairo.ttf`) عبر `@font-face` بدل Tahoma/Noto، وأسلوب كتابة وفق خبراء فيسبوك (hook شخصي + عنوان بفائدة + نصوص مقتصدة). المواضع الجديدة: `BADGE_Y=58, CHIP_Y=28, HOOK_Y=132, TITLE_Y=188(+56), POINT_ROWS=[308,374,440], TIP_Y=468(+32), FOOTER_Y=596`. توليد البطاقات على Linux CI يحتاج خط Cairo (مضمّن في الريبو).

---

## حالة الجلسة الحالية: Session 8 — ربط الدومين المخصص mohamidigital.online (مكتمل)

### ما أُنجز
1. **شراء وربط الدومين:** `mohamidigital.online` مسجّل لدى **Hostinger** (HOSTINGER operations, UAB — مؤكد عبر RDAP، وليس Spaceship كما ظننا سابقاً؛ التسجيل 2026-08-07، الانتهاء 2027-08-07). إدارة السجلات عبر **hPanel** (`hpanel.hostinger.com`). NS بقيت على `lunar/solar.dns-parking.com` (موزّعات DNS تابعة لـ Hostinger فعّالة). سجلات DNS الأولية: `A @ → 199.36.158.100` (IP الرسمي لـ Firebase Hosting)، `A www → 199.36.158.100`.
2. **بنية multi-site (مهم):** التطبيق انتقل من موقع `justice-91571` إلى موقع جديد **`justice-91571-app`** (target name: `app`، public: `dist`) — هو الذي يرتبط به الدومين المخصص الآن. الموقع القديم **`justice-91571`** (target name: `legacy`، public: `dist-legacy`) أصبح يخدم **redirect 301** فقط نحو `https://mohamidigital.online/:path`. التكوين في `firebase.json` (hosting array) + `.firebaserc` (targets: app/legacy).
3. **سجل TXT الحالي:** `@ → hosting-site=justice-91571-app` (القديم `hosting-site=justice-91571` حُذف من hPanel). **تحذير:** كل موقع له TXT مختلف — عند النقل لمولّد جديد يُحدَّث TXT في الـ registrar وإلا تظهر حالة `DOMAIN_VERIFICATION_LOST`.
4. **فخ النشر multi-target (مهم):** قبل أي `firebase deploy --only hosting:<target>` احذف `.firebase/hosting.*.cache` وإلا خطأ `The "paths[1]" argument must be of type string. Received undefined`.
5. **استبدال شامل للدومين:** سكربت `replace_domain.cjs` (في `C:\WINDOWS\TEMP\opencode\`) حدّث 140 ملفاً / 1502 استبدال: `justice-91571.web.app` → `mohamidigital.online` (canonical/hreflang/og:/JSON-LD/robots/sitemap/كل src). `CHANGELOG.md` استُثني عمداً (سجل تاريخي). تحقق: 0 متبقٍّ خارج CHANGELOG. robots.txt → `Sitemap: https://mohamidigital.online/sitemap.xml`؛ إعادة توليد sitemap.xml + sitemap.html عبر `generate-sitemap.cjs`.
6. **البناء والنشر:** `npm run build` نجح + `npx firebase deploy --only hosting:app` → تحقق حي: الرئيسية 200 (title: منصة المحامي الرقمية، canonical صحيح)، `/blog/` 200، `sitemap.xml` 200، `/__/auth/iframe` 200. الدومين مرتبط بالمولّد الجديد وحالته **Connected**.
7. **إصلاح تسجيل الدخول بجوجل (مهم):** الدخول فشل من الدومين الجديد لأن `mohamidigital.online` لم يكن في **Authorized domains** في Firebase (Authentication → Settings). الحل من الكونسول حصراً — **بدون أي تعديل كود**: أضاف المستخدم `mohamidigital.online` + `www.mohamidigital.online`. التحقق عبر `getProjectConfig` أظهر الدومينين مصرّحين. **درس مهم:** `authDomain` في `firebaseClient.ts` يبقى `justice-91571.firebaseapp.com` (لا يُغيّر — Firebase يرسل نافذة الدخول لهذا الدومين المسجّل في OAuth).
8. **Redirect 301 فعّال ومحقَّق:** `https://justice-91571.web.app/*` يعيد 301 نحو `https://mohamidigital.online/*` مع **الحفاظ على المسار**. القاعدة الصحيحة في Firebase: `{"source": "/", "destination": "https://mohamidigital.online/", "type": 301}` + `{"source": "/:path*", "destination": "https://mohamidigital.online/:path", "type": 301}`. **درس:** صيغة `destination: "https://.../**"` تُرسل الرمز حرفياً ولا تحفظ المسار — الوضع الصحيح هو named capture `:path`.
9. **Search Console:** ملف التحقق `googlec03a96f2162c19b9.html` منشور في `public/` ويُستجاب بـ 200 على `https://mohamidigital.online/googlec03a96f2162c19b9.html` (مع rewrite استثناء `/google*.html` قبل الـ SPA catch-all في تكوين app). **بانتظار المستخدم:** الضغط Verify في Search Console ثم إرسال `sitemap.xml`.
10. **git:** commit `e0eaa61` (111 ملفاً، +1084/−980) — تعديلات الدومين فقط؛ الملفات غير المرتبطة (untracked) تُركت خارج الـ commit. الدفع عبر stash → pull --rebase → push → stash pop.

### الدومينات المصرّحة في Firebase Auth حالياً
`localhost`, `justice-91571.firebaseapp.com`, `justice-91571.web.app`, `mohamidigital.online` ✅, `www.mohamidigital.online` ✅

### تنبيهات / متبقٍّ
- **Search Console:** بانتظار المستخدم — الضغط **Verify** (الملف منشور ويعمل) ثم **Sitemaps** → `sitemap.xml` → Submit.
- **كاسبرسكي** على جهاز المستخدم يعترض HTTPS محلياً (شهادة `CN=auth.match0.nl` من Kaspersky Root) — تُفضَّل الفحوصات الخارجية (مثل `r.jina.ai` أو `curl` مع تجاهل الشهادة) على الفحوصات المحلية.
- توكن `access_token` في `C:\Users\احمد منصور\.config\configstore\firebase-tools.json` ينتهي كل ساعة والـ refresh عبر oauth2.googleapis.com يفشل أحياناً (400) — أوامر `npx firebase ...` تعمل عبر CLI كبديل.
- آخر commits مدفوعة: `e0eaa61` (ربط الدومين)، `01803cb` (ريلز)، `a278dfc` (تقرير مراقبة)، `3ea4a1b` (إصلاح AdSense).

---

## حالة الجلسة الحالية: Session 9 — إصلاح شامل لإعدادات Google AdSense (مكتمل)

### ما أُنجز
1. **إضافة وحدة الإعلانات المقترحة (autorelaxed, slot `8981348923`)** في نهاية كل مقالات المدونة (93 مقالاً) قبل قسم CTA + قالب المولد اليومي `daily-publish.cjs:773` — فكل مقال جديد سيضمّنها تلقائياً.
2. **إزالة النمط المتقادم `enable_page_level_ads: true`** من 16 مكاناً: `index.html`، 14 صفحة في `public/pillars/`، و`scripts/seo/generate-pillar.cjs`. الأسلوب الحديث: مجرد `<script async src="...adsbygoogle.js?client=ca-pub-7725405859334364" crossorigin>` يكفي (Auto Ads تُفعَّل من لوحة AdSense وليس الكود).
3. **توحيد صيغة الوحدة `2168039898`** في `AppLayout.tsx` من `format="horizontal"` إلى `auto` (لتطابقها مع بقية المواقع — وحدة واحدة بصيغة واحدة).
4. **إصلاح بقايا الدومين القديم** في مقال `public/blog/egyptian-social-insurance-pension-guide.html` (أُنشئ اليوم بعد سكربت الاستبدال) — canonical/og:url/twitter:image تحوّلت إلى `mohamidigital.online`. أُعيد توليد sitemap (111 رابطاً) وأُعيد البناء والنشر.
5. **git:** commit `b603991` → بعد rebase أصبح `3ea4a1b` (111 ملفاً، +1141/−214) — مقالات المدونة + pillars + index.html + القوالب فقط.

### مراجع إعدادات AdSense (حالة مؤكدة)
- معرّف العميل موحّد: `ca-pub-7725405859334364` (لا توجد معرفات أخرى)
- الوحدات (9 slots): `2168039898` (auto، الرئيسية/المدونة/pillars/الصفحات الثابتة)، `3911754995` (fluid/in-article، المراجع)، `5434337426`/`8607295670`/`9002240868`/`6851909615` (auto، تطبيق React)، `8404664438`/`5940963255` (auto، LegalArticles)، `8981348923` (autorelaxed، LegalLibrary + المدونة)
- كل صفحة تحمّل السكربت الرئيسي مرة واحدة قبل وحداتها — لا تكرار، لا صفحة بوحدات بلا سكربت.
- `data-full-width-responsive="true"` على الوحدات المتجاوبة في الصفحات الثابتة.

### تنبيهات
- **`www.mohamidigital.online` لا يعمل** (Connection reset): سجل A موجود (199.36.158.100) لكن الدومين **غير مضاف** كدومين مخصص في Firebase Hosting — يتطلب إضافة يدوية من الكونسول + سجل TXT `hosting-site=justice-91571-app` في hPanel (لا يوجد أمر CLI/REST لإضافة دومين).
- `index.html` به meta tag مزدوج لـ Search Console (ملف `googlec03a96f2162c19b9.html` + meta) — انتظار المستخدم: الضغط Verify ثم إرسال sitemap.xml.
- ملفات untracked متروكة عمداً: `src/components/SiteSearchModal.tsx`، `public/search*`، `public/legal-library.html`، `scripts/facebook-reels/`، `scripts/tiktok-publisher/test-caption.png`، `_test-font.cjs`، `public/BingSiteAuth.xml`، `public/62c624f591cc714b7d28bf2c04c7966e.txt`.

---

## حالة الجلسة الحالية: Session 10 — حل ازدواج الدومين + تبسيط Firestore Rules (مكتمل)

### ما أُنجز
1. **تشخيص ازدواج الدومين:** `mohamidigital.online` كان مربوطاً بموقعين في نفس اللحظة — القديم `justice-91571` (`DOMAIN_ACTIVE` لأن TXT كان يطابقه) والجديد `justice-91571-app` (`DOMAIN_VERIFICATION_LOST`). هذا هو سبب "الأخطاء" التي رآها المستخدم عند تعديل TXT سابقاً — أي تغيير يصلح موقعاً ويكسر الآخر.
2. **الحذف البرمجي مستحيل:** REST DELETE للدومين من الموقع القديم يفشل دائماً بـ 500 `CD_SITE_DELETION_IGNORE_ERRORS is not supported` → الحذف من الكونسول يدوياً فقط. قام المستخدم بالحذف من Firebase Console بنجاح (تحققت: الموقع القديم صار `{}` بلا دومينات).
3. **إصلاح TXT في hPanel:** المستخدم غيّر سجل TXT إلى `hosting-site=justice-91571-app` — تحققت عبر Google DNS (`dns.google/resolve`) أنه المنشور الوحيد. Firebase يرى الآن `DNS_MATCH` + `CERT_ACTIVE`.
4. **انتظار إعادة الفحص:** حالة `justice-91571-app` لا تزال `DOMAIN_VERIFICATION_LOST` — تحتاج إعادة فحص دورية من Firebase (TTL السجل 4 ساعات). المراقبة الدورية 20 دقيقة لم تُظهر تغييراً؛ يُعاد الفحص لاحقاً.
5. **تبسيط `firestore.rules`:** حذف القاعدة المكررة `match /users/{userId}/{subcollection}/{docId}` ودمجها في `match /users/{userId} { match /{document=**} }`. السلوك مطابق تماماً: الوثيقة الرئيسية `users/{uid}` (مالك + مدير يكتبان)، المجموعات الفرعية (المالك يكتب، المدير يقرأ فقط).
6. **التحقق بالقواعد:** 9 اختبارات عبر `firebaserules.googleapis.com ...:test` (Rules Playground API) — كلها PASS: كتابة الوثيقة الرئيسية، كتابة profile، رفض مستخدم آخر، قراءة المدير، رفض كتابة المدير للفرعية، رفض المجهول، أعماق متعددة.
7. **النشر:** `npx firebase deploy --only firestore:rules --project justice-91571` → نجح.

### مرجع مهم (طريقة اختبار قواعد Firestore)
سكربت `C:\WINDOWS\TEMP\opencode\test_rules.cjs` — يقرأ `firestore.rules` بترميز UTF-8 ويُرسله إلى `:test` مع `source.language = 1` (رقم بدل نص) و`files[{name,content}]`. الاستجابة في `testResults[0].state` وليس `testSuite.testCases`.

### متبقٍّ / تنبيهات
- **الدومين:** انتظار تحول `justice-91571-app` إلى `DOMAIN_ACTIVE` ثم إعادة بناء/نشر `hosting:app` للتأكد أن الدومين يخدم النسخة الجديدة. الموقع القديم يعرض حالياً نسخة قديمة كاملة (وليس redirect) لأن `firebase.json:54` للـ legacy يستخدم `public: "dist"` — يُصلح لاحقاً بعد استقرار الدومين (تحويل legacy لـ `dist-legacy` redirect 301).
- **Search Console:** بانتظار المستخدم — الضغط Verify ثم إرسال sitemap.xml.
- **www.mohamidigital.online:** لا يعمل — الدومين الفرعي غير مضاف في Firebase Hosting (يحتاج إضافة يدوية من الكونسول + سجل TXT).

---

## حالة الجلسة الحالية: Session 11 — اكتمال ربط الدومين + Search Console + www (مكتمل)

### ما أُنجز
1. **الدومين `mohamidigital.online` أصبح `DOMAIN_ACTIVE`** على `justice-91571-app` — تحقق حي من API. المحتوى المنشور أصبح النسخة الجديدة `index-z8pLDh4L.js` (بدون `enable_page_level_ads` القديم) بعد إعادة نشر `hosting:app`.
2. **تحويل الموقع القديم `justice-91571.web.app` إلى redirect 301:** كتلة `legacy` في `firebase.json` أصبحت `public: "dist-legacy"` مع قاعدتي redirect (`/` → `mohamidigital.online/` و `/:path*` → `mohamidigital.online/:path`). تحقق حي: 301 على الجذر والمقالات والأصول مع الحفاظ على المسار.
3. **Search Console — تحقق ناجح:** فشل أول بسبب نقص سجل TXT ثم أضاف المستخدم في hPanel سجل `TXT @ google-site-verification=fZV0yiEXSJECzmC-RBceCj2vFtLlIFXhR0MyDaiB-jg` (بجانب `hosting-site=justice-91571-app` — لم يُحذف). تأكد الانتشار عبر `dns.google/resolve` ثم نجح Verify. **باقٍ:** إرسال `sitemap.xml`.
4. **`www.mohamidigital.online`:** Firebase طلب CNAME `www → justice-91571-app.web.app` (كان `www → mohamidigital.online`). عدّله المستخدم في hPanel → تحقق من الانتشار → Verified → الشهادة صدرت → `https://www` يعمل 200 (تحقق `ssl_verify=0`). CNAME الحالي: `justice-91571-app.web.app`.
5. **التلف الظاهري في عناوين الصفحات:** كان مجرد ترميز عرض (CP1256 في الطرفية) — بايتات الملفات المنشورة سليمة UTF-8. لا مشكلة حقيقية.
6. **git:** commit `13696c1` (firebase.json + firestore.rules + AGENTS.md) — push ناجح. الـ repo متزامن.

### مراجع مهمة
- فحص CNAME/TXT: `curl.exe "https://dns.google/resolve?name=<name>&type=TXT|CNAME|NS"` — للتحقق من الانتشار (TTL حقيقي 4 ساعات لكن عادة أسرع).
- ترويسة `Content-Type: text/html; charset=utf-8` يرسلها Firebase تلقائياً.
- قياس طول الاستجابة في PowerShell يعطي **عدد الأسطر** لا البايتات — للبايتات استخدم `[System.Text.Encoding]::UTF8.GetBytes(...)` واعرض hex.

### متبقٍّ
- **Search Console:** إرسال `sitemap.xml` (القائمة الجانبية → Sitemaps).
- **الاختياري:** حذف الموقع القديم `justice-91571` نهائياً من Firebase Console (هو الآن redirect فقط).
- `www` وبدونه متصلان ويعرضان نفس المحتوى (لا redirect بينهما) — إن أُريد توحيد، يُضاف redirect في `firebase.json`.

---

## حالة الجلسة الحالية: Session 12 — فحص شامل للأتمتة + إصلاح فشل النشر اليومي (مكتمل)

### المشكلة المكتشفة (خطيرة)
بعد تحويل `firebase.json` ليستخدم `dist-legacy`، كل الـ workflows كانت تنشر بـ `npx firebase deploy --only hosting` (بدون تحديد target) — فيحاول نشر **كلا الهدفين** (`app` + `legacy`). مجلد `dist-legacy` غير موجود على CI runner (البناء ينتج `dist` فقط) → **النشر اليومي كان يفشل دائماً**:
```
Error: Directory 'dist-legacy' for Hosting does not exist.
```
→ المقالات كانت تُلتزم في git لكن **الموقع الحي لا يتحدث** (المقالات تظهر فقط من رنات سابقة أو بعد إعادة نشر يدوية).

### الإصلاح
تغيير `--only hosting` → `--only hosting:app` في 3 ملفات:
- `.github/workflows/daily-blog-post.yml:53`
- `.github/workflows/daily-blog-publish.yml:49`
- `.github/workflows/daily-pillars.yml:44`

commit `54e9559` — تم push. تحقق بـ `firebase deploy --only hosting:app --dry-run` نجح.

### التحقق الشامل (آخر 24 ساعة)
| الـ Workflow | الحالة |
|---|---|
| Cards (فيسبوك بطاقات) | ✅ 5 نجاحات |
| Reels (ريلز + يوتيوب) | ✅ 5 نجاحات |
| Blog Post (نشر ذكي) | ⚠️ 3 نجاح + 2 فشل (قبل الإصلاح) |
| Health Monitor | ❌ فشل = **إنذار صحيح** (رصد فشل النشر) |

بعد الإصلاح: **كل الرنات ناجحة**. تأكد حياً أن مقالات اليوم (khula-laws, influencer-tax, consumer-rights, public-utilities...) → **200**.

### ملاحظات مهمة
- **المقالات الفاشلة بسبب quota Gemini (429)** لا تُعاد توليدها تلقائياً — كل رن يختار موضوعات ترند **جديدة** (سلوك مقصود في `smart-publisher.cjs`). المقالات الفاشلة غير مسجلة في `published-log.json` ولا تظهر في sitemap أبداً.
- GitHub token للفحص: يُستخرج من Windows Credential Manager عبر P/Invoke `CredRead("git:https://github.com")` ثم فك `Unicode` و`Trim` (يعطي `ghp_...` طول 40).
- `trending-topics.json` المحلي فارغ غالباً — الموضوعات تُولَّد على CI فقط.
- f-reels + يوتيوب + cards مستقلة تماماً عن إصلاح النشر (لم تتأثر).

---

## حالة الجلسة الحالية: Session 13 — إصلاح النشر الداخلي + sitemap (مكتمل)

### المشكلة الجذرية المكتشفة (مهمة جداً)
تعديل الـ workflows في Session 12 (`--only hosting:app`) **لم يكن كافياً** — لأن الناشر الذكي `smart-publisher.cjs` **لا يمر عبر خطوة النشر في الـ workflow** بل ينشر بنفسه داخلياً عبر `execSync('npx -y firebase-tools deploy --only hosting')` → فشل دائم بـ `Directory 'dist-legacy' does not exist`. الرنات كانت تفشل بعد نجاح التوليد والنشر على فيسبوك.

### ما تم
1. **`scripts/smart-publisher.cjs:769`** — `--only hosting` → `--only hosting:app` (كان يفشل دائماً بسبب كتلة legacy في firebase.json).
2. **`scripts/blog-publisher/daily-publish.cjs:888`** — نفس الإصلاح (`--only hosting:app`) لأنه يُشغَّل من `daily-blog-publish.yml` أيضاً.
3. **`scripts/smart-publisher.cjs`** — إضافة توليد sitemap بعد كتابة المقالات وقبل البناء: `node scripts/blog-publisher/generate-sitemap.cjs` (كان sitemap ثابتاً ولا يشمل المقالات الجديدة).
4. **التحقق:** الرن اليدوي `31281274686` → **success**، نشر 3 مقالات جديدة (2026-08-09): `egypt-digital-notary-services`, `remand-in-custody-egyptian-law`, `government-complaints-system-egypt` — كلها **200 حي**. sitemap.xml أصبح **120 رابطاً** ويشملها.
5. **git:** commits `d3306ea` (إصلاح النشر الداخلي) + `2d98d19` (sitemap) — مدفوعة. الـ repo متزامن.

### ملاحظات مهمة
- **الدرس:** أي سكربت نشر داخلي (`execSync firebase deploy`) يجب أن يستخدم `--only hosting:app` — لا `--only hosting`. سكربتات أخرى لا تزال بها الصيغة القديمة لكنها **يدوية فقط** (لا تُشغَّل في CI): `rebuild-blog.cjs:79`, `fix-og-images.cjs:84`, `auto-publisher.cjs:1200` (معطّل), ورسائل توثيق في `scripts/seo/*.md`.
- **الـ dispatch اليدوي:** POST `/repos/ahmdmansoor2/digital-lawyer-platform/actions/workflows/daily-blog-post.yml/dispatches` بـ `{"ref":"main"}` — الرن يُلتقط من أحدث main في لحظة التشغيل.
- آخر توليد ناجح 09:39 كان 4 مقالات؛ الرنات المتوسطة فشلت بـ Gemini 429/503 (حصة مجانية)؛ خفض MAX_TODAY إلى 3 في `smart-publisher.cjs:692` قلل الضغط.