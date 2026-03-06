import { createClerkClient } from '@clerk/backend';

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

/**
 * Resolves the authenticated Clerk userId for a request in Nitro route handlers.
 */
export async function getAuthenticatedClerkUserId(
  request: Request,
): Promise<string | null> {
  const requestState = await getClerkServerClient().authenticateRequest(
    request,
    {
      acceptsToken: 'session_token',
    },
  );

  return requestState.toAuth()?.userId ?? null;
}
