import { useAuth } from '@clerk/react';
import { api } from '@convex-generated/api';
import { useMutation } from 'convex/react';
import { useNavigate } from '@tanstack/react-router';
import type { PropsWithChildren } from 'react';
import { useEffect, useRef } from 'react';

import { AppConvexProvider } from '@/integrations/convex/provider';

import { AppClerkProvider } from './provider';
import { useClerkRuntimeControl } from './runtime-control';
import { captureAnalyticsEvent } from '@/lib/analytics';

export function AuthenticatedAppRuntime({
  children,
  assumeSignedIn = false,
}: PropsWithChildren<{ assumeSignedIn?: boolean }>) {
  return (
    <AppClerkProvider darkMode={true} assumeSignedIn={assumeSignedIn}>
      <AppConvexProvider>
        <ProfileSync />
        <AfterSignInIntentNavigator />
        {children}
      </AppConvexProvider>
    </AppClerkProvider>
  );
}

function AfterSignInIntentNavigator() {
  const { isSignedIn } = useAuth();
  const runtime = useClerkRuntimeControl();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isSignedIn || runtime.afterSignInPath === null) {
      return;
    }
    const destination = runtime.afterSignInPath;
    runtime.clearAfterSignInPath();
    captureAnalyticsEvent('landing_auth_completed', {
      source: 'landing',
      intent: 'create_league',
    });
    void navigate({ to: destination });
  }, [isSignedIn, navigate, runtime]);

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
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
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
