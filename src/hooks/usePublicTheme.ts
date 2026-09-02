import { useCallback, useEffect, useState } from 'react';

export type PublicTheme = 'light' | 'dark';

export const PUBLIC_THEME_STORAGE_KEY = 'mohamidigital_theme';
export const MOHAMI_THEME_KEY = 'mohami_theme';

const isPublicTheme = (value: string | null): value is PublicTheme => value === 'light' || value === 'dark';

export const getInitialPublicTheme = (): PublicTheme => {
  if (typeof window === 'undefined') return 'dark';

  const saved = window.localStorage.getItem(MOHAMI_THEME_KEY) || window.localStorage.getItem(PUBLIC_THEME_STORAGE_KEY);
  if (isPublicTheme(saved)) return saved;

  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

export const applyPublicTheme = (theme: PublicTheme): void => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.dataset.publicTheme = theme;
  root.dataset.theme = theme;
  root.classList.toggle('theme-light', theme === 'light');
  root.classList.toggle('public-theme-light', theme === 'light');
  root.classList.toggle('public-theme-dark', theme === 'dark');
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;

  // Update all header buttons icons
  if (typeof document !== 'undefined') {
    const buttons = document.querySelectorAll('.uh-theme-toggle');
    buttons.forEach((b) => {
      b.innerHTML = theme === 'light' ? '🌙' : '☀️';
      b.setAttribute('title', theme === 'light' ? 'التبديل إلى الوضع الداكن' : 'التبديل إلى الوضع الفاتح');
    });
  }
};

export function usePublicTheme() {
  const [theme, setThemeState] = useState<PublicTheme>(getInitialPublicTheme);

  useEffect(() => {
    applyPublicTheme(theme);
    window.localStorage.setItem(PUBLIC_THEME_STORAGE_KEY, theme);
    window.localStorage.setItem(MOHAMI_THEME_KEY, theme);
  }, [theme]);

  // Listen to external theme changes (from static scripts or other tabs)
  useEffect(() => {
    const onExternalChange = (e: Event) => {
      const customEvent = e as CustomEvent<PublicTheme>;
      if (customEvent.detail && isPublicTheme(customEvent.detail)) {
        setThemeState(customEvent.detail);
      }
    };
    window.addEventListener('mohami_theme_change', onExternalChange);
    return () => window.removeEventListener('mohami_theme_change', onExternalChange);
  }, []);

  const setTheme = useCallback((nextTheme: PublicTheme) => {
    setThemeState(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => current === 'dark' ? 'light' : 'dark');
  }, []);

  return { theme, isDark: theme === 'dark', setTheme, toggleTheme };
}
