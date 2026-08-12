import { convexQuery } from '@convex-dev/react-query';
import type { FunctionReference } from 'convex/server';

import { isTransientNetworkError } from '@/lib/retry';

/** Matches `withRetry`'s two retries, so three attempts in total. */
const MAX_RETRIES = 2;
/** Matches `withRetry`'s 250ms linear backoff. */
const RETRY_DELAY_MS = 250;

/**
 * Route-loader form of {@link convexQuery}, with the loader retry policy.
 *
 * Loaders used to call `convexHttp.query` directly. That is right for SSR and
 * wrong for everything after it: on a client navigation it opens a fresh HTTPS
 * request per query, ignoring the Convex WebSocket the page already holds, and
 * TanStack Router's default stale time of 0 means it happens again on every
 * single visit. Three POSTs to fetch the race calendar, then three more the
 * next time the reader comes back to it.
 *
 * Going through the query client instead gets both halves right. On the server
 * `ConvexQueryClient` still uses its own HTTP client, so SSR is unchanged. On
 * the client the read joins the WebSocket, and `convexQuery` pins
 * `staleTime: Infinity`, so a return visit is served from cache with no
 * request at all.
 *
 * The cache entry only stays *correct* while something observes it — an
 * unobserved entry has no subscription and, with an infinite stale time,
 * nothing would ever refresh it. So a route that primes a query here must also
 * read it in the component with `useQuery(routeQuery(...))`; that observer is
 * what keeps the subscription open, and its live value is what the component
 * should prefer over the loader's snapshot.
 *
 * `retry` reproduces `withRetry`: transient network failures only (an offline
 * blip, a request dropped by a fast navigation), never application errors.
 */
export function routeQuery<Query extends FunctionReference<'query'>>(
  ...args: Parameters<typeof convexQuery<Query>>
) {
  return {
    ...convexQuery<Query>(...args),
    // Called before the failure is counted, so `< 2` allows attempts 2 and 3.
    retry: (failureCount: number, error: Error) =>
      failureCount < MAX_RETRIES && isTransientNetworkError(error),
    retryDelay: (failureCount: number) => RETRY_DELAY_MS * (failureCount + 1),
  };
}
