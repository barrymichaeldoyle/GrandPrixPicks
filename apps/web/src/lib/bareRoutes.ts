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
