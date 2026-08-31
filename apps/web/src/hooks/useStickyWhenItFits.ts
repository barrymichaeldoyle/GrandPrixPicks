import { useEffect, useState } from 'react';

/** Matches the `top-[calc(var(--nav-height)+1rem)]` offset callers pin with. */
const TOP_GAP = 16;
/** Breathing room so a rail never sits flush against the viewport bottom. */
const BOTTOM_GAP = 8;

/**
 * Pins an element only while it fits under the header without being clipped.
 *
 * A sticky element taller than the viewport hides its own tail, and capping it
 * with `overflow-y: auto` introduces a nested scroller. So we measure instead:
 * short rails stick, long ones stay in normal flow and scroll with the page.
 */
export function useStickyWhenItFits<T extends HTMLElement>() {
  const [element, ref] = useState<T | null>(null);
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    if (!element) {
      return;
    }

    function measure() {
      if (!element) {
        return;
      }

      const navHeight =
        Number.parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue(
            '--nav-height',
          ),
        ) || 0;
      const available = window.innerHeight - navHeight - TOP_GAP - BOTTOM_GAP;
      // Zero height means the rail is hidden at this breakpoint, not that it fits.
      setIsSticky(
        element.offsetHeight > 0 && element.offsetHeight <= available,
      );
    }

    measure();

    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(measure);
    observer?.observe(element);
    window.addEventListener('resize', measure);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [element]);

  return [ref, isSticky] as const;
}
