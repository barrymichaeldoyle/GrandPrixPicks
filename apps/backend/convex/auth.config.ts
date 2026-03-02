import type { AuthConfig } from 'convex/server';

/**
 * Convex validates Clerk JWTs using this config.
 * Set CLERK_JWT_ISSUER_DOMAIN in the Convex Dashboard (from Clerk JWT template "convex" Issuer URL).
 */
export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: 'convex',
    },
  ],
} satisfies AuthConfig;
