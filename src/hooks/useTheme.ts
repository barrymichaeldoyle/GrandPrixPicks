import { useEffect, useState } from 'react';

export const THEME_KEY = 'grand-prix-picks-theme';

function resolveTheme(themeKey: string): boolean {
  const saved = localStorage.getItem(themeKey);
  return saved === 'dark'
    ? true
    : saved === 'light'
      ? false
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function useTheme(themeKey = THEME_KEY) {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const sync = () => setIsDark(resolveTheme(themeKey));
    sync();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [themeKey]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.setAttribute(
      'data-theme',
      isDark ? 'dark' : 'light',
    );
  }, [isDark]);

  const setTheme = (dark: boolean) => {
    localStorage.setItem(themeKey, dark ? 'dark' : 'light');
    setIsDark(dark);
  };

  return { isDark, setTheme };
}
