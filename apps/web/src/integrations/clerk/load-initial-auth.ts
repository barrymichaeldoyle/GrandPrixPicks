import { isTransientNetworkError, withRetry } from '@/lib/retry';

import { fetchInitialAuth, type InitialAuth } from './initial-auth';
import { SESSION_COOKIE_NAME_GLOBAL } from './pre-paint-curtain';
import { hasClerkSessionCookie } from './session-cookie';

/**
 * The root loader's read of {@link fetchInitialAuth}, which must never throw.
 *
 * The server fn's handler already falls back to anonymous, but on a client
 * navigation the request itself can fail first (offline, a DNS blip, a blocker)
 * and reject with the browser's `TypeError: Failed to fetch`. Unguarded, that
 * rejection took down the root route and replaced every page with the fatal
 * `ErrorFallback`, for what is only a first-paint hint.
 *
 * One retry covers a blip. After that the browser answers for itself from the
 * same cookie the server reads, so a signed-in visitor is not downgraded to the
 * anonymous nav because one request dropped.
 */
export async function loadInitialAuth(): Promise<InitialAuth> {
  try {
    return await withRetry(() => fetchInitialAuth(), { retries: 1 });
  } catch (error) {
    if (!isTransientNetworkError(error)) {
      console.error('Initial auth unavailable', error);
    }
    return clientInitialAuth();
  }
}

function clientInitialAuth(): InitialAuth {
  const sessionCookieName =
    typeof window === 'undefined'
      ? null
      : (window as unknown as Record<string, unknown>)[
          SESSION_COOKIE_NAME_GLOBAL
        ];
  return {
    isSignedIn: hasClerkSessionCookie(),
    sessionCookieName:
      typeof sessionCookieName === 'string' ? sessionCookieName : null,
  };
}
