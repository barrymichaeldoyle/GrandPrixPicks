import { beforeEach, describe, expect, it, vi } from 'vitest';

const queryMock = vi.fn();

vi.mock('convex/browser', () => ({
  ConvexHttpClient: class {
    query = queryMock;
  },
}));

vi.mock('@convex-generated/api', () => ({
  api: {
    races: {
      listRaces: 'races.listRaces',
    },
  },
}));

describe('sitemap.xml route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.VITE_CONVEX_URL = 'https://example.convex.cloud';
  });

  it('renders static URLs and active race detail URLs as XML', async () => {
    queryMock.mockResolvedValue([
      {
        _creationTime: 1_700_000_000_000,
        _id: 'race_1',
        round: 6,
        slug: 'miami-2026',
        status: 'upcoming',
        updatedAt: 1_700_000_100_000,
      },
      {
        _creationTime: 1_700_000_000_500,
        _id: 'race_2',
        round: 7,
        slug: 'cancelled-race',
        status: 'cancelled',
        updatedAt: 1_700_000_200_000,
      },
    ]);

    const { default: handler } = await import('./sitemap.xml');
    const response = await handler({
      req: new Request('https://grandprixpicks.com/sitemap.xml'),
    });
    const xml = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe(
      'application/xml; charset=utf-8',
    );
    expect(xml).toContain('<loc>https://grandprixpicks.com/</loc>');
    expect(xml).toContain('<loc>https://grandprixpicks.com/races</loc>');
    expect(xml).toContain(
      '<loc>https://grandprixpicks.com/races/miami-2026</loc>',
    );
    expect(xml).toContain('<lastmod>2023-11-14T22:15:00.000Z</lastmod>');
    expect(xml).not.toContain('cancelled-race');
  });
});
