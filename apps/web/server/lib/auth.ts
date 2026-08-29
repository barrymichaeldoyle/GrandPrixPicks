import { createClerkClient } from '@clerk/backend';

type AuthSessionClaims = {
  iss?: unknown;
  sub?: unknown;
};

type AuthenticatedClerkIdentity = {
  userId: string;
  subject: string;
  tokenIdentifier: string;
};

function getClerkServerClient() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error('Missing CLERK_SECRET_KEY');
  }

  return createClerkClient({
    secretKey,
    ...(process.env.CLERK_JWT_KEY && { jwtKey: process.env.CLERK_JWT_KEY }),
    ...(process.env.VITE_CLERK_PUBLISHABLE_KEY && {
      publishableKey: process.env.VITE_CLERK_PUBLISHABLE_KEY,
    }),
  });
}

function parseCookieHeader(header: string | null): Map<string, string> {
  const cookies = new Map<string, string>();
  if (!header) {
    return cookies;
  }
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) {
      continue;
    }
    const name = part.slice(0, eq).trim();
    if (name) {
      cookies.set(name, part.slice(eq + 1).trim());
    }
  }
  return cookies;
}

/**
 * Clerk suffixes its cookies with the first 8 base64url chars of the SHA-1 of
 * the publishable key (`__client_uat_<suffix>`), so one origin can host several
 * instances at once. Mirrors `getCookieSuffix` in `@clerk/shared`, which is not
 * re-exported from `@clerk/backend`.
 *
 * Web Crypto only, so this stays edge-safe on the Cloudflare worker.
 */
async function computeClerkCookieSuffix(publishableKey: string) {
  const digest = await crypto.subtle.digest(
    'SHA-1',
    new TextEncoder().encode(publishableKey),
  );
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .slice(0, 8);
}

let cookieSuffixPromise: Promise<string | null> | null = null;

function getClerkCookieSuffix(): Promise<string | null> {
  cookieSuffixPromise ??= (async () => {
    const publishableKey = process.env.VITE_CLERK_PUBLISHABLE_KEY;
    return publishableKey
      ? await computeClerkCookieSuffix(publishableKey)
      : null;
  })();
  return cookieSuffixPromise;
}

/**
 * Reads Clerk's `__client_uat` cookie — the durable, non-httpOnly "is there a
 * session" signal the client SDK keeps in sync (`0` = signed out, a positive
 * timestamp = signed in). Unlike {@link getAuthenticatedClerkIdentity}, this
 * needs no JWT validation or handshake, so it stays correct even when the
 * short-lived `__session` token is stale (e.g. a mobile tab resumed after the
 * token expired) — which is exactly when validating the token would wrongly
 * report signed-out and flash the signed-in UI.
 *
 * Only *this* instance's cookie counts. A browser that has visited the app
 * under another Clerk instance keeps that instance's `__client_uat_<suffix>`
 * cookie forever, and it never returns to `0` because no SDK on the page owns
 * it any more. Trusting any suffix made those stale cookies pin SSR to
 * "signed in" for a genuinely signed-out visitor, who then got the signed-in
 * dashboard against a Convex client with no identity.
 *
 * The unsuffixed cookie is the pre-suffix Clerk format, so it only counts when
 * this instance has no suffixed cookie on the request.
 */
/**
 * The `__client_uat` cookie name this instance actually writes, resolved
 * server-side so a browser-side reader does not have to hash the publishable
 * key before first paint.
 *
 * Null when the key is unset, in which case only the unsuffixed pre-suffix
 * cookie name applies — the same fallback {@link isClerkSessionPresent} uses.
 */
export async function getClerkSessionCookieName(): Promise<string | null> {
  const suffix = await getClerkCookieSuffix();
  return suffix ? `__client_uat_${suffix}` : null;
}

export async function isClerkSessionPresent(
  request: Request,
): Promise<boolean> {
  const cookies = parseCookieHeader(request.headers.get('cookie'));
  const suffix = await getClerkCookieSuffix();

  const suffixed = suffix ? cookies.get(`__client_uat_${suffix}`) : undefined;
  const value = suffixed ?? cookies.get('__client_uat');

  return Boolean(value) && value !== '0';
}

/**
 * The Clerk session JWT for a request, or null when there is not one.
 *
 * This is the token Convex itself verifies — Clerk is the OIDC provider in
 * `auth.config.ts` — so handing it to a `ConvexHttpClient` lets an SSR render
 * read as the viewer, with no extra call to Clerk and no new dependency.
 *
 * Deliberately *not* validated here. Convex validates it, and it is the only
 * party that has to: a token this function wrongly accepts buys nothing,
 * because Convex rejects it and the caller falls back to client fetching.
 * Validating locally would mean a JWKS fetch on the render path to reach the
 * same answer more slowly.
 *
 * Same suffix rule as {@link isClerkSessionPresent}: only this instance's
 * cookie counts, because a browser that has visited another Clerk instance
 * keeps that instance's cookie indefinitely.
 */
export async function getClerkSessionToken(
  request: Request,
): Promise<string | null> {
  const cookies = parseCookieHeader(request.headers.get('cookie'));
  const suffix = await getClerkCookieSuffix();

  const suffixed = suffix ? cookies.get(`__session_${suffix}`) : undefined;
  return suffixed ?? cookies.get('__session') ?? null;
}

export function buildConvexTokenIdentifier(params: {
  issuer?: string | null;
  subject?: string | null;
}): string | null {
  if (!params.issuer || !params.subject) {
    return null;
  }

  return `${params.issuer}|${params.subject}`;
}

/**
 * Resolves the authenticated Clerk userId for a request in Nitro route handlers.
 */
export async function getAuthenticatedClerkIdentity(
  request: Request,
): Promise<AuthenticatedClerkIdentity | null> {
  const requestState = await getClerkServerClient().authenticateRequest(
    request,
    {
      acceptsToken: 'session_token',
    },
  );

  const auth = requestState.toAuth();
  if (!auth?.userId) {
    return null;
  }

  const sessionClaims = auth.sessionClaims as AuthSessionClaims | null;
  const subject =
    typeof sessionClaims?.sub === 'string' ? sessionClaims.sub : auth.userId;
  const tokenIdentifier =
    buildConvexTokenIdentifier({
      issuer: typeof sessionClaims?.iss === 'string' ? sessionClaims.iss : null,
      subject,
    }) ?? subject;

  return {
    userId: auth.userId,
    subject,
    tokenIdentifier,
  };
}
