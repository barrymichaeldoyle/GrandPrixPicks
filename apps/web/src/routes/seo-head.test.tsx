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

type HeadResult = {
  links?: Array<{ href: string; rel: string }>;
  meta?: Array<{ content: string; name?: string; property?: string }>;
};

type StaticHeadRoute = {
  head: () => HeadResult;
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

describe('SEO head metadata', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('marks gated pages as noindex with a single canonical', async () => {
    const [{ Route: feedRoute }, { Route: supportRoute }, { Route: meRoute }] =
      await Promise.all([
        import('./feed/index'),
        import('./support'),
        import('./me'),
      ]);
    const routes: StaticHeadRoute[] = [feedRoute, supportRoute, meRoute];

    for (const [path, route] of [
      ['/feed', routes[0]],
      ['/support', routes[1]],
      ['/me', routes[2]],
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

  it('emits child canonical + noindex for follow list pages', async () => {
    const [{ Route: followersRoute }, { Route: followingRoute }] =
      await Promise.all([
        import('./p/$username/followers'),
        import('./p/$username/following'),
      ]);
    const followersHead = (followersRoute as UsernameHeadRoute).head({
      params: { username: 'trevord' },
    });
    const followingHead = (followingRoute as UsernameHeadRoute).head({
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

    const childHead = (profileRoute as ProfileHeadRoute).head({
      loaderData: {
        initialProfile: { username: 'trevord', displayName: 'Trevor D' },
      },
      matches: [{ routeId: '/p/$username/followers' }],
      params: { username: 'trevord' },
    });

    expect(childHead).toEqual({});

    const baseHead = (profileRoute as ProfileHeadRoute).head({
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
