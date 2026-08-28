import { api } from '@convex-generated/api';
import type { FunctionReturnType } from 'convex/server';
import { ConvexHttpClient } from 'convex/browser';
import { createServerFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';

import { getClerkSessionToken } from '../../../server/lib/auth';

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
      const token = await getClerkSessionToken(getRequest());
      if (!token) {
        return null;
      }

      const convexUrl = import.meta.env.VITE_CONVEX_URL;
      if (!convexUrl) {
        return null;
      }

      const client = new ConvexHttpClient(convexUrl);
      client.setAuth(token);
      const weatherNow = Date.now();
      const [dashboard, weather] = await Promise.all([
        client.query(api.home.getDashboardPageData, {}),
        client.query(api.weather.getUpcoming, { now: weatherNow }),
      ]);
      if (!dashboard) {
        return null;
      }
      return { ...dashboard, weather, weatherNow };
    } catch {
      // Includes the ordinary case of a token that expired since the tab was
      // last used, which is common enough on a resumed mobile tab that it is
      // not worth reporting. The page still works.
      return null;
    }
  },
);
