/**
 * IndexNow: tell search engines a URL changed instead of waiting to be
 * crawled. Bing, Yandex, Seznam and Naver consume it; **Google does not**, so
 * this speeds up the smaller engines only and is not a substitute for ranking
 * work.
 *
 * The key is deliberately public — the protocol authenticates by requiring the
 * same value to be readable at `https://<host>/<key>.txt`, which is what proves
 * the submitter controls the domain. Keep this constant and
 * `apps/web/public/fe59ce8012412892cdc47d54d7186edf.txt` in step; changing one without the other makes
 * every submission fail verification.
 */
export const INDEXNOW_KEY = 'fe59ce8012412892cdc47d54d7186edf';

/** Where the key file lives, relative to the site root. */
export const INDEXNOW_KEY_PATH = `/${INDEXNOW_KEY}.txt`;

export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

/**
 * The pages a published session actually changes.
 *
 * Publishing a result rewrites the race page, and it moves both championship
 * tables, the game leaderboard and the home page's recent-results block. The
 * calendar changes too, since a round flips to completed. Anything else on the
 * site is untouched, and submitting URLs that did not change is how a site
 * gets its IndexNow quota throttled.
 */
export function indexNowUrlsForPublishedResult(
  origin: string,
  raceSlug: string,
): string[] {
  const base = origin.replace(/\/$/, '');
  return [
    `${base}/races/${raceSlug}`,
    `${base}/races`,
    `${base}/f1-standings`,
    `${base}/f1-team-mate-battles`,
    `${base}/leaderboard`,
    `${base}/`,
  ];
}

/**
 * The pages a published practice session changes.
 *
 * Deliberately narrow. A practice classification rewrites its own page and the
 * race page that links to it, and touches nothing else: no championship table
 * moves, and no player is scored on practice.
 *
 * The practice page is the one that matters here, because it is the only URL
 * on the site whose *indexability* changes rather than its content. Before FP1
 * it renders a placeholder line and ships `noindex` (see the route's `head`);
 * the moment a classification lands it becomes a real page. Nothing else tells
 * a search engine that, so without this ping the flip is invisible until the
 * next organic crawl.
 */
export function indexNowUrlsForPublishedPractice(
  origin: string,
  raceSlug: string,
): string[] {
  const base = origin.replace(/\/$/, '');
  return [`${base}/races/${raceSlug}/practice`, `${base}/races/${raceSlug}`];
}
