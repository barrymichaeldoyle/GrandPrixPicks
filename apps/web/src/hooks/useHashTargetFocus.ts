import { useRouterState } from '@tanstack/react-router';
import { useEffect } from 'react';

/**
 * Makes a hash target programmatically focusable and moves focus to it without
 * scrolling. Native fragment navigation often leaves keyboard users at the top
 * of the page because headings are not focusable. The router already restores
 * the scroll position; this must not call `scrollIntoView`.
 */
export function focusHashTarget(
  root: Pick<Document, 'getElementById'>,
  hash: string,
) {
  const id = decodeURIComponent(hash.replace(/^#/, ''));
  if (!id) {
    return null;
  }

  const target = root.getElementById(id);
  if (!(target instanceof HTMLElement)) {
    return null;
  }

  if (!target.hasAttribute('tabindex')) {
    target.tabIndex = -1;
  }
  target.focus({ preventScroll: true });
  return target;
}

export function useHashTargetFocus() {
  const hash = useRouterState({ select: (state) => state.location.hash });
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });

  useEffect(() => {
    const currentHash = hash || window.location.hash;
    if (!currentHash) {
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let timeoutId = 0;

    function attempt() {
      if (cancelled) {
        return;
      }
      const target = focusHashTarget(document, currentHash);
      if (target && document.activeElement === target) {
        return;
      }
      if (attempts++ >= 10) {
        return;
      }
      timeoutId = window.setTimeout(attempt, 50);
    }

    const frame = requestAnimationFrame(attempt);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      window.clearTimeout(timeoutId);
    };
  }, [hash, pathname]);
}
