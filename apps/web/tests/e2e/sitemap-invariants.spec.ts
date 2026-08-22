import { expect, test, type APIRequestContext } from '@playwright/test';

/**
 * What has to be true of every URL we advertise, checked against all of them.
 *
 * The sitemap is the one place the site makes a promise to a crawler, and the
 * four properties below are that promise: this URL exists, it wants indexing,
 * and it agrees it is itself. Nothing tested them. The existing sitemap check
 * asserts a seeded race slug appears in the XML, which proves generation works
 * and nothing about the pages named.
 *
 * The failure this guards is quiet by construction. Adding `noIndex: true` to a
 * route already listed in `staticEntries` deindexes a page while every other
 * test stays green: the route still renders, the sitemap still generates, and
 * the two only contradict each other somewhere in Search Console weeks later.
 *
 * Deliberately seeds nothing, so unlike the rest of the SEO suite this is safe
 * to point at production — which is where it is most useful, since these are
 * properties of the deployed response rather than of the source.
 */

const SITE_URL = 'https://grandprixpicks.com';

/**
 * Batched rather than all at once: a hundred parallel requests measures our own
 * rate limiting rather than the pages.
 */
const BATCH_SIZE = 8;

/**
 * Against a deployment, crawl everything. Against a dev server, sample.
 *
 * The full 77-URL crawl costs 16 seconds on production and twelve minutes on
 * `vite dev`, which compiles each route on first request. Twelve minutes is not
 * a slow test, it is a broken one: it pushed the whole suite past half an hour
 * and the Clerk-backed specs behind it started failing on expired sessions.
 *
 * Every race page is the same route rendered against different rows, so a
 * handful of them proves the route and the other thirty prove the seed data.
 * Sampling keeps every *distinct* page in the local run and hands the
 * exhaustive version to the environment where it is both cheap and meaningful:
 * the scheduled production smoke, which is the only place a stale sitemap or a
 * 404 can actually hurt anyone.
 */
const SAMPLED_RACE_PAGES = 4;

type PageFacts = {
  canonical: string | null;
  path: string;
  robots: string | null;
  status: number;
};

async function inspect(
  request: APIRequestContext,
  path: string,
): Promise<PageFacts> {
  const response = await request.get(path);
  const html = await response.text();
  return {
    path,
    status: response.status(),
    robots:
      /<meta[^>]+name="robots"[^>]+content="([^"]*)"/i.exec(html)?.[1] ?? null,
    canonical:
      /<link[^>]+rel="canonical"[^>]+href="([^"]*)"/i.exec(html)?.[1] ?? null,
  };
}

test.describe('[public] sitemap invariants', () => {
  test('every advertised URL is reachable, indexable and self-canonical', async ({
    request,
  }) => {
    const response = await request.get('/sitemap.xml');
    expect(response.status()).toBe(200);
    const xml = await response.text();

    const advertised = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      // The sitemap always names the production origin, so the path is what
      // travels: that is what lets the same spec run against localhost and
      // against prod without two sets of expectations.
      (match) => new URL(match[1]).pathname,
    );

    expect(advertised.length, 'sitemap listed no URLs').toBeGreaterThan(0);
    expect(new Set(advertised).size, 'sitemap contains duplicate URLs').toBe(
      advertised.length,
    );

    // Duplicate detection above runs on the whole list either way — it reads
    // the XML, not the pages, so it costs nothing.
    const isDeployment = Boolean(process.env.PLAYWRIGHT_BASE_URL);
    const racePages = advertised.filter((path) => path.startsWith('/races/'));
    const paths = isDeployment
      ? advertised
      : [
          ...advertised.filter((path) => !path.startsWith('/races/')),
          ...racePages.slice(0, SAMPLED_RACE_PAGES),
        ];

    const facts: PageFacts[] = [];
    for (let index = 0; index < paths.length; index += BATCH_SIZE) {
      facts.push(
        ...(await Promise.all(
          paths
            .slice(index, index + BATCH_SIZE)
            .map((path) => inspect(request, path)),
        )),
      );
    }

    // Collected into one report rather than failing on the first bad URL: when
    // a deploy breaks this it usually breaks a whole class of page, and seeing
    // all of them beats bisecting one 404 at a time.
    const problems = facts.flatMap((fact) => {
      const found: string[] = [];
      if (fact.status !== 200) {
        found.push(`${fact.path} returned ${fact.status}`);
      }
      if (fact.robots?.includes('noindex')) {
        found.push(
          `${fact.path} is in the sitemap but robots="${fact.robots}"`,
        );
      }
      const expected = `${SITE_URL}${fact.path}`;
      if (fact.canonical !== expected) {
        found.push(
          `${fact.path} canonicalises to ${fact.canonical ?? 'nothing'}, not itself`,
        );
      }
      return found;
    });

    expect(problems, problems.join('\n')).toEqual([]);
  });
});
