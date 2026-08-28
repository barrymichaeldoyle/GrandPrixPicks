import { useUser } from '@clerk/expo';
import { isInternalAnalyticsEmail } from '@grandprixpicks/shared/analytics';
import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

import {
  identifyAnalyticsUser,
  initAnalytics,
  loadAnalyticsConsent,
  resetAnalyticsUser,
  setAnalyticsConsent,
  subscribeToAnalyticsConsent,
} from '../lib/analytics';
import { useMobileConfig } from './mobile-config';

/**
 * Boots PostHog and ties the analytics identity to the Clerk session,
 * mirroring web: identify with the Clerk user id on sign-in, reset on
 * sign-out. Events themselves are captured at their call sites.
 */
export function AnalyticsProvider() {
  const [consent, setConsent] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToAnalyticsConsent(setConsent);
    void loadAnalyticsConsent().then((consent) => {
      if (consent === true) {
        initAnalytics();
      } else if (consent === null) {
        Alert.alert(
          'Help improve Grand Prix Picks?',
          'Allow anonymous product analytics so we can understand which features work and where players get stuck. You can change this later in Settings.',
          [
            {
              text: 'Not now',
              style: 'cancel',
              onPress: () => void setAnalyticsConsent(false),
            },
            {
              text: 'Allow analytics',
              onPress: () => void setAnalyticsConsent(true),
            },
          ],
          { cancelable: false },
        );
      }
    });
    return unsubscribe;
  }, []);

  const { clerkEnabled } = useMobileConfig();
  if (!clerkEnabled || consent !== true) {
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
        internal: isInternalAnalyticsEmail(
          user.primaryEmailAddress?.emailAddress,
        ),
      });
    } else if (identifiedIdRef.current !== null) {
      identifiedIdRef.current = null;
      resetAnalyticsUser();
    }
  }, [user]);

  return null;
}
