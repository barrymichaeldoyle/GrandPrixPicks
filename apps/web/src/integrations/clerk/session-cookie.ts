/**
 * Client-side read of Clerk's durable session cookie.
 *
 * This is the browser twin of `isClerkSessionPresent` in `server/lib/auth.ts`,
 * and it must stay in step with it: same cookie, same "empty or `0` means
 * signed out" rule. The server reads it to decide what SSR renders; this reads
 * it to decide what the client is allowed to speculatively fetch.
 *
 * Why a raw cookie read rather than `useInitialAuth`: this answers at module
 * scope, before React renders anything. Preloading the signed-in bundle is only
 * worth doing if the answer arrives early enough to beat hydration, and a hook
 * cannot do that.
 *
 * Clerk suffixes the cookie per instance on some setups (`__client_uat_xxxxx`),
 * so match the prefix rather than resolving the suffix — the suffix lookup is
 * async on the server and there is nothing to await here.
 *
 * Cosmetic and speculative only. A wrong answer costs one unnecessary (or one
 * missed) prefetch, never correctness: Clerk and Convex still gate real data.
 */
export function hasClerkSessionCookie(): boolean {
  if (typeof document === 'undefined') {
    return false;
  }

  return document.cookie.split(';').some((entry) => {
    const separator = entry.indexOf('=');
    if (separator === -1) {
      return false;
    }

    const name = entry.slice(0, separator).trim();
    if (!name.startsWith('__client_uat')) {
      return false;
    }

    const value = entry.slice(separator + 1).trim();
    return value !== '' && value !== '0';
  });
}
