import { createClerkClient, verifyToken } from '@clerk/backend';

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
async function getClerkSessionToken(request: Request): Promise<string | null> {
  const cookies = parseCookieHeader(request.headers.get('cookie'));
  const suffix = await getClerkCookieSuffix();

  const suffixed = suffix ? cookies.get(`__session_${suffix}`) : undefined;
  return suffixed ?? cookies.get('__session') ?? null;
}

/**
 * How long after a session token expires its signature still vouches for the
 * session id inside it. Clerk's default inactivity limit is 7 days, and a
 * session ended before then fails the mint below anyway.
 */
const STALE_SESSION_GRACE_MS = 7 * 24 * 60 * 60 * 1000;
/** A token this close to expiry would expire on the way to Convex. */
const EXPIRY_MARGIN_MS = 10_000;

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const payload: unknown = JSON.parse(json);
    return typeof payload === 'object' && payload !== null
      ? (payload as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function sessionTokenExpiresAt(token: string): number | null {
  const exp = decodeJwtPayload(token)?.exp;
  return typeof exp === 'number' ? exp * 1000 : null;
}

/**
 * A session token Convex will accept right now: the cookie's own when it is
 * still live, otherwise a fresh one minted for the same session.
 *
 * The `__session` cookie is a ~60-second JWT that Clerk's client SDK refreshes
 * only while a tab is open, so on a phone tab resumed later it is nearly
 * always expired. Until October 2026 that meant the signed-in dashboard
 * server-rendered as a skeleton behind the "Loading your dashboard" curtain,
 * and the player waited for the auth runtime, a token and the Convex
 * subscriptions: a median LCP of 4.5 s on mobile against 1.2 s for a visitor
 * with no account.
 *
 * The expired token still proves which session it belonged to: its signature
 * is verified (`verifyToken`, with the expiry tolerated), and only then is
 * the session id trusted for one Backend API call that mints a new token.
 * A session that has since ended or been revoked fails that call. Every
 * failure returns null, which is the skeleton the page rendered before.
 */
export async function getFreshClerkSessionToken(
  request: Request,
): Promise<string | null> {
  const token = await getClerkSessionToken(request);
  if (!token) {
    return null;
  }
  const expiresAt = sessionTokenExpiresAt(token);
  if (expiresAt === null) {
    return null;
  }
  if (expiresAt - Date.now() > EXPIRY_MARGIN_MS) {
    return token;
  }
  return mintSessionToken(token);
}

async function mintSessionToken(expiredToken: string): Promise<string | null> {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    logMintFailure('no_secret_key');
    return null;
  }
  let sid: unknown;
  try {
    const verified = await verifyToken(expiredToken, {
      secretKey,
      ...(process.env.CLERK_JWT_KEY && { jwtKey: process.env.CLERK_JWT_KEY }),
      clockSkewInMs: STALE_SESSION_GRACE_MS,
    });
    // Returned, not thrown: a rejected token comes back as `{ errors }`.
    const rejection = (verified as { errors?: readonly unknown[] }).errors;
    if (rejection) {
      logMintFailure('verify', rejection[0]);
      return null;
    }
    sid = (verified.data as { sid?: unknown } | undefined)?.sid;
  } catch (error) {
    logMintFailure('verify', error);
    return null;
  }
  if (typeof sid !== 'string' || !sid) {
    logMintFailure('no_sid');
    return null;
  }
  try {
    const minted = await getClerkServerClient().sessions.getToken(sid);
    if (!minted.jwt) {
      logMintFailure('empty_jwt');
    }
    return minted.jwt || null;
  } catch (error) {
    // Expected for a session that has ended since the cookie was written.
    logMintFailure('get_token', error);
    return null;
  }
}

/**
 * Every failure above returns null and the page falls back to the client, so
 * nothing else would say why the dashboard still rendered as a skeleton.
 * Server-side Sentry does not run on Pages (`instrument.server.mjs` is loaded
 * only by the Node start script), so this goes to the Workers log, read with
 * `wrangler pages deployment tail`. The stage and the error, never the token.
 */
function logMintFailure(stage: string, error?: unknown) {
  console.warn('[auth] session token mint failed', {
    stage,
    error:
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : error === undefined
          ? null
          : String((error as { message?: unknown }).message ?? error),
  });
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
