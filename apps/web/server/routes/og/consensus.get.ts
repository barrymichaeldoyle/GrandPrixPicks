import { api } from '@convex-generated/api';
import { ConvexHttpClient } from 'convex/browser';

import { renderOgImage } from '../../../src/lib/og/renderer';
import { consensusTemplate } from '../../../src/lib/og/templates';
import { SESSION_LABELS } from '../../../src/lib/sessions';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '../../../src/lib/teamColors';
import { loadFlagDataUri } from '../../lib/ogFlag';
import { captureServerException, startServerSpan } from '../../lib/sentry';

type RouteEvent = { req: Request };

const SESSION_TYPES = ['quali', 'sprint_quali', 'sprint', 'race'] as const;

function badRequest(message: string) {
  return new Response(message, { status: 400 });
}

/**
 * What players picked for a locked session: `?race=<slug>&session=<type>`.
 * Posted by the app once enough players entered; the backend decides that,
 * this route only draws whatever consensus the query returns.
 */
export default async function handler(event: RouteEvent) {
  try {
    const url = new URL(event.req.url);
    const raceSlug = url.searchParams.get('race');
    const session = SESSION_TYPES.find(
      (candidate) => candidate === (url.searchParams.get('session') ?? 'race'),
    );
    if (!raceSlug || !session) {
      return badRequest(
        'Expected ?race=<slug>&session=quali|sprint_quali|sprint|race',
      );
    }
    const convexUrl = process.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      throw new Error('Missing VITE_CONVEX_URL');
    }
    const convex = new ConvexHttpClient(convexUrl);
    const race = await convex.query(api.races.getRaceBySlug, {
      slug: raceSlug,
    });
    if (!race) {
      return badRequest(`No race with slug "${raceSlug}"`);
    }
    const consensus = await convex.query(api.consensus.getSessionConsensus, {
      raceId: race._id,
      sessionType: session,
    });
    if (!consensus) {
      return badRequest(`No ${session} consensus for "${raceSlug}" yet`);
    }
    const flagSrc = await loadFlagDataUri(url.origin, race);
    const png = await startServerSpan({ name: 'og.renderConsensusCard' }, () =>
      renderOgImage(
        consensusTemplate({
          raceName: race.name,
          sessionLabel: SESSION_LABELS[session],
          entrants: consensus.entrants,
          flagSrc,
          entries: consensus.drivers.slice(0, 5).map((driver) => ({
            code: driver.code,
            name: driver.displayName,
            color:
              (driver.team && TEAM_COLORS[driver.team]) || FALLBACK_TEAM_COLOR,
            pickRate: driver.pickRate,
          })),
        }),
        '16:9',
      ),
    );
    return new Response(new Uint8Array(png), {
      headers: {
        'content-type': 'image/png',
        'content-disposition': `inline; filename="${raceSlug}-${session}-picks.png"`,
        'cache-control': 'public, max-age=300, s-maxage=300',
      },
    });
  } catch (error) {
    captureServerException(error, { name: 'og.consensusCard' });
    console.error('[og/consensus] render_failed', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });
    return new Response('Failed to render consensus card', { status: 500 });
  }
}
