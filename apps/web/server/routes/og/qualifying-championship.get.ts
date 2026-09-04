import { api } from '@convex-generated/api';
import { ConvexHttpClient } from 'convex/browser';

import { renderOgImage } from '../../../src/lib/og/renderer';
import {
  defaultBrandTemplate,
  qualifyingChampionshipTemplate,
} from '../../../src/lib/og/templates';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '../../../src/lib/teamColors';
import { captureServerException, startServerSpan } from '../../lib/sentry';

/**
 * The link-preview card for `/f1-qualifying-standings`: the current top ten of
 * the qualifying championship with each driver's movement against the real
 * standings. No parameters — the page is singular, so the card is too.
 *
 * Before the season's first qualifying there is no table to draw, so the
 * evergreen brand card stands in rather than a 4xx: the page's meta tags
 * reference this URL year-round and a scraper that gets an error caches
 * nothing at all.
 */
export default async function handler() {
  try {
    const convexUrl = process.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      throw new Error('Missing VITE_CONVEX_URL');
    }
    const convex = new ConvexHttpClient(convexUrl);

    const standings = await convex.query(
      api.qualifyingChampionship.getQualifyingChampionship,
      {},
    );

    const hasResults =
      standings.drivers.length > 0 && standings.roundsScored > 0;
    const template = hasResults
      ? qualifyingChampionshipTemplate({
          season: standings.season,
          roundsScored: standings.roundsScored,
          entries: standings.drivers.map((driver) => ({
            position: driver.qualifyingPosition,
            code: driver.code,
            color:
              (driver.team && TEAM_COLORS[driver.team]) || FALLBACK_TEAM_COLOR,
            points: driver.qualifyingPoints,
            delta: driver.delta,
          })),
        })
      : defaultBrandTemplate();

    const png = await startServerSpan(
      { name: 'og.renderQualifyingChampionshipCard' },
      () => renderOgImage(template, 'og'),
    );

    // Copy into a fresh Uint8Array<ArrayBuffer> — renderOgImage's output is
    // typed over ArrayBufferLike, which BodyInit rejects.
    return new Response(new Uint8Array(png), {
      headers: {
        'content-type': 'image/png',
        'content-disposition': 'inline; filename="qualifying-championship.png"',
        // Matches the page's own SSR window: the table moves at most a few
        // times per weekend, so a scraper re-fetching within ten minutes gets
        // the edge copy.
        'cache-control': 'public, max-age=300, s-maxage=600',
      },
    });
  } catch (error) {
    captureServerException(error, { name: 'og.qualifyingChampionshipCard' });
    console.error('[og/qualifying-championship] render_failed', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });
    return new Response('Failed to render qualifying championship card', {
      status: 500,
    });
  }
}
