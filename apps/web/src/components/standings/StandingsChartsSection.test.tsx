import { act, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { expect, it, vi } from 'vitest';
import { StandingsChartsSection } from './StandingsChartsSection';

const lifecycle = vi.hoisted(() => ({ mount: vi.fn(), cleanup: vi.fn() }));
vi.mock('./charts/standingsCharts', () => {
  function Chart() {
    const [selected, setSelected] = useState(false);
    useEffect(() => {
      lifecycle.mount();
      return () => {
        lifecycle.cleanup();
      };
    }, []);
    return (
      <button onClick={() => setSelected(!selected)} aria-pressed={selected}>
        Series
      </button>
    );
  }
  return { GapChart: Chart, ProgressionChart: Chart, BumpChart: Chart };
});

it('loads only visited charts, retains selection, and pauses hidden effects', async () => {
  let enterViewport: (() => void) | undefined;
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
        enterViewport = () => callback([{ isIntersecting: true }]);
      }
      observe() {}
      disconnect() {}
    },
  );
  const container = document.createElement('div');
  document.body.append(container);
  const root = createRoot(container);
  try {
    await act(async () =>
      root.render(
        <StandingsChartsSection
          idPrefix="test"
          unit="driver"
          gapSeries={[]}
          lineSeries={[]}
          bumpSeries={[]}
          rounds={[]}
          summaries={{ gap: '', progression: '', bump: '' }}
        />,
      ),
    );
    expect(lifecycle.mount).not.toHaveBeenCalled();
    await act(async () => enterViewport!());
    // Resolve the lazy module before asserting lifecycle behavior.
    await vi.waitFor(() => expect(lifecycle.mount).toHaveBeenCalledTimes(1));
    const series = container.querySelector<HTMLButtonElement>(
      'button[aria-pressed]',
    )!;
    await act(async () => series.click());
    expect(series.getAttribute('aria-pressed')).toBe('true');
    await act(async () =>
      container
        .querySelector<HTMLButtonElement>('#test-charts-progression')!
        .click(),
    );
    expect(lifecycle.cleanup).toHaveBeenCalledTimes(1);
    expect(lifecycle.mount).toHaveBeenCalledTimes(2);
    await act(async () =>
      container.querySelector<HTMLButtonElement>('#test-charts-gap')!.click(),
    );
    expect(series.isConnected).toBe(true);
    expect(series.getAttribute('aria-pressed')).toBe('true');
    expect(lifecycle.mount).toHaveBeenCalledTimes(3);
    expect(lifecycle.cleanup).toHaveBeenCalledTimes(2);
  } finally {
    await act(async () => root.unmount());
    container.remove();
    vi.unstubAllGlobals();
  }
});
