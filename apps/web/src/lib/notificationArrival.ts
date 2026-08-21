/**
 * Did this page load come from a notification we sent to a known player?
 *
 * Every result email, reminder email and push deep link is addressed to
 * someone who already has an account, so a signed-out arrival on one of them is
 * a lapsed session, not a new visitor. Those two look identical to the app and
 * want opposite things: a first-time visitor should meet the page, a returning
 * player should meet the sign-in box, because nothing on the page answers their
 * question ("how did I do") until they are signed in.
 *
 * Keyed off the `utm_source` the links already carry rather than a new
 * parameter, so there is one fewer thing that can be forgotten when a
 * notification is added. Anything else — organic, social, a shared link — is a
 * visitor we should not interrupt.
 */
const PROMPTING_SOURCES = new Set(['email', 'push']);

export function isNotificationArrival(search: string): boolean {
  let source: string | null;
  try {
    source = new URLSearchParams(search).get('utm_source');
  } catch {
    return false;
  }
  return source !== null && PROMPTING_SOURCES.has(source);
}
