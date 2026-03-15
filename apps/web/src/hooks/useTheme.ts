import { useEffect, useState } from 'react';

export const THEME_KEY = 'grand-prix-picks-theme';
const THEME_CHANGE_EVENT = 'grand-prix-picks-theme-change';

function applyTheme(isDark: boolean) {
  document.documentElement.classList.toggle('dark', isDark);
  document.documentElement.setAttribute(
    'data-theme',
    isDark ? 'dark' : 'light',
  );
}

function getInitialTheme(themeKey: string): boolean {
  if (typeof window === 'undefined') {
    // Default to dark on SSR when no client preference is available yet.
    return true;
  }
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'dark') {
    return true;
  }
  if (attr === 'light') {
    return false;
  }
  return resolveTheme(themeKey);
}

function resolveTheme(themeKey: string): boolean {
  const saved = localStorage.getItem(themeKey);
  return saved === 'dark' ? true : saved === 'light' ? false : true;
}

export function useTheme(themeKey = THEME_KEY) {
  const [isDark, setIsDark] = useState(() => getInitialTheme(themeKey));

  useEffect(() => {
    function sync() {
      setIsDark(resolveTheme(themeKey));
    }

    function handleThemeChange(event: Event) {
      const nextThemeKey = (event as CustomEvent<string | undefined>).detail;
      if (nextThemeKey !== undefined && nextThemeKey !== themeKey) {
        return;
      }
      sync();
    }

    sync();
    window.addEventListener('storage', handleThemeChange);
    window.addEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    return () => {
      window.removeEventListener('storage', handleThemeChange);
      window.removeEventListener(THEME_CHANGE_EVENT, handleThemeChange);
    };
  }, [themeKey]);

  useEffect(() => {
    applyTheme(isDark);
  }, [isDark]);

  function setTheme(dark: boolean) {
    localStorage.setItem(themeKey, dark ? 'dark' : 'light');
    applyTheme(dark);
    setIsDark(dark);
    window.dispatchEvent(
      new CustomEvent(THEME_CHANGE_EVENT, { detail: themeKey }),
    );
  }

  return { isDark, setTheme };
}
