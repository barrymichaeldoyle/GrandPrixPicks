import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useReportSsrTimings } from './reportSsrTimings';

const analytics = vi.hoisted(() => ({ capture: vi.fn() }));
vi.mock('@/lib/analytics', () => ({
  captureAnalyticsEvent: analytics.capture,
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

type Timings = Parameters<typeof useReportSsrTimings>[0];

const TIMINGS: NonNullable<Timings> = {
  sessionMs: 1,
  tokenMs: 420,
  minted: true,
  dashboardMs: 300,
  weatherMs: 120,
  totalMs: 730,
  homeQueryMs: 560,
};

function Probe({ timings }: { timings: Timings }) {
  useReportSsrTimings(timings, null);
  return null;
}

describe('useReportSsrTimings', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    analytics.capture.mockReset();
    container = document.createElement('div');
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
  });

  it('reports a server-rendered dashboard once, however often it renders', () => {
    act(() => root.render(<Probe timings={TIMINGS} />));
    act(() => root.render(<Probe timings={{ ...TIMINGS }} />));

    expect(analytics.capture).toHaveBeenCalledTimes(1);
    expect(analytics.capture).toHaveBeenCalledWith(
      'dashboard_ssr_timed',
      expect.objectContaining({
        token_ms: 420,
        minted: true,
        dashboard_ms: 300,
        home_query_ms: 560,
        total_ms: 730,
        miss: null,
      }),
    );
  });

  it('sends nothing without timings (signed out, or a client navigation)', () => {
    act(() => root.render(<Probe timings={null} />));

    expect(analytics.capture).not.toHaveBeenCalled();
  });
});
