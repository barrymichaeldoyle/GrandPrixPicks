import { useLocation } from '@tanstack/react-router';
import { useEffect } from 'react';

/**
 * Scrolls the document back to the top when the route location changes.
 * `behavior: 'instant'` overrides the global `scroll-behavior: smooth` so a
 * navigation lands at the top immediately instead of animating the whole page.
 * Renders nothing.
 */
export function ScrollToTop() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);

  return null;
}
