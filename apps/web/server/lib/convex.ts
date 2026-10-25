import { ConvexHttpClient } from 'convex/browser';

/**
 * An unauthenticated Convex client for a server route.
 *
 * A fresh one per call: the routes that use it read public data, and keeping
 * it out of module scope means no route can later `setAuth` on a client that
 * another request is also holding. Throws when `VITE_CONVEX_URL` is unset,
 * which every caller already treated as a server fault.
 */
export function getServerConvexClient(): ConvexHttpClient {
  const convexUrl = process.env.VITE_CONVEX_URL;
  if (!convexUrl) {
    throw new Error('Missing VITE_CONVEX_URL');
  }
  return new ConvexHttpClient(convexUrl);
}
