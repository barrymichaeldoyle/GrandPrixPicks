import { api } from '@convex-generated/api';
import type { Doc } from '@convex-generated/dataModel';
import { ConvexHttpClient } from 'convex/browser';

import { formatRaceLocalLockDate } from '../../../src/lib/raceLockTime';
import { getNextSessionLockAt } from '../../../src/lib/raceSessions';
import { renderOgImage } from '../../../src/lib/og/renderer';
import { nextRaceTemplate } from '../../../src/lib/og/templates';
import { loadFlagDataUri } from '../../lib/ogFlag';
import { captureServerException, startServerSpan } from '../../lib/sentry';

type RouteEvent = {
  req: Request;
};

/**
 * Off-season, or any failure at all. The evergreen card is worse than the live
 * one but it is never wrong, so nothing here is allowed to serve a broken
 * image: a link preview that fails to load costs more than a generic one.
 */
const DEFAULT_IMAGE_REDIRECT = new Response(null, {
  status: 302,
  headers: {
    location: '/og-default.png',
    'cache-control': 'public, max-age=300',
  },
});

/**
 * The site's own OG image, rendered against the next race.
 *
 * Callers pass `?race=<slug>` rather than letting this resolve the next race on
 * every request, and that is the whole trick. Scrapers cache an OG image by
 * URL, sometimes for weeks, so a single stable `/og/next` would keep serving
 * last month's Grand Prix long after it ran. Putting the slug in the URL means
 * every round mints a URL nobody has cached yet. The bare form still works for
 * hand-shared links.
 */
export default async function handler(event: RouteEvent) {
  try {
    const url = new URL(event.req.url);
    const slug = url.searchParams.get('race');

    const convexUrl = process.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      throw new Error('Missing VITE_CONVEX_URL');
    }
    const convex = new ConvexHttpClient(convexUrl);

    const race: Doc<'races'> | null = slug
      ? await convex.query(api.races.getRaceBySlug, { slug })
      : await convex.query(api.races.getNextRace, {});
    if (!race) {
      return DEFAULT_IMAGE_REDIRECT.clone();
    }

    // The race session locks last, so quoting `predictionLockAt` would tell a
    // reader they have days longer than they do to get quali picks in.
    const lock = formatRaceLocalLockDate(getNextSessionLockAt(race), race.slug);
    if (!lock) {
      return DEFAULT_IMAGE_REDIRECT.clone();
    }

    const flagSrc = await loadFlagDataUri(url.origin, race);

    const png = await startServerSpan({ name: 'og.renderNextRaceCard' }, () =>
      renderOgImage(
        nextRaceTemplate({
          raceName: race.name,
          round: race.round,
          season: race.season,
          lockDate: lock.date.toUpperCase(),
          lockTime: lock.time,
          flagSrc,
        }),
      ),
    );

    // Copy into a fresh Uint8Array<ArrayBuffer> — renderOgImage's output is
    // typed over ArrayBufferLike, which BodyInit rejects.
    return new Response(new Uint8Array(png), {
      headers: {
        'content-type': 'image/png',
        // The lock instant is fixed, so for a given slug this image never
        // changes. Cache it hard; a new round arrives as a new URL.
        'cache-control': 'public, max-age=86400, s-maxage=86400',
      },
    });
  } catch (error) {
    captureServerException(error, { name: 'og.nextRaceCard' });
    console.error('[og/next] render_failed_falling_back_to_default', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });
    return DEFAULT_IMAGE_REDIRECT.clone();
  }
}
