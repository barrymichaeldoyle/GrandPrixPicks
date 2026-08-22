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
 * Full crawl of every advertised URL, so a slow CI runner is the constraint
 * rather than the assertion count. Kept sequential in batches rather than all
 * at once: a hundred parallel requests measures our own rate limiting.
 */
const BATCH_SIZE = 8;

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

    const paths = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
      // The sitemap always names the production origin, so the path is what
      // travels: that is what lets the same spec run against localhost and
      // against prod without two sets of expectations.
      (match) => new URL(match[1]).pathname,
    );

    expect(paths.length, 'sitemap listed no URLs').toBeGreaterThan(0);
    expect(new Set(paths).size, 'sitemap contains duplicate URLs').toBe(
      paths.length,
    );

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
