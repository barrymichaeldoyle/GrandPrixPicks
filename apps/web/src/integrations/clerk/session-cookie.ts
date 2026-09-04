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

/**
 * Delete `__client_uat` cookies that belong to a Clerk instance this app no
 * longer uses.
 *
 * These are write-once litter. Clerk suffixes the cookie per instance, and a
 * browser that has visited this origin under an older instance keeps that
 * instance's cookie at a live timestamp indefinitely: no SDK on the page owns
 * it, so nothing ever ticks it to `0` or expires it early. Readers here now
 * ignore them, so this is no longer a correctness fix — it removes the input
 * that produced the bug, so the next reader written by somebody who has not
 * read {@link hasClerkSessionCookie} has nothing to get wrong.
 *
 * The gate is deliberately narrow. It runs only when *this* instance's suffixed
 * cookie is present on the jar, because that is the one situation in which the
 * others are provably dead:
 *
 * - Another instance's suffixed cookie is not ours by definition.
 * - The unsuffixed name is the pre-suffix format. It is a legitimate fallback
 *   when this instance has no suffixed cookie, so it can only be dropped once
 *   we have seen ours. Deleting it in the fallback case would sign the visitor
 *   out of an app that had not migrated.
 *
 * With no name published (the key is unset, or no pre-paint script ran) nothing
 * is provable and nothing is touched.
 *
 * A cookie can only be expired from a path and domain that match how it was
 * set, which we cannot read back, so this writes the plausible combinations for
 * this origin. Failing to clear one costs nothing: the readers already ignore
 * it. Returns the names it attempted, for tests and for the console.
 */
export function expireForeignClerkSessionCookies(): string[] {
  if (typeof document === 'undefined') {
    return [];
  }

  const sessionCookieName = publishedSessionCookieName();
  if (!sessionCookieName) {
    return [];
  }

  const present = new Map<string, string>();
  for (const entry of document.cookie.split(';')) {
    const separator = entry.indexOf('=');
    if (separator === -1) {
      continue;
    }
    present.set(
      entry.slice(0, separator).trim(),
      entry.slice(separator + 1).trim(),
    );
  }

  // Our own cookie has to be here, or none of the others are provably dead.
  if (!present.has(sessionCookieName)) {
    return [];
  }

  const stale = [...present.keys()].filter(
    (name) => name.startsWith('__client_uat') && name !== sessionCookieName,
  );

  for (const name of stale) {
    for (const domain of expiryDomains()) {
      document.cookie = `${name}=; Max-Age=0; path=/${
        domain ? `; domain=${domain}` : ''
      }`;
    }
  }

  return stale;
}

function publishedSessionCookieName(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  const published = (window as unknown as Record<string, unknown>)[
    SESSION_COOKIE_NAME_GLOBAL
  ];
  return typeof published === 'string' && published ? published : null;
}

/**
 * The domains a cookie on this host could have been set for: the host itself,
 * the host with a leading dot, and the registrable domain both ways. Clerk sets
 * these on the parent domain so they are shared with its own subdomain, and an
 * expiry whose domain does not match the original is silently ignored.
 */
function expiryDomains(): (string | undefined)[] {
  const host = window.location.hostname;
  const domains = new Set<string | undefined>([undefined, host, `.${host}`]);

  const labels = host.split('.');
  if (labels.length > 2) {
    const registrable = labels.slice(-2).join('.');
    domains.add(registrable);
    domains.add(`.${registrable}`);
  }

  return [...domains];
}
