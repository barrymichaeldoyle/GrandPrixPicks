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
    practiceResults: {
      listRaceSlugsWithPracticeResults:
        'practiceResults.listRaceSlugsWithPracticeResults',
    },
  },
}));

const RACES = [
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
  {
    _creationTime: 1_700_000_000_800,
    _id: 'race_3',
    round: 8,
    slug: 'qatar-2026',
    status: 'upcoming',
    updatedAt: 1_700_000_300_000,
  },
];

/** Resolves each Convex query the sitemap makes, keyed by the mocked api ref. */
function mockConvex({ slugsWithPractice }: { slugsWithPractice: string[] }) {
  queryMock.mockImplementation((reference: string) => {
    if (reference === 'races.listRaces') {
      return Promise.resolve(RACES);
    }
    if (reference === 'practiceResults.listRaceSlugsWithPracticeResults') {
      return Promise.resolve(slugsWithPractice);
    }
    throw new Error(`unexpected query: ${reference}`);
  });
}

async function renderSitemap() {
  const { default: handler } = await import('../routes/sitemap.xml');
  const response = await handler({
    req: new Request('https://grandprixpicks.com/sitemap.xml'),
  });
  return { response, xml: await response.text() };
}

describe('sitemap.xml route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    process.env.VITE_CONVEX_URL = 'https://example.convex.cloud';
  });

  it('renders static URLs and active race detail URLs as XML', async () => {
    mockConvex({ slugsWithPractice: ['miami-2026'] });

    const { response, xml } = await renderSitemap();

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
    expect(xml).not.toContain('<loc>https://grandprixpicks.com/pricing</loc>');
    expect(xml).not.toContain('cancelled-race');
  });

  it('includes the content pages that carry the site editorially', async () => {
    mockConvex({ slugsWithPractice: [] });

    const { xml } = await renderSitemap();

    expect(xml).toContain('<loc>https://grandprixpicks.com/about</loc>');
    expect(xml).toContain(
      '<loc>https://grandprixpicks.com/f1-2026-italian-grand-prix-predictions</loc>\n    <lastmod>2026-09-01T00:00:00.000Z</lastmod>',
    );
    expect(xml).toContain(
      '<loc>https://grandprixpicks.com/f1-2026-bahrain-grand-prix-predictions</loc>\n    <lastmod>2026-09-01T00:00:00.000Z</lastmod>',
    );
    expect(xml).toContain(
      '<loc>https://grandprixpicks.com/f1-2026-madrid-grand-prix-predictions</loc>\n    <lastmod>2026-08-31T00:00:00.000Z</lastmod>',
    );
    expect(xml).toContain('<loc>https://grandprixpicks.com/guides</loc>');
    expect(xml).toContain(
      '<loc>https://grandprixpicks.com/guides/f1-sprint-weekends-explained</loc>',
    );
  });

  it('lists a practice page only once that race has published results', async () => {
    mockConvex({ slugsWithPractice: ['miami-2026'] });

    const { xml } = await renderSitemap();

    expect(xml).toContain(
      '<loc>https://grandprixpicks.com/races/miami-2026/practice</loc>',
    );
    // qatar-2026 has run no practice sessions, so its practice page is a
    // placeholder and must stay out of the sitemap.
    expect(xml).toContain(
      '<loc>https://grandprixpicks.com/races/qatar-2026</loc>',
    );
    expect(xml).not.toContain(
      '<loc>https://grandprixpicks.com/races/qatar-2026/practice</loc>',
    );
  });
});
