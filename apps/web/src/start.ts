import { clerkMiddleware } from '@clerk/tanstack-react-start/server';
import { createStart } from '@tanstack/react-start';

// On Cloudflare Pages, process.env is only populated when compatibility_flags
// in wrangler.toml include nodejs_compat_populate_process_env. jwtKey enables
// networkless JWT verification so Clerk doesn't call its API (avoiding HTTPError).
const clerkJwtKey =
  typeof process !== 'undefined' ? process.env.CLERK_JWT_KEY : undefined;

export const startInstance = createStart(() => {
  return {
    requestMiddleware: [
      clerkMiddleware(clerkJwtKey ? { jwtKey: clerkJwtKey } : {}),
    ],
  };
});
