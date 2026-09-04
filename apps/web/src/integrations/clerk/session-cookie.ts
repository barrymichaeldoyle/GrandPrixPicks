import { SESSION_COOKIE_NAME_GLOBAL } from './pre-paint-curtain';

/**
 * Client-side read of Clerk's durable session cookie.
 *
 * This is the browser twin of `isClerkSessionPresent` in `server/lib/auth.ts`,
 * and it must stay in step with it: same cookie, same suffix rule, same "empty
 * or `0` means signed out" rule. The server reads it to decide what SSR
 * renders; this reads it to decide whether the browser is holding a session the
 * server render missed.
 *
 * Why a raw cookie read rather than `useInitialAuth`: this answers at module
 * scope, before React renders anything. Preloading the signed-in bundle is only
 * worth doing if the answer arrives early enough to beat hydration, and a hook
 * cannot do that.
 *
 * **Only this instance's cookie counts.** Clerk suffixes the cookie per
 * instance (`__client_uat_<suffix>`), and a browser that has visited the app
 * under another instance keeps that instance's cookie forever — it never
 * returns to `0`, because no SDK on the page owns it any more. This used to
 * match on the `__client_uat` prefix alone, on the grounds that it was
 * cosmetic. It stopped being cosmetic when `AppRuntimeBoundary` started reading
 * it for `sessionMissedByServer`: a stale cookie then disagreed with a
 * correctly-signed-out SSR render, which is precisely the shape of a sign-in
 * the server missed. The visitor got "Signing you in" over the authenticated
 * dashboard, mounted against a Convex client with no identity, so its viewer
 * queries never resolved and the weekend card span forever with no way back to
 * the landing page. The server hit the identical bug and was fixed the same
 * way; this twin was left behind.
 *
 * The suffix is a hash of the publishable key, so resolving it is async and out
 * of reach of a synchronous read. The pre-paint script publishes the name the
 * server already resolved (see {@link SESSION_COOKIE_NAME_GLOBAL}); with no
 * name — the key is unset, or no such script ran — only the unsuffixed
 * pre-suffix cookie applies, matching the server's fallback.
 */
export function hasClerkSessionCookie(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  const sessionCookieName =
    typeof window === 'undefined'
      ? null
      : ((window as unknown as Record<string, unknown>)[
          SESSION_COOKIE_NAME_GLOBAL
        ] ?? null);

  let suffixed: string | null = null;
  let unsuffixed: string | null = null;

  for (const entry of document.cookie.split(';')) {
    const separator = entry.indexOf('=');
    if (separator === -1) {
      continue;
    }

    const name = entry.slice(0, separator).trim();
    const value = entry.slice(separator + 1).trim();

    if (sessionCookieName && name === sessionCookieName) {
      suffixed = value;
    } else if (name === '__client_uat') {
      unsuffixed = value;
    }
  }

  const value = suffixed ?? unsuffixed;
  return value !== null && value !== '' && value !== '0';
}
