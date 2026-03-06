import { clerkMiddleware } from '@clerk/tanstack-react-start/server';
import { createStart } from '@tanstack/react-start';

// On Cloudflare Pages, process.env is only populated when compatibility_flags
// in wrangler.toml include nodejs_compat_populate_process_env. Explicitly
// passing secretKey + jwtKey ensures networkless JWT verification is used and
// Clerk doesn't call its JWKS API (which would throw HTTPError → 500).
const clerkOpts =
  typeof process !== 'undefined'
    ? {
        ...(process.env.CLERK_SECRET_KEY && {
          secretKey: process.env.CLERK_SECRET_KEY,
        }),
        ...(process.env.CLERK_JWT_KEY && {
          jwtKey: process.env.CLERK_JWT_KEY,
        }),
      }
    : {};

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [clerkMiddleware(clerkOpts)],
  };
});
