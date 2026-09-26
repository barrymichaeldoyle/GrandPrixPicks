import { api } from '@convex-generated/api';
import { ConvexHttpClient } from 'convex/browser';

import { captureServerException, startServerSpan } from '../../../lib/sentry';
import {
  buildTrmnlPayload,
  selectTrmnlRace,
} from '../../../../src/lib/trmnl/payload';
import type { MeasurementUnits } from '../../../../src/lib/weatherPresentation';
import {
  loadTrmnlOffSeason,
  loadTrmnlWeekend,
} from '../../../../src/lib/trmnl/weekendData';

type RouteEvent = {
  req: Request;
};

function validPollingQuery(params: URLSearchParams): boolean {
  const keys = [...params.keys()];
  if (
    keys.length > 3 ||
    keys.some((key) => key !== 'tz' && key !== 'locale' && key !== 'units') ||
    new Set(keys).size !== keys.length
  ) {
    return false;
  }

  const timeZone = params.get('tz');
  const locale = params.get('locale');
  const units = params.get('units')?.toLowerCase();
  if ((timeZone?.length ?? 0) > 64 || (locale?.length ?? 0) > 35) {
    return false;
  }
  if (units && units !== 'metric' && units !== 'imperial') {
    return false;
  }

  try {
    if (timeZone) {
      new Intl.DateTimeFormat('en', { timeZone });
    }
    if (locale && Intl.DateTimeFormat.supportedLocalesOf(locale).length === 0) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * The polling endpoint for the Grand Prix Picks TRMNL plugin
 * (`apps/trmnl`, spec in `docs/trmnl-plugin-specification.md`).
 *
 * Public and viewer-free: everything here is on the site already. TRMNL
 * interpolates the device owner's zone, language, and unit preference into
 * the query string, so one URL serves every install and the edge can cache
 * per preference.
 *
 * On failure this answers 503 rather than an empty payload. TRMNL keeps the
 * last good screen when a poll fails, and yesterday's weekend is a better
 * thing to leave on a wall than a blank one.
 */
export default async function handler(event: RouteEvent) {
  try {
    const url = new URL(event.req.url);
    if (!validPollingQuery(url.searchParams)) {
      return new Response(JSON.stringify({ error: 'invalid_query' }), {
        status: 400,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store',
        },
      });
    }
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
        const units: MeasurementUnits =
          url.searchParams.get('units')?.toLowerCase() === 'imperial'
            ? 'imperial'
            : 'metric';
        const base = {
          now,
          timeZone: url.searchParams.get('tz'),
          locale: url.searchParams.get('locale'),
          units,
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
