import { api } from '@convex-generated/api';
import { ConvexHttpClient } from 'convex/browser';

import { captureServerException, startServerSpan } from '../../../lib/sentry';
import {
  buildTrmnlPayload,
  selectTrmnlRace,
} from '../../../../src/lib/trmnl/payload';
import {
  loadTrmnlOffSeason,
  loadTrmnlWeekend,
} from '../../../../src/lib/trmnl/weekendData';

type RouteEvent = {
  req: Request;
};

/**
 * The polling endpoint for the Grand Prix Picks TRMNL plugin
 * (`apps/trmnl`, spec in `docs/trmnl-plugin-specification.md`).
 *
 * Public and viewer-free: everything here is on the site already. TRMNL
 * interpolates the device owner's zone and language into the query string
 * (`?tz={{ trmnl.user.time_zone_iana }}&locale={{ trmnl.user.locale }}`), so
 * one URL serves every install and the edge can cache per zone.
 *
 * On failure this answers 503 rather than an empty payload. TRMNL keeps the
 * last good screen when a poll fails, and yesterday's weekend is a better
 * thing to leave on a wall than a blank one.
 */
export default async function handler(event: RouteEvent) {
  try {
    const url = new URL(event.req.url);
    const convexUrl = process.env.VITE_CONVEX_URL;
    if (!convexUrl) {
      throw new Error('Missing VITE_CONVEX_URL');
    }
    const convex = new ConvexHttpClient(convexUrl);
    const now = Date.now();

    const payload = await startServerSpan(
      { name: 'trmnl.weekend' },
      async () => {
        const { season, races } = await convex.query(
          api.races.listCurrentSeason,
          {},
        );
        const race = selectTrmnlRace(races, now);
        const base = {
          now,
          timeZone: url.searchParams.get('tz'),
          locale: url.searchParams.get('locale'),
        };

        if (!race) {
          // The off-season: the season just run, and the site's other news.
          return buildTrmnlPayload({
            ...base,
            race: null,
            results: {},
            practice: [],
            weather: null,
            ...(await loadTrmnlOffSeason(convex, season)),
          });
        }

        const weekend = await loadTrmnlWeekend(convex, race, now);
        return buildTrmnlPayload({ ...base, ...weekend });
      },
    );

    return new Response(JSON.stringify(payload), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        // Short, because a result or a grid should reach a 5-minute TRMNL+
        // device within a poll or two. Every device in a zone shares an entry.
        'cache-control': 'public, max-age=60, s-maxage=60',
        'access-control-allow-origin': '*',
      },
    });
  } catch (error) {
    captureServerException(error, { name: 'trmnl.weekend' });
    console.error('[api/trmnl/weekend] failed', {
      message: error instanceof Error ? error.message : 'unknown_error',
    });
    return new Response(JSON.stringify({ error: 'unavailable' }), {
      status: 503,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'no-store',
      },
    });
  }
}
