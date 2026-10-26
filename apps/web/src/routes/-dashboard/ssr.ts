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
export const fetchDashboardSsrData = createServerFn({ method: 'GET' }).handler(
  async (): Promise<DashboardSsrData | null> => {
    try {
      const request = getRequest();
      // The same test the cache headers use. A request that `__client_uat`
      // calls signed out is given public, edge-cached HTML, so reading the
      // viewer's dashboard off a lingering `__session` here would put one
      // player's picks and leagues in the page every visitor is then served.
      if (!(await isClerkSessionPresent(request))) {
        return null;
      }
      const token = await getFreshClerkSessionToken(request);
      if (!token) {
        return null;
      }

      const convexUrl = import.meta.env.VITE_CONVEX_URL;
      if (!convexUrl) {
        return null;
      }

      const client = new ConvexHttpClient(convexUrl);
      client.setAuth(token);
      const weatherNow = bucketWeatherNow(Date.now());
      const [dashboard, weather] = await Promise.all([
        client.query(api.home.getDashboardPageData, {}),
        client.query(api.weather.getUpcoming, { now: weatherNow }),
      ]);
      if (!dashboard) {
        return null;
      }
      return { ...dashboard, weather, weatherNow };
    } catch (error) {
      // A Convex error, or a session that ended between the mint and the read.
      // The page still works, from the client; logged so a skeleton that
      // should have been a dashboard can be told apart from a failed mint.
      console.warn('[dashboard-ssr] read failed', {
        error:
          error instanceof Error
            ? `${error.name}: ${error.message}`
            : 'unknown',
      });
      return null;
    }
  },
);
