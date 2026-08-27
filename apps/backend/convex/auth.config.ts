import type { AuthConfig } from 'convex/server';

/**
 * Convex validates Clerk JWTs using this config.
 * Set CLERK_JWT_ISSUER_DOMAIN in the Convex Dashboard (from Clerk JWT template "convex" Issuer URL).
 */

const CLERK_ISSUER = process.env.CLERK_JWT_ISSUER_DOMAIN!;

/**
 * Two entries for one issuer, because there are two Clerk tokens in play and
 * both are ours:
 *
 * - The `convex` JWT template token (`aud: "convex"`), minted on demand by the
 *   client SDK. Every browser and mobile session authenticates with this, and
 *   the OIDC entry below is what matches it. Unchanged.
 * - Clerk's default session token, the one in the `__session` cookie. It
 *   carries no `aud` claim at all, so it can never match an entry that pins
 *   `applicationID`, and Convex rejected it with `NoAuthProvider`.
 *
 * The second entry is what makes a server render of the signed-in dashboard
 * possible. The template token exists only in the client SDK's memory, so an
 * SSR request cannot get one without a round trip to Clerk's Backend API to
 * mint it — a network call in front of every signed-in render, to arrive at an
 * identity the request is already carrying in a cookie. Accepting the cookie's
 * own token removes that hop. See `apps/web/src/routes/-dashboard/ssr.ts`.
 *
 * It has to be a `customJwt` entry rather than a second OIDC one, because
 * `applicationID` is required on the OIDC variant and optional only here.
 *
 * What this widens, stated plainly, since Convex's own docs call omitting
 * `applicationID` "often insecure": this entry validates issuer and signature
 * but not audience, so Convex accepts any token this Clerk instance signed
 * rather than only the two described above. The warning is aimed at shared
 * identity providers, where another tenant's token carries the same issuer;
 * this issuer is a dedicated Clerk instance serving this app alone, so the set
 * of tokens it widens to is the set we mint ourselves. A token from anyone
 * else's instance still fails on the issuer, and a forged one on the signature.
 *
 * The thing to remember: a JWT template added later for some other audience
 * would be accepted here too. If one is ever minted for a third party, this
 * entry must become audience-pinned in the same change.
 *
 * Identity is unaffected. `getViewer` resolves through
 * `findUserByClerkIdentity`, which tries `tokenIdentifier` and then `subject`,
 * and the Clerk subject (`user_…`) is identical in both tokens — so the same
 * person resolves to the same row whichever one they arrive with.
 */
export default {
  providers: [
    {
      domain: CLERK_ISSUER,
      applicationID: 'convex',
    },
    {
      type: 'customJwt',
      issuer: CLERK_ISSUER,
      jwks: `${CLERK_ISSUER}/.well-known/jwks.json`,
      algorithm: 'RS256',
    },
  ],
} satisfies AuthConfig;
