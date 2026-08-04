import { getRequest, setResponseHeader } from '@tanstack/react-start/server';

import { isClerkSessionPresent } from '../../server/lib/auth';

/**
 * Sets `Cache-Control` on an SSR document that is identical for every
 * signed-out visitor.
 *
 * Signed-out responses may be held briefly by shared caches, which is what
 * lets an edge cache absorb the Convex round trip that dominates time to first
 * byte. Signed-in responses are marked private/no-store so no shared cache can
 * ever serve one visitor's page to another — the header rendering is the only
 * auth-dependent part of these documents, and it is driven by the same Clerk
 * cookie this check reads.
 *
 * Requires a Cloudflare Cache Rule that respects origin cache-control for the
 * route to take effect at the edge; harmless without one. That rule must also
 * *bypass* the cache when this instance's `__client_uat` cookie is non-zero.
 * `private, no-store` only stops the edge from storing a signed-in document —
 * a cache *lookup* never reaches this function, so without the bypass a
 * signed-in visitor is served the stored signed-out HTML and gets exactly the
 * auth flash the SSR read exists to prevent. `Vary: Cookie` cannot do this
 * job: Cloudflare ignores Vary for anything but `Accept-Encoding`.
 *
 * Bypass on the cookie's *value*, not its presence. Clerk leaves
 * `__client_uat=0` behind on every browser that has ever signed out, so a
 * presence check would lock those visitors out of the cache permanently —
 * see {@link isClerkSessionPresent}, which the rule has to mirror.
 *
 * @param publicCacheControl — the header value to use for signed-out visitors.
 */
export async function applySsrCacheControl(
  publicCacheControl: string,
): Promise<void> {
  try {
    if (await isClerkSessionPresent(getRequest())) {
      setResponseHeader('Cache-Control', 'private, no-store');
    } else {
      setResponseHeader('Cache-Control', publicCacheControl);
    }
  } catch {
    // No request context (tests, prerender) — caching is a progressive
    // enhancement, never worth failing the render.
  }
}
