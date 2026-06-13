import { ConvexHttpClient } from 'convex/browser';
import { ConvexReactClient } from 'convex/react';

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;

if (!CONVEX_URL) {
  console.error('missing environment variable CONVEX_URL');
}

/** Real-time client for components (subscriptions via useQuery). */
export const convex = new ConvexReactClient(CONVEX_URL);

/** One-shot HTTP client for SSR route loaders (no subscriptions). */
export const convexHttp = new ConvexHttpClient(CONVEX_URL);
