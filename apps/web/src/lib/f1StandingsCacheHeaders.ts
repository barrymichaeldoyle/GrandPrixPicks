import { createServerFn } from '@tanstack/react-start';

import { applySsrCacheControl } from './ssrCacheHeaders';

/**
 * Cache-Control for the F1 championship standings SSR HTML.
 *
 * This page recomputes the whole season from every published result on each
 * request, yet its content only changes when an admin publishes a race or
 * sprint — at most once per weekend. It can therefore sit at the edge far
 * longer than the home page, with a generous stale window so a cache miss
 * never puts a crawler behind that Convex round trip.
 */
const applyF1StandingsCacheHeaders = createServerFn({ method: 'GET' }).handler(
  async (): Promise<void> => {
    await applySsrCacheControl(
      'public, max-age=0, s-maxage=600, stale-while-revalidate=86400',
    );
  },
);

/** No-ops on the client: headers only exist during the SSR pass. */
export async function setF1StandingsCacheHeaders(): Promise<void> {
  if (typeof window !== 'undefined') {
    return;
  }
  await applyF1StandingsCacheHeaders();
}
