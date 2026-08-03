import { createServerFn } from '@tanstack/react-start';

import { applySsrCacheControl } from './ssrCacheHeaders';

/**
 * Cache-Control for the home page's SSR HTML. Short-lived: the hero countdown
 * and next-race data move continuously through a weekend.
 */
const applyHomeCacheHeaders = createServerFn({ method: 'GET' }).handler(
  async (): Promise<void> => {
    await applySsrCacheControl(
      'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
    );
  },
);

/** No-ops on the client: headers only exist during the SSR pass. */
export async function setHomeCacheHeaders(): Promise<void> {
  if (typeof window !== 'undefined') {
    return;
  }
  await applyHomeCacheHeaders();
}
