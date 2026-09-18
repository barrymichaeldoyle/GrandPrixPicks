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

/** One sitemap entry that carries a real `lastmod`. */
export type SitemapEntry = { loc: string; lastmod: string };

/**
 * The `<url>` blocks of a sitemap that declare a `lastmod`.
 *
 * Entries without one are dropped rather than treated as "changed now": the
 * sitemap gives `lastmod` only where a real date exists to give, so its absence
 * means the page has no review stamp to compare against, not that it is new.
 */
export function parseSitemapEntries(xml: string): SitemapEntry[] {
  const entries: SitemapEntry[] = [];
  for (const block of xml.match(/<url>[\s\S]*?<\/url>/g) ?? []) {
    const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim();
    const lastmod = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]?.trim();
    if (loc && lastmod) {
      entries.push({ loc, lastmod });
    }
  }
  return entries;
}

/**
 * Does a published result or practice classification already ping this URL?
 *
 * The sweep exists for the pages nothing else announces. Every URL in
 * {@link indexNowUrlsForPublishedResult} and
 * {@link indexNowUrlsForPublishedPractice} is submitted the moment it changes,
 * so including it here would spend quota asking Bing to recrawl a page it was
 * told about an hour ago.
 */
export function isCoveredByPublishPing(loc: string): boolean {
  // Parsed by hand rather than with `URL`, which this package's lib target
  // does not declare. Strip scheme and host, then the query, hash and any
  // trailing slash, so `/races/x`, `/races/x/` and `/races/x?a=1` agree.
  const path = loc
    .replace(/^[a-z][a-z0-9+.-]*:\/\/[^/]*/i, '')
    .replace(/[?#].*$/, '')
    .replace(/\/$/, '');

  return (
    path === '' ||
    path === '/races' ||
    path === '/f1-standings' ||
    path === '/f1-team-mate-battles' ||
    path === '/leaderboard' ||
    /^\/races\/[^/]+(\/practice)?$/.test(path)
  );
}

/** At most this many URLs per sweep, so a bad diff cannot burn the quota. */
export const INDEXNOW_SWEEP_LIMIT = 25;

/**
 * Split a sitemap into what to submit and what to remember.
 *
 * A URL seen for the first time is recorded but **not** submitted. Otherwise
 * the first sweep after this ships would submit every hand-edited page at once,
 * none of which changed, which is how a site gets its quota throttled. The
 * cost is that the sweep starts working from the first edit after it sees a
 * page, rather than claiming credit for edits made before it existed.
 */
export function indexNowSitemapDelta(
  entries: SitemapEntry[],
  known: ReadonlyMap<string, string>,
): { submit: SitemapEntry[]; record: SitemapEntry[] } {
  const firstSeen: SitemapEntry[] = [];
  const submit: SitemapEntry[] = [];

  for (const entry of entries) {
    if (isCoveredByPublishPing(entry.loc)) {
      continue;
    }

    const previous = known.get(entry.loc);
    if (previous === entry.lastmod) {
      continue;
    }

    if (previous === undefined) {
      firstSeen.push(entry);
    } else if (submit.length < INDEXNOW_SWEEP_LIMIT) {
      submit.push(entry);
    }
    // Past the cap the entry is neither submitted nor recorded, so it still
    // reads as changed on the next sweep. Recording it here would bank a stamp
    // that was never announced and lose the page for good.
  }

  // Only what was announced, plus the pages being learned for the first time.
  return { submit, record: [...firstSeen, ...submit] };
}
