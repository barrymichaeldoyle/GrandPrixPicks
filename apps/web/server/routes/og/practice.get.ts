import { api } from '@convex-generated/api';
import { ConvexHttpClient } from 'convex/browser';

import { renderOgImage } from '../../../src/lib/og/renderer';
import { practiceResultsTemplate } from '../../../src/lib/og/templates';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '../../../src/lib/teamColors';
import { loadFlagDataUri } from '../../lib/ogFlag';
import { captureServerException, startServerSpan } from '../../lib/sentry';

type RouteEvent = {
  req: Request;
};

const PRACTICE_SESSIONS = ['fp1', 'fp2', 'fp3'] as const;

/**
 * Renders a full-field practice classification card for posting to X / Reddit
 * as the brand account. Unlike /og/share this is broadcast content: the data
 * is public and identical for every viewer, so it is fetched from Convex by
 * (race slug, session) rather than encoded into the URL.
 */
export default async function handler(event: RouteEvent) {
  try {
    const url = new URL(event.req.url);
    const raceSlug = url.searchParams.get('race');
    const session = PRACTICE_SESSIONS.find(
      (candidate) => candidate === url.searchParams.get('session'),
    );
    if (!raceSlug || !session) {
      return badRequest('Expected ?race=<slug>&session=fp1|fp2|fp3');
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

    const results = await convex.query(
      api.practiceResults.getPracticeResultsForRace,
      { raceId: race._id },
    );
    const result = results.find((item) => item.sessionType === session);
    if (!result) {
      return badRequest(
        `${session.toUpperCase()} results for "${raceSlug}" are not published yet`,
      );
    }

    const entries = [...result.entries]
      .sort((a, b) => a.position - b.position)
      .map((entry) => ({
        position: entry.position,
        code: entry.code,
        color: (entry.team && TEAM_COLORS[entry.team]) || FALLBACK_TEAM_COLOR,
        bestLapSeconds: entry.bestLapSeconds ?? null,
        gapToLeaderSeconds: entry.gapToLeaderSeconds ?? null,
        lapCount: entry.lapCount ?? null,
        isReserve: entry.isReserve,
      }));

    const flagSrc = await loadFlagDataUri(url.origin, race);

    const png = await startServerSpan({ name: 'og.renderPracticeCard' }, () =>
      renderOgImage(
        practiceResultsTemplate({
          raceName: race.name,
          round: race.round,
          season: race.season,
          sessionLabel: session.toUpperCase(),
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
        // Results can be reconciled against OpenF1 after first publish, so
        // keep this short enough that a corrected card supersedes a stale one.
        'cache-control': 'public, max-age=300, s-maxage=300',
      },
    });
  } catch (error) {
    captureServerException(error, { name: 'og.practiceCard' });
    console.error('[og/practice] render_failed', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });
    return new Response('Failed to render practice card', { status: 500 });
  }
}

function badRequest(message: string) {
  return new Response(message, {
    status: 400,
    headers: { 'content-type': 'text/plain' },
  });
}
