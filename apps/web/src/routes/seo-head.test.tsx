import { beforeEach, describe, expect, it, vi } from 'vitest';

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

type HeadResult = {
  links?: Array<{ href: string; rel: string }>;
  meta?: Array<{ content: string; name?: string; property?: string }>;
  scripts?: Array<{ children: string; type: string }>;
};

type StaticHeadRoute = {
  head: () => HeadResult;
};

type HomeHeadRoute = {
  head: (args: {
    loaderData?: { nextRace: { slug: string } | null };
  }) => HeadResult & { scripts?: Array<{ children: string; type: string }> };
};

type UsernameHeadRoute = {
  head: (args: { params: { username: string } }) => HeadResult;
};

type ProfileHeadRoute = {
  head: (args: {
    loaderData: {
      initialProfile: { displayName: string; username: string };
    };
    matches: Array<{ routeId: string }>;
    params: { username: string };
  }) => HeadResult | Record<string, never>;
};

type TeammateHeadRoute = {
  head: (args: {
    loaderData: {
      battles: {
        lastUpdated: number;
        teams: Array<{
          team: string;
          drivers: [
            { displayName: string; total: number },
            { displayName: string; total: number },
          ];
        }>;
      };
    };
  }) => HeadResult & {
    scripts?: Array<{ children: string; type: string }>;
  };
};

function asStaticHeadRoute(route: unknown): StaticHeadRoute {
  return route as StaticHeadRoute;
}

function asHomeHeadRoute(route: unknown): HomeHeadRoute {
  return route as HomeHeadRoute;
}

function asUsernameHeadRoute(route: unknown): UsernameHeadRoute {
  return route as UsernameHeadRoute;
}

function asProfileHeadRoute(route: unknown): ProfileHeadRoute {
  return route as ProfileHeadRoute;
}

function asTeammateHeadRoute(route: unknown): TeammateHeadRoute {
  return route as TeammateHeadRoute;
}

describe('SEO head metadata', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('keeps the public home metadata, canonical and app schema aligned', async () => {
    const [{ Route: homeRoute, PUBLIC_HOME_TITLE }, { CURRENT_SEASON }] =
      await Promise.all([import('./index'), import('@/lib/site')]);
    const head = asHomeHeadRoute(homeRoute).head({
      loaderData: { nextRace: { slug: 'netherlands-2026' } },
    }) as unknown as {
      links?: Array<{ href: string; rel: string }>;
      scripts?: Array<{ children: string; type: string }>;
      meta?: Array<{
        content?: string;
        name?: string;
        property?: string;
        title?: string;
      }>;
    };
    const title = head.meta?.find((tag) => tag.title)?.title;
    const description = head.meta?.find(
      (tag) => tag.name === 'description',
    )?.content;
    const graph = JSON.parse(head.scripts?.[0]?.children ?? '{}')['@graph'] as
      | Array<{
          '@type': string;
          name?: string;
          offers?: { price?: string };
        }>
      | undefined;
    const app = graph?.find((node) => node['@type'] === 'WebApplication');

    expect(title).toBe(PUBLIC_HOME_TITLE);
    expect(title).toContain(String(CURRENT_SEASON));
    expect(title?.length).toBeLessThanOrEqual(60);
    expect(description).toContain('Formula 1');
    expect(description?.length).toBeLessThanOrEqual(160);
    expect(head.links).toEqual([
      { rel: 'canonical', href: 'https://grandprixpicks.com/' },
    ]);
    expect(app).toMatchObject({
      '@type': 'WebApplication',
      name: 'Grand Prix Picks',
      offers: { price: '0' },
    });
  });

  // Scrapers cache an OG image by URL. If the home card lived at a stable
  // /og/next, WhatsApp and X would keep serving the previous Grand Prix for
  // weeks after it ran, so the slug has to stay in the URL.
  it('points the home OG card at the next race, and falls back off-season', async () => {
    const { Route: homeRoute } = await import('./index');
    const homeHead = asHomeHeadRoute(homeRoute);

    function ogImage(loaderData?: { nextRace: { slug: string } | null }) {
      return homeHead
        .head({ loaderData })
        .meta?.find((tag) => tag.property === 'og:image')?.content;
    }

    expect(ogImage({ nextRace: { slug: 'netherlands-2026' } })).toBe(
      'https://grandprixpicks.com/og/next?race=netherlands-2026',
    );
    expect(ogImage({ nextRace: { slug: 'italy-2026' } })).toContain(
      'race=italy-2026',
    );
    // Off-season, and during the SSR pass before the loader resolves.
    expect(ogImage({ nextRace: null })).toContain('/og-default.png');
    expect(ogImage(undefined)).toContain('/og-default.png');
  });

  // `/feed` used to be listed here. It is a redirect to the dashboard now, not
  // a page, so it has no head to assert on — nothing to index either way.
  it('marks gated pages as noindex with a single canonical', async () => {
    const [
      { Route: supportRoute },
      { Route: meRoute },
      { Route: settingsRoute },
    ] = await Promise.all([
      import('./support'),
      import('./me'),
      import('./settings'),
    ]);
    const routes: StaticHeadRoute[] = [
      asStaticHeadRoute(supportRoute),
      asStaticHeadRoute(meRoute),
      asStaticHeadRoute(settingsRoute),
    ];

    for (const [path, route] of [
      ['/support', routes[0]],
      ['/me', routes[1]],
      ['/settings', routes[2]],
    ] as const) {
      const head = route.head();
      expect(head.meta).toContainEqual({
        name: 'robots',
        content: 'noindex, follow',
      });
      expect(head.links).toEqual([
        { rel: 'canonical', href: `https://grandprixpicks.com${path}` },
      ]);
    }
  });

  it('makes the how-to-play guide indexable with its own canonical', async () => {
    const { Route: howToPlayRoute } = await import('./how-to-play');
    const head = asStaticHeadRoute(howToPlayRoute).head();

    expect(head.meta).not.toContainEqual({
      name: 'robots',
      content: 'noindex, follow',
    });
    expect(head.links).toEqual([
      {
        rel: 'canonical',
        href: 'https://grandprixpicks.com/how-to-play',
      },
    ]);
  });

  it('keeps the results policy title and description inside SERP limits', async () => {
    const { Route: policyRoute } = await import('./results-policy');
    const head = asStaticHeadRoute(policyRoute).head();

    const title = head.meta?.find((tag) => 'title' in tag) as
      | { title: string }
      | undefined;
    const description = head.meta?.find((tag) => tag.name === 'description');

    // Google truncates around 60 characters of title and 155 of description.
    // Past those, the part that answers the searcher's question is cut off.
    expect(title?.title.length).toBeLessThanOrEqual(60);
    expect(description?.content.length).toBeLessThanOrEqual(160);

    expect(head.meta).not.toContainEqual({
      name: 'robots',
      content: 'noindex, follow',
    });
    expect(head.links).toEqual([
      { rel: 'canonical', href: 'https://grandprixpicks.com/results-policy' },
    ]);
  });

  it('describes the results policy page and its breadcrumb trail', async () => {
    const { Route: policyRoute } = await import('./results-policy');
    const head = asStaticHeadRoute(policyRoute).head() as HeadResult & {
      scripts?: Array<{ children: string; type: string }>;
    };

    const graph = JSON.parse(head.scripts?.[0]?.children ?? '{}')['@graph'] as
      | Array<{ '@type': string }>
      | undefined;
    const types = graph?.map((node) => node['@type']);

    expect(types).toContain('WebPage');
    expect(types).toContain('BreadcrumbList');
    // FAQ rich results were retired in May 2026; the markup stays valid and is
    // still read by non-Google crawlers, so it must not be dropped silently.
    expect(types).toContain('FAQPage');
  });

  it('publishes indexable team-mate records with an ItemList', async () => {
    const { Route: teammateRoute } = await import('./f1-team-mate-battles');
    const head = asTeammateHeadRoute(teammateRoute).head({
      loaderData: {
        battles: {
          lastUpdated: 1_753_574_400_000,
          teams: [
            {
              team: 'ferrari',
              drivers: [
                { displayName: 'Charles Leclerc', total: 16 },
                { displayName: 'Lewis Hamilton', total: 4 },
              ],
            },
          ],
        },
      },
    });

    const title = head.meta?.find((tag) => 'title' in tag) as
      | { title: string }
      | undefined;
    const description = head.meta?.find((tag) => tag.name === 'description');
    const graph = JSON.parse(head.scripts?.[0]?.children ?? '{}')['@graph'] as
      | Array<{ '@type': string; numberOfItems?: number }>
      | undefined;

    expect(title?.title.length).toBeLessThanOrEqual(60);
    expect(description?.content.length).toBeLessThanOrEqual(160);
    expect(description?.content).toContain('Qualifying, sprint and race');
    expect(head.links).toEqual([
      {
        rel: 'canonical',
        href: 'https://grandprixpicks.com/f1-team-mate-battles',
      },
    ]);
    expect(graph?.map((node) => node['@type'])).toEqual([
      'WebPage',
      'BreadcrumbList',
      'ItemList',
    ]);
    expect(
      graph?.find((node) => node['@type'] === 'ItemList')?.numberOfItems,
    ).toBe(1);
  });

  it('sends the pre-rename spelling on to the page permanently', async () => {
    // The closed-form spelling is the one most people type, so the old URL
    // keeps working rather than 404ing anyone who linked or indexed it.
    const [{ Route: legacyRoute }, { redirect }] = await Promise.all([
      import('./f1-teammate-battles'),
      import('@tanstack/react-router'),
    ]);
    const { beforeLoad } = legacyRoute as unknown as {
      beforeLoad: () => void;
    };

    // `redirect` is mocked here, so the route throws whatever it returns
    // rather than a real redirect object.
    expect(beforeLoad).toThrow();
    expect(redirect).toHaveBeenCalledWith({
      to: '/f1-team-mate-battles',
      statusCode: 301,
    });
  });

  it('emits child canonical + noindex for follow list pages', async () => {
    const [{ Route: followersRoute }, { Route: followingRoute }] =
      await Promise.all([
        import('./p/$username/followers'),
        import('./p/$username/following'),
      ]);
    const followersHead = asUsernameHeadRoute(followersRoute).head({
      params: { username: 'trevord' },
    });
    const followingHead = asUsernameHeadRoute(followingRoute).head({
      params: { username: 'trevord' },
    });

    expect(followersHead.meta).toContainEqual({
      name: 'robots',
      content: 'noindex, follow',
    });
    expect(followersHead.links).toEqual([
      {
        rel: 'canonical',
        href: 'https://grandprixpicks.com/p/trevord/followers',
      },
    ]);

    expect(followingHead.meta).toContainEqual({
      name: 'robots',
      content: 'noindex, follow',
    });
    expect(followingHead.links).toEqual([
      {
        rel: 'canonical',
        href: 'https://grandprixpicks.com/p/trevord/following',
      },
    ]);
  });

  it('suppresses parent profile canonicals when a follow list child route is active', async () => {
    const { Route: profileRoute } = await import('./p/$username');

    const childHead = asProfileHeadRoute(profileRoute).head({
      loaderData: {
        initialProfile: { username: 'trevord', displayName: 'Trevor D' },
      },
      matches: [{ routeId: '/p/$username/followers' }],
      params: { username: 'trevord' },
    });

    expect(childHead).toEqual({});

    const baseHead = asProfileHeadRoute(profileRoute).head({
      loaderData: {
        initialProfile: { username: 'trevord', displayName: 'Trevor D' },
      },
      matches: [{ routeId: '/p/$username' }],
      params: { username: 'trevord' },
    });

    expect(baseHead.links).toEqual([
      { rel: 'canonical', href: 'https://grandprixpicks.com/p/trevord' },
    ]);
  });
});
