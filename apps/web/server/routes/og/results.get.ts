import { api } from '@convex-generated/api';
import type { DriverStatus } from '@grandprixpicks/shared/driverStatus';
import { DRIVER_STATUS_LABELS } from '@grandprixpicks/shared/driverStatus';
import { ConvexHttpClient } from 'convex/browser';

import { renderOgImage } from '../../../src/lib/og/renderer';
import { sessionResultsTemplate } from '../../../src/lib/og/templates';
import { SESSION_LABELS } from '../../../src/lib/sessions';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '../../../src/lib/teamColors';
import { loadFlagDataUri } from '../../lib/ogFlag';
import { captureServerException, startServerSpan } from '../../lib/sentry';

type RouteEvent = {
  req: Request;
};

const SESSION_TYPES = ['quali', 'sprint_quali', 'sprint', 'race'] as const;

/**
 * Renders the full classification for a scored session as a card for posting
 * as the brand account. Broadcast content: fetched from Convex by
 * (race slug, session) rather than encoded into the URL.
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

    const result = await convex.query(api.results.getResultForRace, {
      raceId: race._id,
      sessionType: session,
    });
    if (!result) {
      return badRequest(`No ${session} result published for "${raceSlug}" yet`);
    }

    const entries = result.enrichedClassification.map((entry) => ({
      position: entry.position,
      code: entry.code,
      name: entry.displayName,
      color: (entry.team && TEAM_COLORS[entry.team]) || FALLBACK_TEAM_COLOR,
      status: entry.status
        ? DRIVER_STATUS_LABELS[entry.status as DriverStatus]
        : null,
    }));

    const flagSrc = await loadFlagDataUri(url.origin, race);

    const png = await startServerSpan({ name: 'og.renderResultsCard' }, () =>
      renderOgImage(
        sessionResultsTemplate({
          raceName: race.name,
          round: race.round,
          season: race.season,
          sessionLabel: SESSION_LABELS[session],
          flagSrc,
          entries,
        }),
        '16:9',
      ),
    );

    // Copy into a fresh Uint8Array<ArrayBuffer> — renderOgImage's output is
    // typed over ArrayBufferLike, which BodyInit rejects.
    return new Response(new Uint8Array(png), {
      headers: {
        'content-type': 'image/png',
        'content-disposition': `inline; filename="${raceSlug}-${session}.png"`,
        'cache-control': 'public, max-age=300, s-maxage=300',
      },
    });
  } catch (error) {
    captureServerException(error, { name: 'og.resultsCard' });
    console.error('[og/results] render_failed', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });
    return new Response('Failed to render results card', { status: 500 });
  }
}

function badRequest(message: string) {
  return new Response(message, {
    status: 400,
    headers: { 'content-type': 'text/plain' },
  });
}
