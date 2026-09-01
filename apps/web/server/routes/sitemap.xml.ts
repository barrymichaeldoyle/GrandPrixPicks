import { api } from '@convex-generated/api';
import { ConvexHttpClient } from 'convex/browser';

import { captureServerException, startServerSpan } from '../lib/sentry';
import { listCircuits } from '@grandprixpicks/shared/circuits';

import { getCircuitGuideBySlug } from '../../src/lib/circuitGuides';
import { listGuideMeta } from '../../src/lib/guideMeta';
import { listRaceWriteups } from '../../src/lib/raceWriteups';
import { siteConfig } from '../../src/lib/site';

type RouteEvent = {
  req: Request;
};

type SitemapEntry = {
  changefreq: 'daily' | 'weekly' | 'monthly';
  lastmod?: string;
  loc: string;
  priority: string;
};

/**
 * `lastmod` is given only where a real date exists to give.
 *
 * Races carry `race.updatedAt`, and guides now carry their own publication and
 * revision dates. Everything else — the policies, the index pages, the live
 * data pages — deliberately ships without one. A build timestamp was the
 * tempting fill-in and is the wrong answer: it would tell Google every page on
 * the site was rewritten on every deploy, and an inaccurate `lastmod` is
 * exactly the signal Google stops trusting. No date beats a wrong date.
 */
const staticEntries: SitemapEntry[] = [
  {
    loc: `${siteConfig.url}/`,
    changefreq: 'weekly',
    priority: '1.0',
  },
  {
    loc: `${siteConfig.url}/races`,
    changefreq: 'daily',
    priority: '0.9',
  },
  {
    loc: `${siteConfig.url}/how-to-play`,
    changefreq: 'monthly',
    priority: '0.8',
  },
  {
    loc: `${siteConfig.url}/guides`,
    changefreq: 'monthly',
    priority: '0.8',
  },
  // Real dates, from the guide entries themselves.
  ...listGuideMeta().map((guide) => ({
    loc: `${siteConfig.url}/guides/${guide.slug}`,
    changefreq: 'monthly' as const,
    lastmod: new Date(guide.updatedAt ?? guide.publishedAt).toISOString(),
    priority: '0.7',
  })),
  {
    loc: `${siteConfig.url}/circuits`,
    changefreq: 'monthly',
    priority: '0.8',
  },
  // Only circuits with a guide are routable; the rest 404, and a sitemap that
  // lists 404s is a crawl-budget leak.
  ...listCircuits()
    .filter((circuit) => getCircuitGuideBySlug(circuit.slug) !== null)
    .map((circuit) => ({
      loc: `${siteConfig.url}/circuits/${circuit.slug}`,
      changefreq: 'monthly' as const,
      priority: '0.7',
    })),
  {
    loc: `${siteConfig.url}/about`,
    changefreq: 'monthly',
    priority: '0.7',
  },
  {
    loc: `${siteConfig.url}/results-policy`,
    changefreq: 'monthly',
    priority: '0.8',
  },
  {
    loc: `${siteConfig.url}/leaderboard`,
    changefreq: 'daily',
    priority: '0.8',
  },
  {
    loc: `${siteConfig.url}/f1-team-mate-battles`,
    changefreq: 'weekly',
    priority: '0.8',
  },
  {
    // Always describes the next round, so its content genuinely turns over
    // every week or two. Priority matches `/races` because it is the other
    // half of the same job: the calendar lists the season, this one names the
    // round you can still pick.
    loc: `${siteConfig.url}/f1-predictions-this-weekend`,
    changefreq: 'daily',
    priority: '0.9',
  },
  // The write-up registry also drives in-app links and each page's reviewed
  // stamp, so adding or revising one cannot leave the sitemap behind.
  ...listRaceWriteups().map((writeup): SitemapEntry => ({
    loc: `${siteConfig.url}${writeup.to}`,
    changefreq: 'daily',
    lastmod: new Date(writeup.reviewedAt).toISOString(),
    priority: '0.8',
  })),
  {
    loc: `${siteConfig.url}/f1-standings`,
    changefreq: 'daily',
    priority: '0.8',
  },
  {
    // Reviewed by hand rather than generated, so a weekly changefreq is a
    // promise we can keep. It becomes the round list once 2027 is ratified.
    loc: `${siteConfig.url}/f1-2027-calendar`,
    changefreq: 'weekly',
    priority: '0.6',
  },
  {
    loc: `${siteConfig.url}/leagues`,
    changefreq: 'weekly',
    priority: '0.7',
  },
  {
    loc: `${siteConfig.url}/refund-policy`,
    changefreq: 'monthly',
    priority: '0.6',
  },
  {
    loc: `${siteConfig.url}/terms`,
    changefreq: 'monthly',
    priority: '0.6',
  },
  {
    loc: `${siteConfig.url}/privacy`,
    changefreq: 'monthly',
    priority: '0.6',
  },
];

const SITEMAP_FETCH_RETRY_COUNT = 5;
const SITEMAP_FETCH_RETRY_DELAY_MS = 500;

function escapeXml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function toIsoDate(timestamp: number | undefined) {
  if (timestamp === undefined) {
    return undefined;
  }
  return new Date(timestamp).toISOString();
}

function renderSitemap(entries: SitemapEntry[]) {
  const urls = entries
    .map((entry) => {
      const lastmod = entry.lastmod
        ? `<lastmod>${entry.lastmod}</lastmod>`
        : '';
      return [
        '  <url>',
        `    <loc>${escapeXml(entry.loc)}</loc>`,
        lastmod ? `    ${lastmod}` : null,
        `    <changefreq>${entry.changefreq}</changefreq>`,
        `    <priority>${entry.priority}</priority>`,
        '  </url>',
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function loadRaceEntries() {
  const convexUrl = process.env.VITE_CONVEX_URL;
  if (!convexUrl) {
    throw new Error('Missing VITE_CONVEX_URL');
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= SITEMAP_FETCH_RETRY_COUNT; attempt += 1) {
    try {
      const convex = new ConvexHttpClient(convexUrl);
      const [races, slugsWithPractice] = await Promise.all([
        convex.query(api.races.listRaces, {}),
        convex.query(api.practiceResults.listRaceSlugsWithPracticeResults, {}),
      ]);
      const hasPracticeResults = new Set(slugsWithPractice);
      return races
        .filter((race) => race.status !== 'cancelled')
        .sort((a, b) => a.round - b.round)
        .flatMap((race) => {
          const lastmod = toIsoDate(race.updatedAt ?? race._creationTime);
          const entries: SitemapEntry[] = [
            {
              loc: `${siteConfig.url}/races/${race.slug}`,
              changefreq: 'daily' as const,
              lastmod,
              priority: '0.8',
            },
          ];
          // A practice page with nothing published is a placeholder line of
          // text. Advertise it only once it has a real classification.
          if (hasPracticeResults.has(race.slug)) {
            entries.push({
              loc: `${siteConfig.url}/races/${race.slug}/practice`,
              changefreq: 'daily' as const,
              lastmod,
              priority: '0.7',
            });
          }
          return entries;
        });
    } catch (error) {
      lastError = error;
      if (attempt < SITEMAP_FETCH_RETRY_COUNT) {
        await delay(SITEMAP_FETCH_RETRY_DELAY_MS);
      }
    }
  }

  throw lastError;
}

export default async function handler(_event: RouteEvent) {
  try {
    const raceEntries = await startServerSpan(
      { name: 'sitemap.loadRaceEntries' },
      loadRaceEntries,
    );

    return new Response(renderSitemap([...staticEntries, ...raceEntries]), {
      headers: {
        'cache-control': 'public, max-age=3600',
        'content-type': 'application/xml; charset=utf-8',
      },
    });
  } catch (error) {
    captureServerException(error, { name: 'sitemap.generate' });
    console.error('[sitemap] generation_failed_falling_back_to_static', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });
    return new Response(renderSitemap(staticEntries), {
      headers: {
        'cache-control': 'public, max-age=300',
        'content-type': 'application/xml; charset=utf-8',
      },
    });
  }
}
