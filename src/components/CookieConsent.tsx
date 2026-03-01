import { Link } from '@tanstack/react-router';
import posthog from 'posthog-js';
import { useState } from 'react';

import { Button } from './Button';

export function CookieConsent() {
  const [decided, setDecided] = useState(() => {
    if (typeof window === 'undefined') {
      return true;
    }
    if (!import.meta.env.VITE_POSTHOG_KEY) {
      return true;
    }
    return (
      posthog.has_opted_in_capturing() || posthog.has_opted_out_capturing()
    );
  });

  if (decided) {
    return null;
  }

  const accept = () => {
    posthog.opt_in_capturing();
    setDecided(true);
  };

  const decline = () => {
    posthog.opt_out_capturing();
    setDecided(true);
  };

  return (
    <div className="bg-surface-raised fixed inset-x-0 bottom-0 z-50 border-t border-border p-4">
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
