import { api } from '@convex-generated/api';
import { resolveDisplayName } from '@grandprixpicks/shared/displayName';

import { renderOgImage } from '../../../src/lib/og/renderer';
import { seasonRecapTemplate } from '../../../src/lib/og/templates';
import { captureServerException, startServerSpan } from '../../lib/sentry';
import { getServerConvexClient } from '../../lib/convex';

type RouteEvent = { req: Request };

const DEFAULT_IMAGE_REDIRECT = new Response(null, {
  status: 302,
  headers: {
    location: '/og-default.png',
    'cache-control': 'public, max-age=300',
  },
});

/**
 * A player's season recap card: `?username=<username>&season=<year>`. Read
 * live from the same public query the recap page renders, so the card and
 * the page it unfurls for never disagree.
 */
export default async function handler(event: RouteEvent) {
  try {
    const url = new URL(event.req.url);
    const username = url.searchParams.get('username');
    const seasonParam = url.searchParams.get('season');
    const season = seasonParam ? Number(seasonParam) : undefined;
    if (!username || (season !== undefined && !Number.isInteger(season))) {
      return DEFAULT_IMAGE_REDIRECT.clone();
    }

    const convex = getServerConvexClient();
    const recap = await convex.query(api.seasonRecap.getSeasonRecap, {
      username,
      season,
    });
    if (!recap) {
      return DEFAULT_IMAGE_REDIRECT.clone();
    }

    const png = await startServerSpan(
      { name: 'og.renderSeasonRecapCard' },
      () =>
        renderOgImage(
          seasonRecapTemplate({
            by: resolveDisplayName(recap.player),
            season: recap.season,
            seasonComplete: recap.seasonComplete,
            points: recap.topFive.points,
            rank: recap.topFive.rank,
            players: recap.topFive.players,
            weekendsScored: recap.topFive.weekendsScored,
            exactPicks: recap.topFive.exactPicks,
            winnerCalls: recap.topFive.winnerCalls,
            bestWeekend: recap.bestWeekend
              ? {
                  raceName: recap.bestWeekend.raceName,
                  points: recap.bestWeekend.points,
                }
              : null,
          }),
        ),
    );

    return new Response(new Uint8Array(png), {
      headers: {
        'content-type': 'image/png',
        'content-disposition': `inline; filename="${username}-${recap.season}-season.png"`,
        // A result publish moves every figure on the card, so it is short-lived.
        'cache-control': 'public, max-age=300, s-maxage=300',
      },
    });
  } catch (error) {
    captureServerException(error, { name: 'og.seasonRecapCard' });
    console.error('[og/season] render_failed', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });
    return new Response('Failed to render season card', { status: 500 });
  }
}
