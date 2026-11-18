import { api } from '@convex-generated/api';

import { buildLocksCalendar } from '../../../src/lib/locksCalendar';
import { siteConfig } from '../../../src/lib/site';
import { getServerConvexClient } from '../../lib/convex';
import { captureServerException, startServerSpan } from '../../lib/sentry';

/**
 * The pick-lock calendar feed (`src/lib/locksCalendar.ts`), for calendar apps
 * to subscribe to. Public and viewer-free, so the edge keeps one copy for an
 * hour; calendar apps poll far less often than that anyway.
 *
 * On failure this answers 503 rather than an empty calendar: a subscribed app
 * would read an empty feed as "every event was deleted".
 */
export default async function handler() {
  try {
    const convex = getServerConvexClient();
    const races = await startServerSpan({ name: 'calendar.picks' }, () =>
      convex.query(api.races.listRaces, {}),
    );
    const body = buildLocksCalendar({
      races,
      now: Date.now(),
      siteUrl: siteConfig.url,
    });
    return new Response(body, {
      headers: {
        'content-type': 'text/calendar; charset=utf-8',
        'content-disposition': 'inline; filename="grand-prix-picks-locks.ics"',
        'cache-control': 'public, max-age=3600, s-maxage=3600',
        'x-robots-tag': 'noindex',
      },
    });
  } catch (error) {
    captureServerException(error, { name: 'calendar.picks' });
    console.error('[calendar/picks.ics] failed', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });
    return new Response('unavailable', {
      status: 503,
      headers: { 'cache-control': 'no-store' },
    });
  }
}
