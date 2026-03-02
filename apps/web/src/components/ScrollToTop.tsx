import { useLocation } from '@tanstack/react-router';
import type { RefObject } from 'react';
import { useEffect } from 'react';

/**
 * Scrolls the main content area to the top when the route location changes.
 * Uses the given scroll container ref so the scrollbar stays below the sticky header.
 * Renders nothing.
 */
export function ScrollToTop({
  scrollContainerRef,
}: {
  scrollContainerRef: RefObject<HTMLElement | null>;
}) {
  const location = useLocation();

  useEffect(() => {
    scrollContainerRef.current?.scrollTo(0, 0);
  }, [location.pathname, scrollContainerRef]);

  return null;
}
