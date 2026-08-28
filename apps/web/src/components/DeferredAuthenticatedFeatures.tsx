import { useUser } from '@clerk/react';
import { isInternalAnalyticsEmail } from '@grandprixpicks/shared/analytics';
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
        // Clerk remains the source of profile data. PostHog only needs the
        // stable account id to join anonymous and authenticated activity.
        identifyAnalyticsUser(user.id, {
          internal: isInternalAnalyticsEmail(
            user.primaryEmailAddress?.emailAddress,
          ),
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
