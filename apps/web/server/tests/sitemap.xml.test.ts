import { beforeEach, describe, expect, it, vi } from 'vitest';

import { listRaceWriteups } from '../../src/lib/raceWriteups';
import { siteConfig } from '../../src/lib/site';

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
      listCurrentSeason: 'races.listCurrentSeason',
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
    _creationTime: 1_700_000_000_900,
    _id: 'race_4',
    round: 13,
    slug: 'italy-2026',
    status: 'upcoming',
    updatedAt: 1_700_000_400_000,
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
    if (reference === 'races.listCurrentSeason') {
      return Promise.resolve({ season: 2026, races: RACES });
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
    mockConvex({ slugsWithPractice: ['miami-2026', 'italy-2026'] });

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
    // The race page canonicalises to its write-up, so only the write-up is
    // advertised.
    expect(xml).not.toContain(
      '<loc>https://grandprixpicks.com/races/italy-2026</loc>',
    );
    expect(xml).toContain(
      '<loc>https://grandprixpicks.com/f1-2026-italian-grand-prix-predictions</loc>',
    );
    expect(xml).toContain(
      '<loc>https://grandprixpicks.com/f1-predictions-this-weekend</loc>',
    );
  });

  it('lists no circuit page, because there are none', async () => {
    mockConvex({ slugsWithPractice: [] });

    const { xml } = await renderSitemap();

    // The circuit template is gone: 23 venue essays and their index, each
    // about 70% reproduced on the race page for the round held there. The
    // routes 301 to `/races`, and a redirect never belongs in a sitemap.
    expect(xml).not.toContain(`<loc>${siteConfig.url}/circuits</loc>`);
    for (const slug of ['miami', 'monza', 'lusail', 'monaco', 'spa']) {
      expect(xml).not.toContain(
        `<loc>${siteConfig.url}/circuits/${slug}</loc>`,
      );
    }
  });

  it('includes the content pages that carry the site editorially', async () => {
    mockConvex({ slugsWithPractice: [] });

    const { xml } = await renderSitemap();

    expect(xml).toContain('<loc>https://grandprixpicks.com/about</loc>');
    // Every write-up, carrying the review date the registry holds for it.
    // The dates were typed out here, which meant editing the prose on a
    // write-up and bumping its `reviewedAt` broke a sitemap test that has no
    // opinion about prose. What is worth proving is the wiring: each write-up
    // reaches the sitemap, and its `lastmod` is its own review date rather
    // than the deploy or a neighbour's.
    const writeups = listRaceWriteups();
    expect(writeups.length).toBeGreaterThan(0);
    for (const writeup of writeups) {
      expect(xml).toContain(
        `<loc>${siteConfig.url}${writeup.to}</loc>\n    <lastmod>${new Date(writeup.reviewedAt).toISOString()}</lastmod>`,
      );
    }
    expect(xml).toContain('<loc>https://grandprixpicks.com/guides</loc>');
    expect(xml).toContain(
      '<loc>https://grandprixpicks.com/guides/f1-points-system-explained</loc>',
    );
    // Retired 2026-09-08 and 301 to /how-to-play.
    expect(xml).not.toContain('f1-sprint-weekends-explained');
  });

  // The practice pages are 301s now. They never appeared in a search result
  // and took 8 pageviews from 3 people in 60 days, so a URL each was 13 of the
  // sitemap's 58 entries advertising a timing table with no prose on it.
  it('advertises no practice page', async () => {
    mockConvex({ slugsWithPractice: ['miami-2026'] });

    const { xml } = await renderSitemap();

    expect(xml).not.toContain('/practice</loc>');
    expect(xml).toContain(
      '<loc>https://grandprixpicks.com/races/qatar-2026</loc>',
    );
  });
});
