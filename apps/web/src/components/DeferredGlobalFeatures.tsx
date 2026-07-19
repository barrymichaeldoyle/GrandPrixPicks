import { useUser } from '@clerk/react';
import * as Sentry from '@sentry/tanstackstart-react';
import { useEffect, useRef } from 'react';

import { identifyAnalyticsUser, resetAnalyticsUser } from '@/lib/analytics';

import { AnnouncementBanner } from './AnnouncementBanner';
import { CookieConsent } from './CookieConsent';
import { ErrorBoundary } from './error/ErrorBoundary';
import { UpcomingPredictionBanner } from './UpcomingPredictionBanner/UpcomingPredictionBanner';

/**
 * Global features that do not need to compete with the initial page render.
 * This module is loaded from an idle-time client boundary in the root shell.
 */
export function DeferredShellFeatures() {
  return (
    <>
      <ObservabilityUserSync />
      <ErrorBoundary fallback={null}>
        <AnnouncementBanner />
      </ErrorBoundary>
      <CookieConsent />
    </>
  );
}

export function DeferredPredictionBanner() {
  return (
    <ErrorBoundary fallback={null}>
      <UpcomingPredictionBanner />
    </ErrorBoundary>
  );
}

/** Identifies signed-in Clerk users in observability tools and resets on sign-out. */
function ObservabilityUserSync() {
  const { user, isLoaded } = useUser();
  const prevIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    if (user) {
      if (prevIdRef.current !== user.id) {
        prevIdRef.current = user.id;
        Sentry.setUser({
          id: user.id,
          email: user.primaryEmailAddress?.emailAddress,
          username: user.username ?? undefined,
          name: user.fullName ?? undefined,
        });
        identifyAnalyticsUser(user.id, {
          email: user.primaryEmailAddress?.emailAddress,
          name: user.fullName,
          username: user.username,
        });
      }
    } else if (prevIdRef.current !== null) {
      prevIdRef.current = null;
      Sentry.setUser(null);
      resetAnalyticsUser();
    }
  }, [user, isLoaded]);

  return null;
}
