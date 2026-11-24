import { PushRegistrationSync } from '@/components/PushRegistrationSync';
import { useAuth } from '@clerk/react';
import { api } from '@convex-generated/api';
import { useMutation } from 'convex/react';
import type { PropsWithChildren } from 'react';
import { useEffect, useRef } from 'react';

import { AppConvexProvider } from '@/integrations/convex/provider';

import { AppClerkProvider } from './provider';
import { useClerkRuntimeControl } from './runtime-control';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { getDeviceTimeZone } from '@/lib/date';
import { ObservabilityUserSync } from '@/components/DeferredAuthenticatedFeatures';

export function AuthenticatedAppRuntime({
  children,
  assumeSignedIn = false,
}: PropsWithChildren<{ assumeSignedIn?: boolean }>) {
  return (
    <AppClerkProvider darkMode={true} assumeSignedIn={assumeSignedIn}>
      <AppConvexProvider>
        <ObservabilityUserSync />
        <ProfileSync />
        <PushRegistrationSync />
        <SignOutReporter />
        {children}
      </AppConvexProvider>
    </AppClerkProvider>
  );
}

/**
 * Tells the root a session that was live has ended, so it can return a
 * Clerk-free route to its anonymous tree. Only a signed-in to signed-out
 * change counts: Clerk reporting signed out while it boots is not a sign-out.
 */
function SignOutReporter() {
  const { isLoaded, isSignedIn } = useAuth();
  const { signedOut } = useClerkRuntimeControl();
  const wasSignedInRef = useRef(false);

  useEffect(() => {
    if (!isLoaded) {
      return;
    }
    if (isSignedIn) {
      wasSignedInRef.current = true;
      return;
    }
    if (wasSignedInRef.current) {
      wasSignedInRef.current = false;
      signedOut();
    }
  }, [isLoaded, isSignedIn, signedOut]);

  return null;
}

/**
 * Syncs the user's Clerk profile to Convex once per app load, and reports the
 * account's registration the one time it happens.
 *
 * The signup is worth its own event because `auth_completed` cannot stand in
 * for it: a returning player fires that on every sign-in, so a funnel ending
 * there counts people who already had accounts as acquisition. The backend
 * decides, from the account row rather than from anything the client knows, so
 * a reload or a second device cannot report the same signup twice.
 */
function ProfileSync() {
  const { isSignedIn } = useAuth();
  const syncProfile = useMutation(api.users.syncProfile);
  const hasSynced = useRef(false);

  useEffect(() => {
    if (isSignedIn && !hasSynced.current) {
      hasSynced.current = true;
      void syncProfile({
        timezone: getDeviceTimeZone(),
        locale: navigator.language,
      }).then((result) => {
        if (result?.isNewSignup) {
          captureAnalyticsEvent('user_registered');
        }
      });
    }
  }, [isSignedIn, syncProfile]);

  return null;
}
