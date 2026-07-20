import { useAuth } from '@clerk/react';
import { api } from '@convex-generated/api';
import { useMutation } from 'convex/react';
import type { PropsWithChildren } from 'react';
import { useEffect, useRef } from 'react';

import { AppConvexProvider } from '@/integrations/convex/provider';

import { AppClerkProvider } from './provider';

export function AuthenticatedAppRuntime({ children }: PropsWithChildren) {
  return (
    <AppClerkProvider darkMode={true}>
      <AppConvexProvider>
        <ProfileSync />
        {children}
      </AppConvexProvider>
    </AppClerkProvider>
  );
}

/** Syncs the user's Clerk profile to Convex once per app load. */
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
      });
    }
  }, [isSignedIn, syncProfile]);

  return null;
}
