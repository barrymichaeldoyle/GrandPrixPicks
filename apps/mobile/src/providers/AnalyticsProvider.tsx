import { useUser } from '@clerk/clerk-expo';
import { useEffect, useRef } from 'react';

import {
  identifyAnalyticsUser,
  initAnalytics,
  resetAnalyticsUser,
} from '../lib/analytics';
import { useMobileConfig } from './mobile-config';

/**
 * Boots PostHog and ties the analytics identity to the Clerk session,
 * mirroring web: identify with the Clerk user id on sign-in, reset on
 * sign-out. Events themselves are captured at their call sites.
 */
export function AnalyticsProvider() {
  useEffect(() => {
    initAnalytics();
  }, []);

  const { clerkEnabled } = useMobileConfig();
  if (!clerkEnabled) {
    return null;
  }
  return <ClerkAwareAnalytics />;
}

function ClerkAwareAnalytics() {
  const { user } = useUser();
  const identifiedIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (user) {
      if (identifiedIdRef.current === user.id) {
        return;
      }
      identifiedIdRef.current = user.id;
      identifyAnalyticsUser(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName ?? undefined,
        username: user.username ?? undefined,
      });
    } else if (identifiedIdRef.current !== null) {
      identifiedIdRef.current = null;
      resetAnalyticsUser();
    }
  }, [user]);

  return null;
}
