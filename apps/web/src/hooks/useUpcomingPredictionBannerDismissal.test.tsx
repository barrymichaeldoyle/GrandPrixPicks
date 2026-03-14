import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useUpcomingPredictionBannerDismissal } from './useUpcomingPredictionBannerDismissal';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function renderHook(
  raceSlug?: string | null,
  nudgeKind: 'top5' | 'h2h' = 'top5',
) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  let latest: ReturnType<typeof useUpcomingPredictionBannerDismissal> | null =
    null;

  function TestHarness({
    slug,
    kind,
  }: {
    slug?: string | null;
    kind: 'top5' | 'h2h';
  }) {
    latest = useUpcomingPredictionBannerDismissal(slug, kind);
    return null;
  }

  act(() => {
    root.render(<TestHarness slug={raceSlug} kind={nudgeKind} />);
  });

  return {
    getLatest: () => latest,
    rerender: (
      slug?: string | null,
      kind: 'top5' | 'h2h' = nudgeKind,
    ) => {
      act(() => {
        root.render(<TestHarness slug={slug} kind={kind} />);
      });
    },
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('useUpcomingPredictionBannerDismissal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('starts visible when there is no active dismissal', () => {
    const { getLatest, unmount } = renderHook('australia-2026');

    expect(getLatest()?.dismissed).toBe(false);

    unmount();
  });

  it('records a dismissal for one day', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000);
    const { getLatest, unmount } = renderHook('australia-2026');

    act(() => {
      getLatest()?.dismiss();
    });

    expect(getLatest()?.dismissed).toBe(true);
    expect(
      Number(
        localStorage.getItem(
          'upcoming-prediction-banner-dismissed:australia-2026:top5',
        ),
      ),
    ).toBe(1_000 + 24 * 60 * 60 * 1000);

    unmount();
  });

  it('restores visibility after the dismissal expires', () => {
    localStorage.setItem(
      'upcoming-prediction-banner-dismissed:australia-2026:top5',
      String(5_000),
    );
    vi.spyOn(Date, 'now').mockReturnValue(6_000);

    const { getLatest, unmount } = renderHook('australia-2026');

    expect(getLatest()?.dismissed).toBe(false);

    unmount();
  });

  it('tracks dismissal per race slug', () => {
    localStorage.setItem(
      'upcoming-prediction-banner-dismissed:australia-2026:top5',
      String(Date.now() + 60_000),
    );

    const { getLatest, rerender, unmount } = renderHook('australia-2026');
    expect(getLatest()?.dismissed).toBe(true);

    rerender('china-2026');
    expect(getLatest()?.dismissed).toBe(false);

    unmount();
  });

  it('tracks dismissal separately for top5 and h2h nudges', () => {
    localStorage.setItem(
      'upcoming-prediction-banner-dismissed:australia-2026:top5',
      String(Date.now() + 60_000),
    );

    const { getLatest, rerender, unmount } = renderHook(
      'australia-2026',
      'top5',
    );
    expect(getLatest()?.dismissed).toBe(true);

    rerender('australia-2026', 'h2h');
    expect(getLatest()?.dismissed).toBe(false);

    unmount();
  });
});
