import { Link } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';

import {
  captureAnalyticsEvent,
  capturePageView,
  hasOptedInToAnalytics,
  isAnalyticsConfigured,
  optInToAnalytics,
  optOutOfAnalytics,
} from '@/lib/analytics';

import { Button } from './Button/Button';

const COOKIE_CONSENT_KEY = 'gpp_cookie_consent_v1';

interface CookieConsentProps {
  forceVisible?: boolean;
}

function readStoredDecision(): boolean {
  if (!isAnalyticsConfigured()) {
    return true;
  }
  try {
    const stored = window.localStorage.getItem(COOKIE_CONSENT_KEY);
    if (stored === 'accepted' || stored === 'declined') {
      return true;
    }
  } catch {
    // Continue and fall back to PostHog opt-in state.
  }
  if (hasOptedInToAnalytics()) {
    try {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    } catch {
      // Ignore storage errors and continue.
    }
    return true;
  }
  return false;
}

export function CookieConsent({ forceVisible = false }: CookieConsentProps) {
  const bannerRef = useRef<HTMLDivElement>(null);
  // Start hidden and only read localStorage after mount: the server renders no
  // banner, so rendering it during hydration is a mismatch that makes React
  // throw away and re-render the whole tree (minified error #418).
  const [decided, setDecided] = useState(true);

  useEffect(() => {
    setDecided(readStoredDecision());
  }, []);

  useEffect(() => {
    if (!forceVisible && decided) {
      document.documentElement.style.setProperty(
        '--bottom-overlay-offset',
        '0px',
      );
      return;
    }

    const root = document.documentElement;
    const banner = bannerRef.current;
    if (!banner) {
      return;
    }

    function setOffset() {
      if (!banner) {
        return;
      }
      const nextOffset = Math.ceil(banner.getBoundingClientRect().height);
      root.style.setProperty('--bottom-overlay-offset', `${nextOffset}px`);
    }

    setOffset();
    const observer = new ResizeObserver(setOffset);
    observer.observe(banner);
    window.addEventListener('resize', setOffset);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', setOffset);
      root.style.setProperty('--bottom-overlay-offset', '0px');
    };
  }, [decided, forceVisible]);

  if (!forceVisible && decided) {
    return null;
  }

  function accept() {
    optInToAnalytics();
    try {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    } catch {
      // Ignore storage errors and continue.
    }
    // Recover first-visit analytics that were skipped while capturing was opted out.
    captureAnalyticsEvent('cookie_consent_accepted');
    capturePageView();
    setDecided(true);
  }

  function decline() {
    optOutOfAnalytics();
    try {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
    } catch {
      // Ignore storage errors and continue.
    }
    setDecided(true);
  }

  return (
    <div
      ref={bannerRef}
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface-raised p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-text-muted">
          We use cookies for anonymous analytics to improve the app.{' '}
          <Link to="/privacy" className="underline hover:text-text">
            Privacy policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="secondary" size="sm" onClick={decline}>
            Decline
          </Button>
          <Button variant="primary" size="sm" onClick={accept}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
