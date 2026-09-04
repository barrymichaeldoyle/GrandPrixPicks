import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * The rules that have to hold for every indexable route shape, checked against
 * every static route plus representative data for each dynamic route.
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
/**
 * A description far under the limit wastes the snippet rather than breaking
 * it, so this is a floor and not a hard rule: Bing's site scan is what
 * surfaced it, flagging pages whose descriptions gave a searcher less than the
 * SERP had room for. 120 is the shortest of the descriptions we were happy
 * with, not a number Google publishes. Padding a line to clear it defeats the
 * point; add a fact the reader needs, or the copy is better left short and
 * this floor is the thing to change.
 */
const MIN_DESCRIPTION = 120;

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
 * The race states whose copy is written by hand and therefore worth checking.
 *
 * A write-up's `head()` branches on `race.status`, so a fixture without one
 * only ever exercises the upcoming copy. That is how the finished
 * descriptions drifted to 80 characters unnoticed: you see that string for a
 * few weeks a year, months after writing it, and never while developing.
 */
const RACE_STATUSES = ['upcoming', 'finished', 'cancelled'] as const;

type RaceStatus = (typeof RACE_STATUSES)[number];

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
  /** Set on routes whose `head()` branches on `race.status`. */
  statuses?: readonly RaceStatus[];
  /** Set on the hand-written weekend write-ups. */
  writeup?: true;
}[] = [
  { module: './about', path: '/about' },
  { module: './how-to-play', path: '/how-to-play' },
  { module: './guides/index', path: '/guides' },
  { module: './circuits/index', path: '/circuits' },
  {
    module: './circuits/$circuitSlug',
    path: '/circuits/monza',
    loader: async () => {
      const { getCircuit } = await import('@grandprixpicks/shared/circuits');
      return {
        loaderData: { circuit: getCircuit('monza') },
        params: { circuitSlug: 'monza' },
      };
    },
  },
  {
    module: './f1-standings',
    path: '/f1-standings',
    args: { loaderData: { standings: null } },
  },
  { module: './leaderboard', path: '/leaderboard' },
  { module: './leagues/index', path: '/leagues' },
  {
    module: './races/index',
    path: '/races',
    args: { loaderData: { races: [], season: 2026 } },
  },
  { module: './results-policy', path: '/results-policy' },
  {
    module: './f1-team-mate-battles',
    path: '/f1-team-mate-battles',
    args: { loaderData: { battles: null } },
  },
  {
    module: './f1-predictions-this-weekend',
    path: '/f1-predictions-this-weekend',
    // The longest race name on the calendar, because the description
    // interpolates it and the SERP length rule is what this file exists for.
    args: {
      loaderData: {
        race: {
          name: 'Mexico City Grand Prix',
          raceStartAt: 1_793_026_800_000,
          round: 20,
          season: 2026,
          slug: 'mexico-2026',
          status: 'upcoming',
        },
      },
    },
  },
  {
    module: './f1-2026-italian-grand-prix-predictions',
    path: '/f1-2026-italian-grand-prix-predictions',
    statuses: RACE_STATUSES,
    writeup: true,
    args: {
      loaderData: {
        race: { raceStartAt: 1_788_699_600_000 },
      },
    },
  },
  {
    module: './f1-2026-bahrain-grand-prix-predictions',
    path: '/f1-2026-bahrain-grand-prix-predictions',
    statuses: RACE_STATUSES,
    writeup: true,
    args: {
      loaderData: {
        race: { raceStartAt: 1_791_097_200_000 },
      },
    },
  },
  {
    module: './f1-2026-singapore-grand-prix-predictions',
    path: '/f1-2026-singapore-grand-prix-predictions',
    statuses: RACE_STATUSES,
    writeup: true,
    args: {
      loaderData: {
        race: { raceStartAt: 1_791_720_000_000 },
      },
    },
  },
  {
    module: './f1-2026-azerbaijan-grand-prix-predictions',
    path: '/f1-2026-azerbaijan-grand-prix-predictions',
    statuses: RACE_STATUSES,
    writeup: true,
    args: {
      loaderData: {
        race: { raceStartAt: 1_790_420_400_000 },
      },
    },
  },
  {
    module: './f1-2026-madrid-grand-prix-predictions',
    path: '/f1-2026-madrid-grand-prix-predictions',
    statuses: RACE_STATUSES,
    writeup: true,
    args: {
      loaderData: {
        race: { raceStartAt: 1_789_304_400_000 },
      },
    },
  },
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

async function headFor(
  entry: (typeof ROUTES)[number],
  status?: RaceStatus,
): Promise<Head> {
  const module = (await import(/* @vite-ignore */ entry.module)) as {
    Route: { head: (args?: unknown) => Head };
  };
  const args = entry.loader ? await entry.loader() : entry.args;
  return module.Route.head(status ? withRaceStatus(args, status) : args);
}

/**
 * The same loader payload with the race forced into `status`.
 *
 * The race object is spread rather than mutated because `args` is shared
 * across the states in one route's loop, and a mutated fixture would leak the
 * last status into whichever assertion ran next.
 */
function withRaceStatus(args: unknown, status: RaceStatus) {
  const typed = args as { loaderData?: { race?: Record<string, unknown> } };
  return {
    ...typed,
    loaderData: {
      ...typed.loaderData,
      race: { ...typed.loaderData?.race, status },
    },
  };
}

function titleOf(head: Head) {
  return head.meta?.find((tag) => tag.title !== undefined)?.title;
}

function contentOf(head: Head, name: string) {
  return head.meta?.find((tag) => tag.name === name)?.content;
}

/**
 * Every typed node in a graph, however deeply nested.
 *
 * This walks rather than reading `@graph` directly, because reading only the
 * top level is how a broken node shipped while a test for exactly that node
 * was passing. The Monza write-up carried its SportsEvent as the `about` of a
 * WebPage, one level down, so the `location` requirement below never ran
 * against it and Search Console found the missing field instead.
 */
function typedNodes(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.flatMap(typedNodes);
  }
  if (value === null || typeof value !== 'object') {
    return [];
  }
  const node = value as Record<string, unknown>;
  const nested = Object.entries(node)
    .filter(([key]) => key !== '@context')
    .flatMap(([, child]) => typedNodes(child));
  return typeof node['@type'] === 'string' ? [node, ...nested] : nested;
}

describe('SEO invariants across every indexable route', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  for (const entry of ROUTES) {
    describe(entry.path, () => {
      // A route that branches on race status gets one case per state; the
      // rest run once, with whatever their fixture already says.
      for (const status of entry.statuses ?? [undefined]) {
        const label = status
          ? `keeps its ${status} title and description inside SERP limits`
          : 'keeps its title and description inside SERP limits';

        it(label, async () => {
          const head = await headFor(entry, status);
          const title = titleOf(head);
          const description = contentOf(head, 'description');

          expect(title, 'missing <title>').toBeTruthy();
          expect(title!.length).toBeLessThanOrEqual(MAX_TITLE);
          expect(description, 'missing meta description').toBeTruthy();
          expect(description!.length).toBeLessThanOrEqual(MAX_DESCRIPTION);

          // A cancelled race is held to the ceiling but not the floor. "The
          // 2026 Bahrain Grand Prix was called off." is the whole story, and
          // padding it to clear a minimum would be inventing copy to satisfy
          // a test, which `docs/product-voice.md` rules out.
          if (status !== 'cancelled') {
            expect(description!.length).toBeGreaterThanOrEqual(MIN_DESCRIPTION);
          }
        });
      }

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
   * A write-up is a page about one race, answering questions about it, and
   * both of those are rich results Google will only give a page that says so
   * in schema. The per-type block below checks a `SportsEvent` that exists;
   * this checks that it exists at all, on every weekend page, for every state
   * its `head()` branches on. Four of the five carried both from the start and
   * the fifth is one copy-paste away from carrying neither.
   */
  it('gives every race write-up a SportsEvent and an FAQPage', async () => {
    const missing: string[] = [];

    for (const entry of ROUTES.filter((route) => route.writeup)) {
      for (const status of entry.statuses ?? [undefined]) {
        vi.resetModules();
        const head = await headFor(entry, status);
        const types = (head.scripts ?? []).flatMap((script) =>
          typedNodes(JSON.parse(script.children)).map(
            (node) => node['@type'] as string,
          ),
        );
        for (const required of ['SportsEvent', 'FAQPage']) {
          if (!types.includes(required)) {
            missing.push(`${entry.path} (${status}) has no ${required}`);
          }
        }
      }
    }

    expect(missing, missing.join('\n')).toEqual([]);
  });

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
        for (const node of typedNodes(parsed)) {
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
