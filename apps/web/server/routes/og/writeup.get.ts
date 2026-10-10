import { api } from '@convex-generated/api';
import { ConvexHttpClient } from 'convex/browser';
import { getCircuitForRace } from '@grandprixpicks/shared/circuits';
import { SESSION_LABELS } from '@grandprixpicks/shared/sessions';

import { formatRaceLocalLockDate } from '../../../src/lib/raceLockTime';
import { getWeekendSessionStarts } from '../../../src/lib/raceSessions';
import { renderOgImage } from '../../../src/lib/og/renderer';
import { raceWriteupTemplate } from '../../../src/lib/og/templates';
import { loadFlagDataUri } from '../../lib/ogFlag';
import { captureServerException, startServerSpan } from '../../lib/sentry';

type RouteEvent = {
  req: Request;
};

/** Unknown race or any failure: the site card is generic but never wrong. */
const DEFAULT_IMAGE_REDIRECT = new Response(null, {
  status: 302,
  headers: {
    location: '/og-default.png',
    'cache-control': 'public, max-age=300',
  },
});

/**
 * The link-preview card for a race write-up, selected by `?race=<slug>`.
 *
 * Session times are track-local, the way the write-up and a broadcast
 * schedule quote them. For a given slug they only change if the FIA moves a
 * session, so the card is cached for a day.
 */
export default async function handler(event: RouteEvent) {
  try {
    const url = new URL(event.req.url);
    const slug = url.searchParams.get('race');
    const convexUrl = process.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      throw new Error('Missing VITE_CONVEX_URL');
    }
    if (!slug) {
      return DEFAULT_IMAGE_REDIRECT.clone();
    }
    const convex = new ConvexHttpClient(convexUrl);
    const race = await convex.query(api.races.getRaceBySlug, { slug });
    if (!race) {
      return DEFAULT_IMAGE_REDIRECT.clone();
    }

    let timeZone: string | undefined;
    const sessions = getWeekendSessionStarts(race).flatMap((session) => {
      const local = formatRaceLocalLockDate(session.startAt, race.slug);
      if (!local) {
        return [];
      }
      // "Sun 11 Oct" + "20:00 GMT+8": the card names the zone once, so each
      // session keeps only its weekday and clock time.
      const [time, zone] = local.time.split(' ');
      timeZone ??= zone;
      return [
        {
          label: SESSION_LABELS[session.type],
          day: local.date.split(' ')[0] ?? '',
          time: time ?? local.time,
        },
      ];
    });

    const flagSrc = await loadFlagDataUri(url.origin, race);
    const png = await startServerSpan({ name: 'og.renderWriteupCard' }, () =>
      renderOgImage(
        raceWriteupTemplate({
          raceName: race.name,
          round: race.round,
          season: race.season,
          venue: getCircuitForRace(race.slug)?.locality,
          hasSprint: !!race.hasSprint,
          flagSrc,
          sessions,
          timeZone,
        }),
      ),
    );

    // Copy into a fresh Uint8Array<ArrayBuffer> — renderOgImage's output is
    // typed over ArrayBufferLike, which BodyInit rejects.
    return new Response(new Uint8Array(png), {
      headers: {
        'content-type': 'image/png',
        'cache-control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (error) {
    captureServerException(error, { name: 'og.writeupCard' });
    console.error('[og/writeup] render_failed_falling_back_to_default', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });
    return DEFAULT_IMAGE_REDIRECT.clone();
  }
}
