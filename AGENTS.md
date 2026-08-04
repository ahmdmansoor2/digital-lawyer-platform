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

## حالة الجلسة الحالية: Session 5 — النشر التلقائي على قناة YouTube (كود مكتمل — ينتظر إعداد جوجل)

### ما أُنجز (كود جاهز)
1. **`scripts/youtube-publisher/`** جديد:
   - `youtube-oauth.cjs` — OAuth2 لجوجل (local server على `http://localhost:8788/oauth/callback`، أوامر `login/status/refresh/import/clear`) + `getValidAccessToken()`.
   - `youtube-publish.cjs` — رفع **Resumable** على YouTube Data API v3 مع العنوان/الوصف/الهاشتاجات، فئة Education (27)، `--privacy`، `--dry-run`، `--from-tiktok-log` (يرفع آخر فيديو TikTok في نفس الـ run — الموصى به) أو توليد فيديو مستقل.
   - `youtube-published-log.json` (سجل منع الازدواج) + `package.json` + `README.md` (دليل إعداد جوجل خطوة بخطوة).
2. **`.github/workflows/daily-tiktok.yml`** — بعد خطوة TikTok: Bootstrap YouTube tokens + `youtube-publish.cjs --from-tiktok-log`. خطوة الـ commit أصبحت `if: ${{ !cancelled() }}` وتلتزم ملفات يوتيوب أيضاً (حتى لو فشل رفع يوتيوب، تتأمن التوكنز المدرسة).
3. **CHANGELOG.md** → v2.10.0.
4. **لماذا نفس الـ workflow:** الفيديو المولّد في `scripts/tiktok-publisher/output/` مُتجاهل في `.gitignore` — فلو كان workflow مستقلاً ما كان سيجد ملف الفيديو. الرفع يتم في نفس الـ runner مباشرة بعد التوليد.

### ⏳ ينتظر المستخدم (إعداد يدوي مرة واحدة — ~10 دقائق)
1. مشروع Google Cloud → تفعيل **YouTube Data API v3** → OAuth consent screen (scope `youtube.upload` + Test user) → Credentials → **OAuth Client ID (Web application)** مع redirect URI: `http://localhost:8788/oauth/callback`.
2. محلياً: `node scripts/youtube-publisher/youtube-oauth.cjs login` (بالمتصفح) → يخزّن `youtube-tokens.json`.
3. GitHub Secrets (5): `YT_CLIENT_ID`, `YT_CLIENT_SECRET`, `YT_ACCESS_TOKEN`, `YT_REFRESH_TOKEN`, `YT_EXPIRES_IN`.
   - التفاصيل: `scripts/youtube-publisher/README.md`.
4. بعدها أول تشغيل workflow يجدد الـ access token أوتوماتيك (`obtained_at=0`) ويرفع الفيديو.

### تنبيهات
- لا حاجة لـ API key — الرفع يتطلب OAuth2 حصراً.
- الفيديو عمودي 9:16 <3 دقائق → YouTube Shorts تلقائياً.
- يوتيوب لا يحتاج مراجعة App (خلافاً لـ TikTok) — تطبيق اختباري يعمل بحساب المستخدم.
- `git.exe` متاحة في `C:\MinGit\cmd\git.exe`. الـ repo متزامن عند `3fc15b1`.
- إضافة جديدة في Session 5 لم تُلتزم بعد — تُدفع بعد الإعداد (أو تُلتزم الآن والرفع ينتظر الـ secrets).