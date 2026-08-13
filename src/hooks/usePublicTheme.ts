import { useCallback, useEffect, useState } from 'react';

export type PublicTheme = 'light' | 'dark';

export const PUBLIC_THEME_STORAGE_KEY = 'mohamidigital_theme';

const isPublicTheme = (value: string | null): value is PublicTheme => value === 'light' || value === 'dark';

export const getInitialPublicTheme = (): PublicTheme => {
  if (typeof window === 'undefined') return 'dark';

  const saved = window.localStorage.getItem(PUBLIC_THEME_STORAGE_KEY);
  if (isPublicTheme(saved)) return saved;

  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
};

export const applyPublicTheme = (theme: PublicTheme): void => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  root.dataset.publicTheme = theme;
  root.classList.toggle('public-theme-light', theme === 'light');
  root.classList.toggle('public-theme-dark', theme === 'dark');
  root.style.colorScheme = theme;
};

export function usePublicTheme() {
  const [theme, setThemeState] = useState<PublicTheme>(getInitialPublicTheme);

  useEffect(() => {
    applyPublicTheme(theme);
    window.localStorage.setItem(PUBLIC_THEME_STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = useCallback((nextTheme: PublicTheme) => {
    setThemeState(nextTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((current) => current === 'dark' ? 'light' : 'dark');
  }, []);

  return { theme, isDark: theme === 'dark', setTheme, toggleTheme };
}
