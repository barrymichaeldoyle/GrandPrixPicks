import { createServerFn } from '@tanstack/react-start';

import { applySsrCacheControl } from './ssrCacheHeaders';

/**
 * `Cache-Control` for the public pages, in two tiers.
 *
 * The edge rule that acts on these already exists and already works: it
 * respects origin cache-control and bypasses on a non-zero `__client_uat`,
 * including the `=0` a signed-out visitor keeps after signing out once. What
 * was missing was any route asking to be cached — only `/` and `/f1-standings`
 * did, so everything else answered `cf-cache-status: DYNAMIC` and paid a full
 * SSR render, per request, forever.
 *
 * Both tiers rely on {@link applySsrCacheControl} to send `private, no-store`
 * to a signed-in visitor, so a shared cache never holds a personalised
 * document. Only the signed-out rendering is ever stored.
 *
 * The long stale windows are deliberate, and they pair with the stale-chunk
 * reload in `staleChunk.ts`. A deploy does not purge these, so the first
 * visitor after one is served stale HTML that may name chunks which no longer
 * exist; `stale-while-revalidate` refreshes the entry in the background, the
 * failed import reloads that visitor, and the reload lands on the new HTML.
 * Stale-serving and self-healing, rather than a wait on the origin.
 */

/**
 * Pages whose content is fixed at build time — the legal pages, the game
 * explainers, the guides. These have no loader and touch no Convex; their
 * markup changes only when we deploy, so they can sit at the edge for a long
 * time and revalidate lazily.
 */
const applyStaticContentCacheHeaders = createServerFn({
  method: 'GET',
}).handler(async (): Promise<void> => {
  await applySsrCacheControl(
    'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400',
  );
});

/**
 * Pages built from race data. Sixty seconds matches `/`, and for the same
 * reason: a countdown and a finishing order both move during a weekend, and
 * the client's Convex subscription corrects the document a moment after
 * hydration anyway. The stale window is short enough that a session's results
 * are never far behind for the one paint before that happens.
 */
const applyRaceDataCacheHeaders = createServerFn({ method: 'GET' }).handler(
  async (): Promise<void> => {
    await applySsrCacheControl(
      'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
    );
  },
);

/** No-ops on the client: headers only exist during the SSR pass. */
export async function setStaticContentCacheHeaders(): Promise<void> {
  if (typeof window !== 'undefined') {
    return;
  }
  await applyStaticContentCacheHeaders();
}

/** No-ops on the client: headers only exist during the SSR pass. */
export async function setRaceDataCacheHeaders(): Promise<void> {
  if (typeof window !== 'undefined') {
    return;
  }
  await applyRaceDataCacheHeaders();
}
