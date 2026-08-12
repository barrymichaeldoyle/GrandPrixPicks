import { ConvexQueryCacheProvider } from 'convex-helpers/react/cache/provider';
import type { PropsWithChildren } from 'react';

/**
 * Keeps recently-read Convex queries subscribed after their last reader
 * unmounts, which is what makes the hooks in `./query` paint instantly on a
 * return visit. Must sit under a Convex provider — it reads the client off
 * `useConvex()` — so every mount of one wraps its children in this.
 */
export function AppConvexQueryCache({ children }: PropsWithChildren) {
  return (
    <ConvexQueryCacheProvider
      // Long enough to cover the round trip a reader actually makes (bell ->
      // notifications -> leagues -> back), short enough that a tab left open
      // on one page stops paying for the rest of the app.
      expiration={5 * 60_000}
      // A bound on idle subscriptions so a long session of tab-hopping cannot
      // accumulate one socket subscription per page ever visited.
      maxIdleEntries={50}
    >
      {children}
    </ConvexQueryCacheProvider>
  );
}
