import { useUser } from '@clerk/react';
import * as Sentry from '@sentry/tanstackstart-react';
import { useEffect, useRef } from 'react';

import { identifyAnalyticsUser, resetAnalyticsUser } from '@/lib/analytics';

import { ErrorBoundary } from './error/ErrorBoundary';
import { UpcomingPredictionBanner } from './UpcomingPredictionBanner/UpcomingPredictionBanner';

export function DeferredObservabilityUserSync() {
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

export function DeferredPredictionBanner() {
  return (
    <ErrorBoundary fallback={null}>
      <UpcomingPredictionBanner />
    </ErrorBoundary>
  );
}
