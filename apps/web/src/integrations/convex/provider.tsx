import { ConvexProviderWithAuth } from 'convex/react';
import type { PropsWithChildren } from 'react';

import { useClerkConvexAuth } from './clerkAuth';
import { convex } from './client';
import { AppConvexQueryCache } from './queryCache';

/**
 * `ConvexProviderWithAuth` rather than `ConvexProviderWithClerk`: the latter is
 * the same component with a fixed Clerk adapter inside it, and that adapter
 * awaits `getToken` forever. See {@link useClerkConvexAuth}.
 */
export function AppConvexProvider({ children }: PropsWithChildren) {
  return (
    <ConvexProviderWithAuth client={convex} useAuth={useClerkConvexAuth}>
      <AppConvexQueryCache>{children}</AppConvexQueryCache>
    </ConvexProviderWithAuth>
  );
}
