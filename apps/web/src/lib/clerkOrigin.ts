/**
 * The Clerk Frontend API origin, derived from the publishable key.
 *
 * Everything Clerk needs on a first sign-in comes from this host:
 * `clerk.browser.js`, `ui.browser.js`, `/v1/environment`, `/v1/client`, and the
 * sign-in UI chunks. None of it is requested until the visitor asks to sign in,
 * so without a preconnect the click pays for a DNS lookup and a TLS handshake
 * to a brand new origin before the first byte of Clerk moves.
 *
 * A publishable key is `pk_test_` / `pk_live_` followed by the base64 of
 * `<frontend-api-host>$`, which is why this can be resolved at build time
 * instead of hard-coding the dev and prod hosts in two places.
 */
export function clerkFrontendApiOrigin(
  publishableKey: string | undefined,
): string | null {
  if (!publishableKey) {
    return null;
  }
  const encoded = publishableKey.replace(/^pk_(test|live)_/, '');
  if (encoded === publishableKey) {
    return null;
  }

  let decoded: string;
  try {
    decoded = atob(encoded);
  } catch {
    return null;
  }

  const host = decoded.replace(/\$+$/, '');
  // A bare host with no scheme, no path and at least one dot. Anything else is
  // a key shape we do not recognise, and a bad preconnect is worse than none.
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host)) {
    return null;
  }

  return `https://${host}`;
}
