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
 * Reads Clerk's `__client_uat` cookie — the durable, non-httpOnly "is there a
 * session" signal the client SDK keeps in sync (`0` = signed out, a positive
 * timestamp = signed in). Unlike {@link getAuthenticatedClerkIdentity}, this
 * needs no JWT validation or handshake, so it stays correct even when the
 * short-lived `__session` token is stale (e.g. a mobile tab resumed after the
 * token expired) — which is exactly when validating the token would wrongly
 * report signed-out and flash the signed-in UI. Some instances suffix the
 * cookie (`__client_uat_<hash>`), so match either form.
 */
export function isClerkSessionPresent(request: Request): boolean {
  const cookies = parseCookieHeader(request.headers.get('cookie'));
  for (const [name, value] of cookies) {
    if (name === '__client_uat' || name.startsWith('__client_uat_')) {
      if (value && value !== '0') {
        return true;
      }
    }
  }
  return false;
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
