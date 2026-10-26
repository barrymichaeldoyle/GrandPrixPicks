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
};

export const fetchDashboardSsrData = createServerFn({ method: 'GET' }).handler(
  async (): Promise<DashboardSsrResult> => {
    let miss: string | null = null;
    function reportSsrMiss(reason: string) {
      console.warn('[dashboard-ssr] no viewer data', reason);
      miss = reason;
    }
    try {
      const request = getRequest();
      // The same test the cache headers use. A request that `__client_uat`
      // calls signed out is given public, edge-cached HTML, so reading the
      // viewer's dashboard off a lingering `__session` here would put one
      // player's picks and leagues in the page every visitor is then served.
      if (!(await isClerkSessionPresent(request))) {
        return { data: null, miss: 'signed_out' };
      }
      const token = await getFreshClerkSessionToken(request, reportSsrMiss);
      if (!token) {
        return { data: null, miss: miss ?? 'no_token' };
      }

      const convexUrl = import.meta.env.VITE_CONVEX_URL;
      if (!convexUrl) {
        return { data: null, miss: 'no_convex_url' };
      }

      const client = new ConvexHttpClient(convexUrl);
      client.setAuth(token);
      const weatherNow = bucketWeatherNow(Date.now());
      const [dashboard, weather] = await Promise.all([
        client.query(api.home.getDashboardPageData, {}),
        client.query(api.weather.getUpcoming, { now: weatherNow }),
      ]);
      if (!dashboard) {
        return { data: null, miss: 'no_dashboard' };
      }
      return { data: { ...dashboard, weather, weatherNow }, miss: null };
    } catch (error) {
      // A Convex error, or a session that ended between the mint and the read.
      // The page still works, from the client.
      reportSsrMiss(
        `read: ${
          error instanceof Error ? `${error.name}: ${error.message}` : 'unknown'
        }`.slice(0, 200),
      );
      return { data: null, miss };
    }
  },
);
