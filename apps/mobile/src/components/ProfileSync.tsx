import { api } from '../integrations/convex/api';
import { useConvexAuth, useMutation } from 'convex/react';
import { getLocales } from 'expo-localization';
import { useEffect, useRef } from 'react';

import { captureAnalyticsEvent } from '../lib/analytics';

/**
 * Creates the player's account row once Convex has their identity, and
 * reports the registration the one time it happens.
 *
 * Queries cannot write, so until a mutation runs `getOrCreateViewer` a new
 * account has no `users` row and every query reads it as signed out: the
 * weekend answers `sign_in` for each session and the home card shows the
 * whole weekend as locked. The web app has always done this in its own
 * `ProfileSync`; without it, someone who signed up on the phone and never
 * opened the site could not make a pick from the home screen.
 */
export function ProfileSync() {
  const { isAuthenticated } = useConvexAuth();
  const syncProfile = useMutation(api.users.syncProfile);
  const syncedRef = useRef(false);

  useEffect(() => {
    // Unlike a web page load, the app outlives a sign-out, so the next
    // account to sign in on this device needs its own sync.
    if (!isAuthenticated) {
      syncedRef.current = false;
      return;
    }
    if (syncedRef.current) {
      return;
    }
    syncedRef.current = true;
    syncProfile({
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      locale: getLocales()[0]?.languageTag,
    })
      .then((result) => {
        if (result.isNewSignup) {
          captureAnalyticsEvent('user_registered');
        }
      })
      .catch(() => {
        // Offline at launch: try again on the next auth change.
        syncedRef.current = false;
      });
  }, [isAuthenticated, syncProfile]);

  return null;
}
