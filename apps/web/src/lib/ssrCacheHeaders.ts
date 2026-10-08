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
 * Cloudflare gets its own header, `Cloudflare-CDN-Cache-Control`, rather than
 * an `s-maxage`: Cloudflare reads `s-maxage` as `proxy-revalidate` and will not
 * serve stale content beside it, so the first request after expiry waited on a
 * full render (`EXPIRED`) instead of being served from cache while the entry
 * refreshed (`UPDATING`). Browsers keep `max-age=0` and always revalidate.
 *
 * When the cookie cannot be read, the document is marked private. Sending no
 * header is not neutral here: the zone's cache rule falls back to Cloudflare's
 * default TTL for a response without one.
 */
export async function applySsrCacheControl({
  edgeMaxAge,
  staleWhileRevalidate,
}: {
  /** Seconds Cloudflare treats the document as fresh. */
  edgeMaxAge: number;
  /** Seconds after that it may serve the stale copy while refreshing it. */
  staleWhileRevalidate: number;
}): Promise<void> {
  let request: Request;
  try {
    request = getRequest();
  } catch {
    // No request context (tests, prerender) — caching is a progressive
    // enhancement, never worth failing the render.
    return;
  }
  let signedIn = true;
  try {
    signedIn = await isClerkSessionPresent(request);
  } catch {
    // Fail closed: an unreadable cookie is treated as signed in.
  }
  if (signedIn) {
    setResponseHeader('Cache-Control', 'private, no-store');
    setResponseHeader('Cloudflare-CDN-Cache-Control', 'no-store');
    return;
  }
  setResponseHeader('Cache-Control', 'public, max-age=0');
  setResponseHeader(
    'Cloudflare-CDN-Cache-Control',
    `max-age=${edgeMaxAge}, stale-while-revalidate=${staleWhileRevalidate}`,
  );
}
