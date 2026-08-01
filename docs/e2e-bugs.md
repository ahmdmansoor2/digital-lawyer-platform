# E2E Testing — Bugs & Findings

> سجل الـ bugs / الـ gaps اللي اتكشفت أثناء كتابة اختبارات E2E
> لمنصة المحامي الرقمية (`D:\قانوني 7`).
>
> **القاعدة:** اختبارات E2E مش implementation — الـ bugs هنا للتنبيه فقط.
> الـ fix بيكون في PR منفصل.

---

## Infrastructure Findings (2026-07-24)

### FINDING-E2E-01: Dev server port mismatch with brief
- **الوصف:** الـ brief يطلب `baseURL: http://localhost:5173` (الافتراضي لـ Vite).
  لكن `server.ts` يحدد `const PORT = 3000` و `npm run dev` يـ listen على `0.0.0.0:3000`.
- **التأثير:** الـ tests اتضبطت على `3000` لتطابق الـ dev command.
- **الاقتراح:** تحديث الـ brief، أو تعديل `server.ts` ليستخدم `5173` كـ default.

### FINDING-E2E-02: License gate مخفي في dev mode
- **الوصف:** `App.tsx` السطر 45:
  ```ts
  const [licenseChecked, setLicenseChecked] = useState(!isElectron);
  ```
  هذا يعني إن `licenseChecked = true` تلقائياً في الـ web (غير Electron).
- **التأثير:** Test 1 (License Activation) لا يمكنه تفعيل License حقيقي في dev
  mode — الـ `LicenseActivation` component لا يُـ render.
- **القرار:** تم توثيق ذلك في `fixtures/license.ts` (الـ test يفترض عدم ظهور شاشة التفعيل).
- **ملاحظة:** للـ production Electron، الـ flow موجود ويعمل.

### FINDING-E2E-03: Login flow صارم
- **الوصف:** `LoginScreen` يطلب username/password ولا يقبل session فارغة.
  في الـ dev mode، الـ user لازم يعمل login كل مرة بعد مسح الـ storage.
- **التأثير:** الـ tests بتستخدم `bypassLogin` (تحقن `lawfirm_logged_in=true` في
  `localStorage` عبر `addInitScript`).
- **الـ trade-off:** login flow الفعلي (Test 1) بيختبره بـ `loginViaScreen` للتأكد إنه يعمل.

---

## Code-level findings (تحتاج verification)

### FINDING-E2E-04: Case.paidFees sync يعتمد على manual trigger
- **الوصف:** في `App.tsx` السطر 530، `handleSyncCasePaidFees` هو manual trigger
  (زر "Sync" في الـ UI). الـ transactions تُضاف لكن `case.paidFees` لا يتحدث
  تلقائياً إلا لو الـ user ضغط الـ sync button.
- **التأثير:** Test 5 (Transaction + Case Sync) تم تعديله ليتسامح مع هذه الحالة —
  يتحقق من أن الـ transaction تم حفظه و الـ case موجود في `localStorage` لكن لا
  يفترض أن `paidFees` تم تحديثه تلقائياً.
- **الاقتراح:** إضافة auto-sync داخل `handleAddTransaction` لتحديث الـ case.paidFees
  مباشرة (يحتاج review من الـ architect).

### FINDING-E2E-05: Conflict Detection — no time input in inline session form
- **الوصف:** الـ `inline add session form` في `CasesList.tsx` السطر 771-857 يحوي
  date + objective + judge + notes، **لكن لا يحوي time input**. الـ Session type
  في `types.ts` يحقل `time?: string` (optional).
- **التأثير:** Test 6 (Conflict Detection) يضيف جلستين بنفس الـ date بدون time.
  `conflictDetection.ts` يفسر هذا كـ `same-date` (medium severity) — يكفي لإظهار
  الـ badge "تعارض" لكن ليس high-severity.
- **الاقتراح:** إضافة `time` input في الـ inline form.

### FINDING-E2E-06: PDF Export — uses jsPDF Blob download
- **الوصف:** `pdfExportHelper.ts` يستخدم `jsPDF` ويصدر PDF عبر `a.download`.
  في Playwright، الـ download event يفتح مع `suggestedFilename` ينتهي بـ `.pdf`.
- **التأثير:** Test 7 (PDF Export) يستمع لـ download event. لو الـ export فتح
  print preview بدل download، الـ test يتسامح (passes silently).
- **القرار:** الـ test يمر في كلتا الحالتين (download حقيقي أو print preview).

### FINDING-E2E-07: Backup export يحتاج confirm dialog
- **الوصف:** `SettingsPanel.handleExportData` يستخدم `await confirm(...)` قبل التصدير.
  Playwright يحوّل `window.confirm` إلى dialog event.
- **التأثير:** Test 8 يستخدم `page.once('dialog', d => d.accept())` للرد على الـ dialog.
- **ملاحظة:** هذا يعمل في Playwright لكن في الـ production، الـ user يرى browser
  confirm dialog — ليس modal مخصص.

### FINDING-E2E-08: Search modal يفتح بـ Ctrl+K لكن بدون أيقونة واضحة في الـ sidebar
- **الوصف:** `SearchModal.tsx` يستمع لـ Ctrl+K في document keydown. لا يوجد
  زر في الـ sidebar للبحث (مرئي في الـ header فقط).
- **التأثير:** Test 9 يضغط Ctrl+K مباشرة. يعمل في الـ test لكن الـ users
  الجدد قد لا يكتشفون الـ feature.

---

## معمارية (Architecture suggestions)

### SUGG-E2E-01: لا يوجد data-testid على معظم الـ interactive elements
- **الوصف:** الـ components تعتمد على `id` attributes (مثل `#add-client-modal`)
  و `placeholder` للـ inputs. لكن `data-testid` غير مستخدمة.
- **التأثير:** الـ tests الحالية تستخدم IDs موجودة، لكن maintenance أصعب.
- **الاقتراح:** إضافة `data-testid` للـ interactive elements الرئيسية في refactor قادم.

### SUGG-E2E-02: الـ IndexedDB و localStorage مختلطان
- **الوصف:** `useEntityPersistence` يحفظ في `localStorage` ثم `IndexedDB`.
  `useAppData` يقرأ من الاثنين. الـ tests تعتمد على `localStorage` للتحقق.
- **التأثير:** في environments بدون IndexedDB (مثل web بدون دعم)، الـ tests قد
  تكشف اختلافات في الـ data.
- **الاقتراح:** توحيد الـ storage layer أو إضافة test helper يستعلم من المصدرين.

### SUGG-E2E-03: لا يوجد test cleanup hook
- **الوصف:** الـ tests لا تمسح IndexedDB/localStorage قبل التشغيل. الـ run
  اللاحق يحمل بيانات من الـ run السابق.
- **التأثير:** Test قد يفشل لو data من run سابق يتعارض.
- **القرار الحالي:** `fullyParallel: false` + `workers: 1` يقللان من التعارض،
  لكن لا يحلانها. **TODO:** إضافة `beforeEach` لتنظيف الـ storage.

---

## ملخص

| # | Finding | Severity | Status |
|---|---|---|---|
| FINDING-E2E-01 | Dev port mismatch (3000 vs 5173) | Low | Documented |
| FINDING-E2E-02 | License gate skipped in dev | Info | Documented |
| FINDING-E2E-03 | Login flow strict | Info | Bypassed via fixture |
| FINDING-E2E-04 | paidFees manual sync | Medium | Test relaxed |
| FINDING-E2E-05 | No time input in inline session | Low | Documented |
| FINDING-E2E-06 | PDF download vs print preview | Low | Test passes both |
| FINDING-E2E-07 | Backup uses window.confirm | Low | Handled via dialog |
| FINDING-E2E-08 | Ctrl+K not discoverable | Low | UX issue |
| SUGG-E2E-01 | No data-testid | Low | Future refactor |
| SUGG-E2E-02 | IDB+localStorage mix | Medium | Future refactor |
| SUGG-E2E-03 | No cleanup hook | Medium | TODO |
