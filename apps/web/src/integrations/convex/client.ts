import { ConvexReactClient } from 'convex/react';

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;

if (!CONVEX_URL) {
  console.error('missing environment variable CONVEX_URL');
}

export const convex = new ConvexReactClient(CONVEX_URL);
