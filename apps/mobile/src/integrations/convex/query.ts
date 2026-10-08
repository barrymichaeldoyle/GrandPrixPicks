import { useAuth } from '@clerk/expo';
import type { OptionalRestArgsOrSkip } from 'convex/react';
import { useConvexAuth } from 'convex/react';
import type { FunctionReference, FunctionReturnType } from 'convex/server';
import { getFunctionName } from 'convex/server';
import { useQuery as useCachedQuery } from 'convex-helpers/react/cache/hooks';
import { useEffect, useRef } from 'react';

import {
  choosePersistedOrLive,
  persistedQueryKey,
  readPersistedQuery,
  writePersistedQuery,
} from '../../lib/persistedQueries';

/**
 * Convex read hooks that survive a screen change, and a lost connection.
 *
 * Mirrors `apps/web/src/integrations/convex/query.ts` for the first part.
 * `convex/react`'s `useQuery` drops its subscription when the last reader
 * unmounts, and a native stack unmounts a screen the moment it is popped. The
 * cache-backed versions hold the subscription for a few minutes after the
 * last reader leaves, so a screen pushed a second time renders from the value
 * the client still has and keeps updating live.
 *
 * Mobile adds the second part: every value is also kept on the phone
 * (`lib/persistedQueries.ts`) and stands in while the live one has not
 * arrived. With no connection it never arrives, so a cold start offline shows
 * the last race, picks and boards instead of an empty screen; online it only
 * fills the first frames before the subscription answers.
 *
 * Read hooks come from here; `useMutation`, `useConvex` and the auth hooks
 * still come from `convex/react`.
 */
export { usePaginatedQuery } from 'convex-helpers/react/cache/hooks';

export function useQuery<Query extends FunctionReference<'query'>>(
  query: Query,
  ...queryArgs: OptionalRestArgsOrSkip<Query>
): FunctionReturnType<Query> | undefined {
  const live = useCachedQuery(query, ...queryArgs);

  // Who the stored values belong to. Clerk starts offline from its resource
  // cache, so this is known without a connection; until it is, nothing is
  // read or written.
  const { isLoaded, isSignedIn, userId } = useAuth();
  const viewer = !isLoaded ? null : isSignedIn ? (userId ?? null) : 'guest';

  // A signed-in viewer's queries answer as signed out until Convex has the
  // token. Those answers must not overwrite the viewer's stored values.
  const convexAuth = useConvexAuth();
  const authSettled = isSignedIn
    ? convexAuth.isAuthenticated
    : !convexAuth.isLoading;

  const args = queryArgs[0];
  const key =
    viewer === null || args === 'skip'
      ? null
      : persistedQueryKey(viewer, getFunctionName(query), args);

  // Read once per key, not per render: the parse is not free on a feed page.
  const storedRef = useRef<{ key: string | null; value: unknown }>({
    key: null,
    value: undefined,
  });
  if (storedRef.current.key !== key) {
    storedRef.current = {
      key,
      value: key === null ? undefined : readPersistedQuery(key),
    };
  }

  useEffect(() => {
    if (key !== null && authSettled && live !== undefined) {
      writePersistedQuery(key, live);
    }
  }, [authSettled, key, live]);

  return choosePersistedOrLive({
    live,
    stored: storedRef.current.value as FunctionReturnType<Query> | undefined,
    authSettled,
  });
}
