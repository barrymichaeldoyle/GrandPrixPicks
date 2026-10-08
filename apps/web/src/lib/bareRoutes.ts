/**
 * Pages that render without the site's shell: no header, no footer, no banners.
 *
 * The creator-poll POC (`docs/creator-poll-poc.md`) is built to sit on someone
 * else's site, either in an embed or on their own hostname. Wrapped in our nav
 * and our footer it stops being their page and becomes an advert with a poll in
 * it, which is the opposite of the thing being offered. The one credit line is
 * inside the page itself.
 *
 * Keep this list short. A page that belongs to Grand Prix Picks belongs in the
 * shell, including every page a player reaches from the nav.
 */
const BARE_PREFIXES = ['/poc/'];

export function isBareRoute(pathname: string): boolean {
  const path = pathname.toLowerCase();
  return BARE_PREFIXES.some((prefix) => path.startsWith(prefix));
}

/**
 * The page is open inside the mobile app's in-app browser.
 *
 * The app links to Support, the legal pages, the results policy and the race
 * write-ups with `?app=1`. Those are reading pages; the site's chrome around
 * them offers sign-in, leagues and the Season Pass, none of which the app has,
 * and a link to buy the pass outside the App Store is a review rejection
 * (guideline 3.1.1). So the shell drops, as on a bare route.
 *
 * A query parameter, never a cookie: the CDN caches signed-out HTML keyed on
 * the URL, so a cookie-driven variant would be served to whoever came next.
 */
export function isInAppView(searchStr: string): boolean {
  return new URLSearchParams(searchStr).get('app') === '1';
}
