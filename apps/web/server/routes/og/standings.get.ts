import { api } from '@convex-generated/api';
import { ConvexHttpClient } from 'convex/browser';

import { renderOgImage } from '../../../src/lib/og/renderer';
import { driversStandingsTemplate } from '../../../src/lib/og/templates';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '../../../src/lib/teamColors';
import { captureServerException, startServerSpan } from '../../lib/sentry';

type RouteEvent = { req: Request };

function badRequest(message: string) {
  return new Response(message, { status: 400 });
}

/**
 * The drivers' championship card the app posts after a race:
 * `?after=<race slug>`. The standings are the season's, read live; the slug
 * names the race in the title and how many rounds remain.
 */
export default async function handler(event: RouteEvent) {
  try {
    const url = new URL(event.req.url);
    const slug = url.searchParams.get('after');
    if (!slug) {
      return badRequest('Expected ?after=<race slug>');
    }
    const convexUrl = process.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      throw new Error('Missing VITE_CONVEX_URL');
    }
    const convex = new ConvexHttpClient(convexUrl);
    const race = await convex.query(api.races.getRaceBySlug, { slug });
    if (!race) {
      return badRequest(`No race with slug "${slug}"`);
    }
    const [standings, races] = await Promise.all([
      convex.query(api.f1Standings.getF1Championship, { season: race.season }),
      convex.query(api.races.listRaces, {}),
    ]);
    const roundsLeft = races.filter(
      (other) => other.season === race.season && other.round > race.round,
    ).length;

    const png = await startServerSpan({ name: 'og.renderStandingsCard' }, () =>
      renderOgImage(
        driversStandingsTemplate({
          raceName: race.name,
          roundsLeft,
          entries: standings.drivers.map((driver) => ({
            position: driver.position,
            code: driver.code,
            name: driver.displayName,
            color:
              (driver.team && TEAM_COLORS[driver.team]) || FALLBACK_TEAM_COLOR,
            points: driver.points,
          })),
        }),
        '16:9',
      ),
    );
    return new Response(new Uint8Array(png), {
      headers: {
        'content-type': 'image/png',
        'content-disposition': `inline; filename="standings-after-${slug}.png"`,
        'cache-control': 'public, max-age=300, s-maxage=300',
      },
    });
  } catch (error) {
    captureServerException(error, { name: 'og.standingsCard' });
    console.error('[og/standings] render_failed', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });
    return new Response('Failed to render standings card', { status: 500 });
  }
}
