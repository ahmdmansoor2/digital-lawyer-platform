import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { usePublicTheme } from '../hooks/usePublicTheme';

export default function PublicThemeToggle() {
  const { isDark, toggleTheme } = usePublicTheme();
  const nextLabel = isDark ? 'تفعيل الوضع الفاتح' : 'تفعيل الوضع الداكن';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`inline-flex h-10 items-center gap-2 rounded-xl border px-3 text-xs font-black transition focus:outline-none focus:ring-2 focus:ring-indigo-400/60 active:scale-[0.97] ${
        isDark
          ? 'border-white/15 bg-white/5 text-slate-200 hover:bg-white/10 hover:text-white'
          : 'border-slate-200 bg-white/80 text-slate-700 shadow-sm hover:bg-white hover:text-slate-950'
      }`}
      aria-label={nextLabel}
      title={nextLabel}
    >
      {isDark ? <Sun className="h-4 w-4 text-amber-300" aria-hidden="true" /> : <Moon className="h-4 w-4 text-indigo-600" aria-hidden="true" />}
      <span className="hidden sm:inline">{isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}</span>
    </button>
  );
}
