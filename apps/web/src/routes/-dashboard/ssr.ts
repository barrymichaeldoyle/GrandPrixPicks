import { api } from '@convex-generated/api';
import type { FunctionReturnType } from 'convex/server';
import { ConvexHttpClient } from 'convex/browser';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { bucketWeatherNow } from '@/lib/weatherNow';
import {
  getFreshClerkSessionToken,
  isClerkSessionPresent,
} from '../../../server/lib/auth';

export type DashboardSsrData = FunctionReturnType<
  typeof api.home.getDashboardPageData
> & {
  weather: FunctionReturnType<typeof api.weather.getUpcoming>;
  weatherNow: number;
};

/**
 * Reads the signed-in dashboard's above-the-fold data during SSR, as the
 * viewer.
 *
 * The dashboard used to server-render as a skeleton, and the reason was never
 * that viewer data cannot be rendered on the server — `React.lazy` resolves
 * server-side here and `DashboardPage` renders fine. It was that the SSR Convex
 * read was anonymous, so `races.getCurrentWeekend` answered with the pre-auth
 * payload, `weekendReflectsViewer` correctly refused it, and the card held its
 * skeleton until the client could ask again with an identity. That cost every
 * returning player a couple of seconds of grey rectangles on the one page whose
 * job is "have I made my picks yet".
 *
 * A fresh client per call, never the shared `convexHttp`. That singleton is
 * module scope, and a Cloudflare isolate serves many requests: `setAuth` on it
 * would put one viewer's identity on another viewer's render. This is the whole
 * risk in the change, and a local `new ConvexHttpClient` is the whole mitigation
 * — so the client must stay inside this function, where it cannot outlive the
 * request.
 *
 * Everything here is additive. No token, an expired token, a Convex error: all
 * three return null, and null is exactly the state the page was in before this
 * existed, so it falls back to fetching on the client. There is no case where
 * this is worse than not having it.
 */
/**
 * The dashboard, or why a signed-in render came back without it: the stage
 * and error, never a token. The reason travels in the loader data, which is
 * serialized into this viewer's own `private, no-store` document, because
 * Pages will not tail this project's logs and server-side Sentry does not run
 * there. A header set from here did not reach the document.
 */
export type DashboardSsrResult = {
  data: DashboardSsrData | null;
  miss: string | null;
  /** Null for a signed-out request, which never reaches the slow stages. */
  timings: DashboardSsrTimings | null;
};

/**
 * Milliseconds per stage of a signed-in read, so a slow dashboard can be
 * pinned on Clerk or on Convex. Signed-in HTML cannot come from the edge
 * cache, and on 2026-11-24 the origin took 0.5-2.1 s to answer it against
 * ~0.13 s for the cached signed-out page. A stage that never ran is null.
 *
 * On Workers the clock only moves across I/O, which is what these measure.
 */
export type DashboardSsrTimings = {
  sessionMs: number;
  tokenMs: number | null;
  /** The cookie's token was stale, so `tokenMs` includes a mint at Clerk. */
  minted: boolean;
  dashboardMs: number | null;
  weatherMs: number | null;
  totalMs: number;
};

async function timed<T>(
  work: Promise<T>,
  record: (ms: number) => void,
): Promise<T> {
  const start = Date.now();
  try {
    return await work;
  } finally {
    record(Date.now() - start);
  }
}

export const fetchDashboardSsrData = createServerFn({ method: 'GET' }).handler(
  async (): Promise<DashboardSsrResult> => {
    let miss: string | null = null;
    function reportSsrMiss(reason: string) {
      console.warn('[dashboard-ssr] no viewer data', reason);
      miss = reason;
    }
    const startedAt = Date.now();
    const timings: DashboardSsrTimings = {
      sessionMs: 0,
      tokenMs: null,
      minted: false,
      dashboardMs: null,
      weatherMs: null,
      totalMs: 0,
    };
    function finish(data: DashboardSsrData | null): DashboardSsrResult {
      timings.totalMs = Date.now() - startedAt;
      return { data, miss, timings };
    }
    try {
      const request = getRequest();
      // The same test the cache headers use. A request that `__client_uat`
      // calls signed out is given public, edge-cached HTML, so reading the
      // viewer's dashboard off a lingering `__session` here would put one
      // player's picks and leagues in the page every visitor is then served.
      // No timings either: that HTML is shared, and they would be noise in it.
      const signedIn = await timed(isClerkSessionPresent(request), (ms) => {
        timings.sessionMs = ms;
      });
      if (!signedIn) {
        return { data: null, miss: 'signed_out', timings: null };
      }
      const token = await timed(
        getFreshClerkSessionToken(request, reportSsrMiss, () => {
          timings.minted = true;
        }),
        (ms) => {
          timings.tokenMs = ms;
        },
      );
      if (!token) {
        miss ??= 'no_token';
        return finish(null);
      }

      const convexUrl = import.meta.env.VITE_CONVEX_URL;
      if (!convexUrl) {
        miss = 'no_convex_url';
        return finish(null);
      }

      const client = new ConvexHttpClient(convexUrl);
      client.setAuth(token);
      const weatherNow = bucketWeatherNow(Date.now());
      const [dashboard, weather] = await Promise.all([
        timed(client.query(api.home.getDashboardPageData, {}), (ms) => {
          timings.dashboardMs = ms;
        }),
        timed(
          client.query(api.weather.getUpcoming, { now: weatherNow }),
          (ms) => {
            timings.weatherMs = ms;
          },
        ),
      ]);
      if (!dashboard) {
        miss = 'no_dashboard';
        return finish(null);
      }
      return finish({ ...dashboard, weather, weatherNow });
    } catch (error) {
      // A Convex error, or a session that ended between the mint and the read.
      // The page still works, from the client.
      reportSsrMiss(
        `read: ${
          error instanceof Error ? `${error.name}: ${error.message}` : 'unknown'
        }`.slice(0, 200),
      );
      return finish(null);
    }
  },
);
