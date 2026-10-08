import { ClerkProvider } from '@clerk/expo';
import { resourceCache } from '@clerk/expo/resource-cache';
import { tokenCache } from '@clerk/expo/token-cache';
import type { ReactNode } from 'react';

import { useMobileConfig } from '../../providers/mobile-config';

export function MobileClerkProvider({ children }: { children: ReactNode }) {
  const { clerkEnabled, clerkPublishableKey } = useMobileConfig();

  if (!clerkEnabled || !clerkPublishableKey) {
    return <>{children}</>;
  }

  return (
    // `resourceCache` lets Clerk start from its last known session with no
    // connection. Without it an offline launch never learned who was signed
    // in, so the stored Convex reads keyed by viewer could not be shown.
    <ClerkProvider
      __experimental_resourceCache={resourceCache}
      publishableKey={clerkPublishableKey}
      tokenCache={tokenCache}
    >
      {children}
    </ClerkProvider>
  );
}
