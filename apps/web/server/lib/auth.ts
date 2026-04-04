import { createClerkClient } from '@clerk/backend';

type AuthSessionClaims = {
  iss?: unknown;
  sub?: unknown;
};

export type AuthenticatedClerkIdentity = {
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
      issuer:
        typeof sessionClaims?.iss === 'string' ? sessionClaims.iss : null,
      subject,
    }) ?? subject;

  return {
    userId: auth.userId,
    subject,
    tokenIdentifier,
  };
}
