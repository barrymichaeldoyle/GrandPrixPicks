import type { RefObject } from 'react';
import { useEffect, useState } from 'react';

import { MEDIA_MATCH_BREAKPOINT } from '../components/Header';

/**
 * Manages mobile menu open state and applies inert to main content when the menu
 * is open on mobile so focus stays in the header + menu.
 */
export function useMobileMenu(mainRef: RefObject<HTMLDivElement | null>) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const el = mainRef.current;
    if (!el) {
      return;
    }
    const targetEl = el;
    const mq = window.matchMedia(MEDIA_MATCH_BREAKPOINT);
    function applyInert() {
      if (mobileMenuOpen && mq.matches) {
        targetEl.setAttribute('inert', '');
      } else {
        targetEl.removeAttribute('inert');
      }
    }
    applyInert();
    mq.addEventListener('change', applyInert);
    return () => mq.removeEventListener('change', applyInert);
  }, [mobileMenuOpen, mainRef]);

  return {
    mobileMenuOpen,
    onMobileMenuOpenChange: setMobileMenuOpen,
  };
}
