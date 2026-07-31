import { useLocation } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';

/**
 * Scrolls the document back to the top after an actual route change.
 * `behavior: 'instant'` overrides the global `scroll-behavior: smooth` so a
 * navigation lands at the top immediately instead of animating the whole page.
 * Mounting or remounting the app shell at the same location is intentionally a
 * no-op — authentication providers can change without that being navigation.
 * Renders nothing.
 */
export function ScrollToTop() {
  const location = useLocation();
  const previousPathname = useRef(location.pathname);

  useEffect(() => {
    if (previousPathname.current === location.pathname) {
      return;
    }

    previousPathname.current = location.pathname;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  return null;
}
