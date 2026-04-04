import { api } from '@convex-generated/api';
import { ConvexHttpClient } from 'convex/browser';

import { siteConfig } from '../../src/lib/site';

const convex = new ConvexHttpClient(process.env.VITE_CONVEX_URL!);

type RouteEvent = {
  req: Request;
};

type SitemapEntry = {
  changefreq: 'daily' | 'weekly' | 'monthly';
  lastmod?: string;
  loc: string;
  priority: string;
};

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
    loc: `${siteConfig.url}/leaderboard`,
    changefreq: 'daily',
    priority: '0.8',
  },
  {
    loc: `${siteConfig.url}/leagues`,
    changefreq: 'weekly',
    priority: '0.7',
  },
  {
    loc: `${siteConfig.url}/pricing`,
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

export default async function handler(_event: RouteEvent) {
  try {
    const races = await convex.query(api.races.listRaces, {});
    const raceEntries: SitemapEntry[] = races
      .filter((race) => race.status !== 'cancelled')
      .sort((a, b) => a.round - b.round)
      .map((race) => ({
        loc: `${siteConfig.url}/races/${race.slug}`,
        changefreq: 'daily',
        lastmod: toIsoDate(race.updatedAt ?? race._creationTime),
        priority: '0.8',
      }));

    return new Response(renderSitemap([...staticEntries, ...raceEntries]), {
      headers: {
        'cache-control': 'public, max-age=3600',
        'content-type': 'application/xml; charset=utf-8',
      },
    });
  } catch (error) {
    console.error('[sitemap] generation_failed', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });
    return new Response('Could not generate sitemap', {
      status: 500,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }
}
