import { clerkClient } from '@clerk/tanstack-react-start/server';

/**
 * Resolves the authenticated Clerk userId for a request in Nitro route handlers.
 */
export async function getAuthenticatedClerkUserId(
  request: Request,
): Promise<string | null> {
  const requestState = await clerkClient().authenticateRequest(request, {
    acceptsToken: 'session_token',
  });

  return requestState.toAuth()?.userId ?? null;
}
