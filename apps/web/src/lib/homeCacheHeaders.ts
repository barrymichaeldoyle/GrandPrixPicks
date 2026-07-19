import { createServerFn } from '@tanstack/react-start';
import { getRequest, setResponseHeader } from '@tanstack/react-start/server';

import { isClerkSessionPresent } from '../../server/lib/auth';

/**
 * Cache-Control for the home page's SSR HTML.
 *
 * The signed-out home document is identical for every visitor (the only
 * auth-dependent branch is driven by the Clerk cookie this same check reads),
 * so shared caches may hold it briefly — this is what lets an edge cache
 * absorb the Convex round trip that dominates time to first byte. Signed-in
 * responses are marked private/no-store so no shared cache can ever serve one
 * visitor's page to another. Requires a Cloudflare Cache Rule that respects
 * origin cache-control for `/` to take effect at the edge; harmless without.
 */
const applyHomeCacheHeaders = createServerFn({ method: 'GET' }).handler(
  async (): Promise<void> => {
    try {
      if (isClerkSessionPresent(getRequest())) {
        setResponseHeader('Cache-Control', 'private, no-store');
      } else {
        setResponseHeader(
          'Cache-Control',
          'public, max-age=0, s-maxage=60, stale-while-revalidate=300',
        );
      }
    } catch {
      // No request context (tests, prerender) — caching is a progressive
      // enhancement, never worth failing the render.
    }
  },
);

/** No-ops on the client: headers only exist during the SSR pass. */
export async function setHomeCacheHeaders(): Promise<void> {
  if (typeof window !== 'undefined') {
    return;
  }
  await applyHomeCacheHeaders();
}
