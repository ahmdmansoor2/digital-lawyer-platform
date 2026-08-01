const fs = require('fs');
const path = 'src/components/SettingsPanel.tsx';
let s = fs.readFileSync(path, 'utf-8');

// Find the deactivate block by scanning for "هل أنت متأكد تماماً"
const startMarker = 'هل أنت متأكد تماماً من رغبتك في إلغاء تفعيل';
const startIdx = s.indexOf(startMarker);
if (startIdx === -1) { console.error('Start marker not found'); process.exit(1); }

// Walk back to find the start of the button containing this
let btnStart = -1;
for (let i = startIdx; i > 0; i--) {
  if (s.substring(i, i + 7) === '<button') { btnStart = i; break; }
}
if (btnStart === -1) { console.error('Button start not found'); process.exit(1); }

// Walk forward to find the </button> + closing of license sub-tab container
// Specifically find: "إلغاء تفعيل النسخة الحالية\n                </button>"
const endMarker = 'إلغاء تفعيل النسخة الحالية\n                </button>';
const endIdx = s.indexOf(endMarker, startIdx);
if (endIdx === -1) { console.error('End marker not found'); process.exit(1); }
const endIdxFull = endIdx + endMarker.length;

console.log('Block range:', btnStart, '→', endIdxFull, '(length:', endIdxFull - btnStart, ')');

const replacement = `<button
                  type="button"
                  onClick={() => {
                    const electronAPI = (window as any).electronAPI;
                    if (!electronAPI?.license) {
                      setDeactivateError('لا يمكن إلغاء التفعيل خارج بيئة التطبيق.');
                      return;
                    }
                    setShowDeactivateConfirm(true);
                  }}
                  className="w-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-black py-3 rounded-xl transition flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  إلغاء تفعيل النسخة الحالية
                </button>
              </div>
            </div>
          )}

          {/* مودال تأكيد إلغاء التفعيل */}
          {showDeactivateConfirm && (
            <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowDeactivateConfirm(false)}>
              <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                <h3 className="text-base font-black text-rose-700 mb-2 flex items-center gap-2">
                  <Trash2 className="w-5 h-5" />
                  تأكيد إلغاء تفعيل الترخيص
                </h3>
                <p className="text-xs text-slate-600 mb-5 leading-relaxed whitespace-pre-line">
                  هل أنت متأكد تماماً من رغبتك في إلغاء تفعيل ترخيص التطبيق الحالي؟

سيتم:
                  • مسح بيانات التفعيل من هذا الجهاز
                  • إعادة شاشة التفعيل في المرة القادمة
                  • عدم إمكانية استخدام التطبيق بدون رمز تفعيل جديد
                </p>
                <div className="flex gap-2">
                  <button onClick={() => setShowDeactivateConfirm(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold py-2.5 rounded-xl">
                    تراجع
                  </button>
                  <button onClick={async () => {
                      setShowDeactivateConfirm(false);
                      setDeactivateInfo('جاري إلغاء التفعيل...');
                      try {
                        const electronAPI = (window as any).electronAPI;
                        await electronAPI.license.deactivate();
                        setDeactivateInfo('تم إلغاء التفعيل بنجاح. أعد فتح التطبيق لتفعيل رمز جديد.');
                        setTimeout(() => { try { window.location.reload(); } catch {} }, 1500);
                      } catch (e: any) {
                        setDeactivateError('فشل إلغاء التفعيل: ' + (e?.message || String(e)));
                        setDeactivateInfo(null);
                      }
                    }}
                    className="flex-1 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold py-2.5 rounded-xl">
                    تأكيد الإلغاء
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* إشعار نجاح */}
          {deactivateInfo && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] bg-emerald-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl">
              {deactivateInfo}
            </div>
          )}
          {/* إشعار خطأ */}
          {deactivateError && (
            <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] bg-rose-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2">
              <span>⚠ {deactivateError}</span>
              <button onClick={() => setDeactivateError(null)} className="hover:opacity-70">✕</button>
            </div>
          )}`;

s = s.substring(0, btnStart) + replacement + s.substring(endIdxFull);
fs.writeFileSync(path, s, 'utf-8');
console.log('Replaced. New file size:', s.length);
console.log('Diff:', s.length - (111644 - (endIdxFull - btnStart)));