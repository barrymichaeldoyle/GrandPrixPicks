import { useAuth } from '@clerk/clerk-expo';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import { ConvexQueryCacheProvider } from 'convex-helpers/react/cache/provider';
import { ConvexProviderWithClerk } from 'convex/react-clerk';
import type { ReactNode } from 'react';

import { useMobileConfig } from '../../providers/mobile-config';

const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
const convexClient =
  typeof convexUrl === 'string' && convexUrl.length > 0
    ? new ConvexReactClient(convexUrl)
    : null;
const fallbackConvexClient = new ConvexReactClient(
  'https://placeholder.convex.cloud',
);

export function MobileConvexProvider({ children }: { children: ReactNode }) {
  const { clerkEnabled, convexEnabled } = useMobileConfig();
  const activeClient =
    convexEnabled && convexClient ? convexClient : fallbackConvexClient;

  if (clerkEnabled && convexEnabled && convexClient) {
    return (
      <ConvexProviderWithClerk client={activeClient} useAuth={useAuth}>
        <QueryCache>{children}</QueryCache>
      </ConvexProviderWithClerk>
    );
  }

  return (
    <ConvexProvider client={activeClient}>
      <QueryCache>{children}</QueryCache>
    </ConvexProvider>
  );
}

/**
 * Keeps recently-read queries subscribed after their last reader unmounts,
 * which is what lets the hooks in `./query` paint a popped-and-reopened screen
 * from cache. Must sit under a Convex provider, so both branches get one.
 */
function QueryCache({ children }: { children: ReactNode }) {
  return (
    <ConvexQueryCacheProvider expiration={5 * 60_000} maxIdleEntries={50}>
      {children}
    </ConvexQueryCacheProvider>
  );
}
