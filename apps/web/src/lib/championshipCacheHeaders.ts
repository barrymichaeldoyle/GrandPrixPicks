import { createServerFn } from '@tanstack/react-start';

import { applySsrCacheControl } from './ssrCacheHeaders';

/**
 * Cache-Control for the SSR HTML of the championship tables: the real one at
 * `/f1-standings` and the qualifying-only one at `/f1-qualifying-standings`.
 *
 * Both recompute the whole season from every published result on each request,
 * yet their content only changes when an admin publishes a session — at most a
 * few times per weekend. They can therefore sit at the edge far longer than the
 * home page, with a generous stale window so a cache miss never puts a crawler
 * behind that Convex round trip.
 *
 * Adding a page here is only half the job: the edge Cache Rule in
 * `scripts/apply-cache-rules.mjs` lists the paths that are eligible at all, so
 * a new path has to be added there and the script re-run.
 */
const applyChampionshipCacheHeaders = createServerFn({ method: 'GET' }).handler(
  async (): Promise<void> => {
    await applySsrCacheControl(
      'public, max-age=0, s-maxage=600, stale-while-revalidate=86400',
    );
  },
);

/** No-ops on the client: headers only exist during the SSR pass. */
export async function setChampionshipCacheHeaders(): Promise<void> {
  if (typeof window !== 'undefined') {
    return;
  }
  await applyChampionshipCacheHeaders();
}
