import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { THEME_KEY, useTheme } from './useTheme';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function renderThemeHooks() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  let first: ReturnType<typeof useTheme> | null = null;
  let second: ReturnType<typeof useTheme> | null = null;

  function FirstHarness() {
    first = useTheme();
    return null;
  }

  function SecondHarness() {
    second = useTheme();
    return null;
  }

  act(() => {
    root.render(
      <>
        <FirstHarness />
        <SecondHarness />
      </>,
    );
  });

  return {
    getFirst: () => first,
    getSecond: () => second,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.setAttribute('data-theme', 'dark');
  });

  afterEach(() => {
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  it('synchronizes multiple hook instances in the same tab', () => {
    localStorage.setItem(THEME_KEY, 'light');
    const { getFirst, getSecond, unmount } = renderThemeHooks();

    expect(getFirst()?.isDark).toBe(false);
    expect(getSecond()?.isDark).toBe(false);

    act(() => {
      getSecond()?.setTheme(true);
    });

    expect(getFirst()?.isDark).toBe(true);
    expect(getSecond()?.isDark).toBe(true);
    expect(localStorage.getItem(THEME_KEY)).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    unmount();
  });
});
