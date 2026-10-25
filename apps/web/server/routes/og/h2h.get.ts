import { api } from '@convex-generated/api';

import { renderOgImage } from '../../../src/lib/og/renderer';
import { h2hResultsTemplate } from '../../../src/lib/og/templates';
import { SESSION_LABELS } from '../../../src/lib/sessions';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '../../../src/lib/teamColors';
import { loadFlagDataUri } from '../../lib/ogFlag';
import { captureServerException, startServerSpan } from '../../lib/sentry';
import { getServerConvexClient } from '../../lib/convex';
import { ogBadRequest } from '../../lib/ogResponses';

type RouteEvent = {
  req: Request;
};

const SESSION_TYPES = ['quali', 'sprint_quali', 'sprint', 'race'] as const;

/**
 * Renders the teammate head-to-head results for one session as a card for
 * posting as the brand account. Broadcast content: fetched from Convex by
 * (race slug, session) rather than encoded into the URL.
 */
export default async function handler(event: RouteEvent) {
  try {
    const url = new URL(event.req.url);
    const raceSlug = url.searchParams.get('race');
    const sessionParam = url.searchParams.get('session') ?? 'race';
    const session = SESSION_TYPES.find(
      (candidate) => candidate === sessionParam,
    );
    if (!raceSlug || !session) {
      return ogBadRequest(
        'Expected ?race=<slug>&session=quali|sprint_quali|sprint|race',
      );
    }

    const convex = getServerConvexClient();

    const race = await convex.query(api.races.getRaceBySlug, {
      slug: raceSlug,
    });
    if (!race) {
      return ogBadRequest(`No race with slug "${raceSlug}"`);
    }

    const results = await convex.query(api.h2h.getH2HResultsForRace, {
      raceId: race._id,
      sessionType: session,
    });
    if (!results || results.length === 0) {
      return ogBadRequest(
        `No ${session} head-to-head results published for "${raceSlug}"`,
      );
    }

    const rows = results.map((result) => {
      const loser =
        result.driver1?._id === result.winnerId
          ? result.driver2
          : result.driver1;
      return {
        team: result.team,
        color: TEAM_COLORS[result.team] ?? FALLBACK_TEAM_COLOR,
        winnerCode: result.winnerCode,
        loserCode: loser?.code ?? '???',
      };
    });

    const flagSrc = await loadFlagDataUri(url.origin, race);

    const png = await startServerSpan({ name: 'og.renderH2HCard' }, () =>
      renderOgImage(
        h2hResultsTemplate({
          raceName: race.name,
          round: race.round,
          season: race.season,
          sessionLabel: SESSION_LABELS[session],
          flagSrc,
          rows,
        }),
        '16:9',
      ),
    );

    // Copy into a fresh Uint8Array<ArrayBuffer> — renderOgImage's output is
    // typed over ArrayBufferLike, which BodyInit rejects.
    return new Response(new Uint8Array(png), {
      headers: {
        'content-type': 'image/png',
        'content-disposition': `inline; filename="${raceSlug}-${session}-h2h.png"`,
        'cache-control': 'public, max-age=300, s-maxage=300',
      },
    });
  } catch (error) {
    captureServerException(error, { name: 'og.h2hCard' });
    console.error('[og/h2h] render_failed', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });
    return new Response('Failed to render head-to-head card', { status: 500 });
  }
}
