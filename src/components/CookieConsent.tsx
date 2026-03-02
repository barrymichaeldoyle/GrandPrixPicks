import { Link } from '@tanstack/react-router';
import posthog from 'posthog-js';
import { useState } from 'react';

import { Button } from './Button';

const COOKIE_CONSENT_KEY = 'gpp_cookie_consent_v1';

interface CookieConsentProps {
  forceVisible?: boolean;
}

export function CookieConsent({ forceVisible = false }: CookieConsentProps) {
  const [decided, setDecided] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    if (!import.meta.env.VITE_POSTHOG_KEY) {
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
    if (posthog.has_opted_in_capturing()) {
      try {
        window.localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
      } catch {
        // Ignore storage errors and continue.
      }
      return true;
    }
    return false;
  });

  if (!forceVisible && decided) {
    return null;
  }

  function accept() {
    posthog.opt_in_capturing();
    try {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    } catch {
      // Ignore storage errors and continue.
    }
    // Recover first-visit analytics that were skipped while capturing was opted out.
    posthog.capture('cookie_consent_accepted');
    posthog.capture('$pageview');
    setDecided(true);
  }

  function decline() {
    posthog.opt_out_capturing();
    try {
      window.localStorage.setItem(COOKIE_CONSENT_KEY, 'declined');
    } catch {
      // Ignore storage errors and continue.
    }
    setDecided(true);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface-raised p-4">
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
