import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The rules that have to hold for *every* page, checked against every page.
 *
 * Its sibling `seo-head.test.tsx` asserts what individual routes say — that
 * the home card names the next race, that follow lists are noindex. This file
 * asserts the properties none of them are allowed to break, and it exists
 * because the per-route form of that idea did not scale: the SERP-length rule
 * was written out once, applied to `/results-policy` alone, and four other
 * pages drifted to 164-184 characters without a single test going red.
 *
 * A rule that applies to every route belongs in a loop over every route.
 */

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: unknown) => options,
  Link: () => null,
  Outlet: () => null,
  useMatches: () => [],
  useRouterState: () => false,
  notFound: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('convex/browser', () => ({
  ConvexHttpClient: class {
    query = vi.fn();
  },
}));

vi.mock('@/integrations/convex/client', () => ({
  convexHttp: { query: vi.fn() },
}));

const SITE_URL = 'https://grandprixpicks.com';

/** Google truncates around 60 characters of title and 155 of description. */
const MAX_TITLE = 60;
const MAX_DESCRIPTION = 160;

type MetaTag = {
  content?: string;
  name?: string;
  property?: string;
  title?: string;
};

type Head = {
  links?: { href: string; rel: string }[];
  meta?: MetaTag[];
  scripts?: { children: string; type: string }[];
};

/**
 * Every indexable route, with whatever its `head()` needs to run.
 *
 * `loaderData` is real data, not a stub, wherever the route has a fixture to
 * hand: a guide fed from `listGuides()` proves the actual published article
 * schema rather than a shape invented for the test.
 */
const ROUTES: {
  args?: unknown;
  loader?: () => Promise<unknown>;
  module: string;
  path: string;
}[] = [
  { module: './about', path: '/about' },
  { module: './how-to-play', path: '/how-to-play' },
  { module: './guides/index', path: '/guides' },
  { module: './circuits/index', path: '/circuits' },
  {
    module: './f1-standings',
    path: '/f1-standings',
    args: { loaderData: { standings: null } },
  },
  { module: './leaderboard', path: '/leaderboard' },
  { module: './leagues/index', path: '/leagues' },
  { module: './results-policy', path: '/results-policy' },
  { module: './f1-2027-calendar', path: '/f1-2027-calendar' },
  { module: './terms', path: '/terms' },
  { module: './privacy', path: '/privacy' },
  { module: './refund-policy', path: '/refund-policy' },
  {
    module: './index',
    path: '/',
    args: { loaderData: { nextRace: { slug: 'netherlands-2026' } } },
  },
  {
    module: './guides/$guideSlug',
    path: '/guides/f1-sprint-weekends-explained',
    loader: async () => {
      const { getGuide } = await import('@/lib/guides');
      return {
        loaderData: { guide: getGuide('f1-sprint-weekends-explained') },
        params: { guideSlug: 'f1-sprint-weekends-explained' },
      };
    },
  },
];

async function headFor(entry: (typeof ROUTES)[number]): Promise<Head> {
  const module = (await import(/* @vite-ignore */ entry.module)) as {
    Route: { head: (args?: unknown) => Head };
  };
  const args = entry.loader ? await entry.loader() : entry.args;
  return module.Route.head(args);
}

function titleOf(head: Head) {
  return head.meta?.find((tag) => tag.title !== undefined)?.title;
}

function contentOf(head: Head, name: string) {
  return head.meta?.find((tag) => tag.name === name)?.content;
}

describe('SEO invariants across every indexable route', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  for (const entry of ROUTES) {
    describe(entry.path, () => {
      it('keeps its title and description inside SERP limits', async () => {
        const head = await headFor(entry);
        const title = titleOf(head);
        const description = contentOf(head, 'description');

        expect(title, 'missing <title>').toBeTruthy();
        expect(title!.length).toBeLessThanOrEqual(MAX_TITLE);
        expect(description, 'missing meta description').toBeTruthy();
        expect(description!.length).toBeLessThanOrEqual(MAX_DESCRIPTION);
      });

      it('is indexable and canonicalises to itself', async () => {
        const head = await headFor(entry);

        // A route listed here is one we want in the index. If it needs to
        // become noindex, take it out of this list in the same change — the
        // pairing is the point, because a page that is noindex *and* in the
        // sitemap is the failure mode neither half catches alone.
        expect(contentOf(head, 'robots')).toBeUndefined();
        expect(head.links).toEqual([
          { rel: 'canonical', href: `${SITE_URL}${entry.path}` },
        ]);
      });

      it('writes structured data a parser can read', async () => {
        const head = await headFor(entry);
        for (const script of head.scripts ?? []) {
          expect(script.type).toBe('application/ld+json');

          // `JSON.parse` is the whole point: a trailing comma or an undefined
          // interpolated into the object ships as a script tag that every
          // crawler silently discards, and nothing else in the suite reads
          // these strings at all.
          const parsed = JSON.parse(script.children) as Record<string, unknown>;
          expect(parsed['@context']).toBe('https://schema.org');

          const nodes = (parsed['@graph'] ?? [parsed]) as Record<
            string,
            unknown
          >[];
          expect(nodes.length).toBeGreaterThan(0);
          for (const node of nodes) {
            expect(node['@type'], JSON.stringify(node)).toBeTruthy();
          }
        }
      });
    });
  }

  /**
   * Per-type requirements, checked wherever that type appears.
   *
   * These are the properties Google treats as required for the rich result the
   * type is emitted for. Each one was absent in production at some point, and
   * absent silently: schema is written once and then never read again by
   * anything in the build.
   */
  const REQUIRED_BY_TYPE: Record<string, string[]> = {
    Article: ['headline', 'datePublished', 'dateModified', 'author'],
    BreadcrumbList: ['itemListElement'],
    FAQPage: ['mainEntity'],
    Organization: ['name', 'url', 'logo'],
    SportsEvent: ['name', 'startDate', 'location'],
  };

  it('gives every structured-data node the properties its type requires', async () => {
    const missing: string[] = [];

    for (const entry of ROUTES) {
      vi.resetModules();
      const head = await headFor(entry);
      for (const script of head.scripts ?? []) {
        const parsed = JSON.parse(script.children) as Record<string, unknown>;
        const nodes = (parsed['@graph'] ?? [parsed]) as Record<
          string,
          unknown
        >[];
        for (const node of nodes) {
          const required = REQUIRED_BY_TYPE[node['@type'] as string];
          if (!required) {
            continue;
          }
          for (const key of required) {
            if (node[key] === undefined) {
              missing.push(`${entry.path} ${node['@type']} is missing ${key}`);
            }
          }
        }
      }
    }

    expect(missing, missing.join('\n')).toEqual([]);
  });

  /**
   * The Organization entity is emitted on more than one page, and duplicated
   * definitions drift. `@id` is what makes that safe, so the test that matters
   * is that every copy really is the same copy.
   */
  it('describes the same Organization everywhere it appears', async () => {
    const seen: Record<string, unknown>[] = [];

    for (const entry of ROUTES) {
      vi.resetModules();
      const head = await headFor(entry);
      for (const script of head.scripts ?? []) {
        const parsed = JSON.parse(script.children) as Record<string, unknown>;
        const nodes = (parsed['@graph'] ?? [parsed]) as Record<
          string,
          unknown
        >[];
        for (const node of nodes) {
          if (node['@type'] === 'Organization') {
            seen.push(node);
          }
        }
      }
    }

    expect(seen.length).toBeGreaterThan(1);
    for (const node of seen) {
      expect(node['@id']).toBe(`${SITE_URL}/#organization`);
      expect(node).toEqual(seen[0]);
    }
  });
});
