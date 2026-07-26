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
 * route to take effect at the edge; harmless without one.
 *
 * @param publicCacheControl — the header value to use for signed-out visitors.
 */
export function applySsrCacheControl(publicCacheControl: string): void {
  try {
    if (isClerkSessionPresent(getRequest())) {
      setResponseHeader('Cache-Control', 'private, no-store');
    } else {
      setResponseHeader('Cache-Control', publicCacheControl);
    }
  } catch {
    // No request context (tests, prerender) — caching is a progressive
    // enhancement, never worth failing the render.
  }
}
