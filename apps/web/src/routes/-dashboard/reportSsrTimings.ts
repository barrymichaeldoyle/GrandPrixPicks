import { useEffect, useRef } from 'react';

import { captureAnalyticsEvent } from '@/lib/analytics';
import type { DashboardSsrTimings } from './ssr';

type HomeSsrTimings = DashboardSsrTimings & {
  homeQueryMs: number | null;
};

/**
 * Sends `dashboard_ssr_timed` once for a server-rendered signed-in dashboard,
 * so the stage timings come from players' phones and not from one desktop
 * check. `ttfb_ms` is the browser's own wait for the HTML, which includes the
 * network the server timings cannot see.
 */
export function useReportSsrTimings(
  timings: HomeSsrTimings | null,
  miss: string | null,
) {
  const reported = useRef(false);
  useEffect(() => {
    if (!timings || reported.current) {
      return;
    }
    reported.current = true;
    const navigation = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined;
    captureAnalyticsEvent('dashboard_ssr_timed', {
      session_ms: timings.sessionMs,
      token_ms: timings.tokenMs,
      minted: timings.minted,
      dashboard_ms: timings.dashboardMs,
      weather_ms: timings.weatherMs,
      total_ms: timings.totalMs,
      home_query_ms: timings.homeQueryMs,
      ttfb_ms: navigation ? Math.round(navigation.responseStart) : null,
      miss,
    });
  }, [timings, miss]);
}
