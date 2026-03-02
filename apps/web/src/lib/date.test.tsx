import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { formatDate, formatDateLong, formatTime, useCountdown } from './date';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

function withMockedNow<T>(now: number, run: () => T): T {
  const spy = vi.spyOn(Date, 'now').mockReturnValue(now);
  try {
    return run();
  } finally {
    spy.mockRestore();
  }
}

function renderUseCountdown(timestamp: number) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  let latest: string | null = null;

  function TestHarness() {
    latest = useCountdown(timestamp);
    return null;
  }

  act(() => {
    root.render(<TestHarness />);
  });

  return {
    getLatest: () => latest,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('useCountdown', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows Started when the timestamp is now or in the past', () => {
    withMockedNow(1_000, () => {
      const { getLatest, unmount } = renderUseCountdown(1_000);
      expect(getLatest()).toBe('Started');
      unmount();
    });

    withMockedNow(2_000, () => {
      const { getLatest, unmount } = renderUseCountdown(1_999);
      expect(getLatest()).toBe('Started');
      unmount();
    });
  });

  it('formats countdown with days when at least one day remains', () => {
    withMockedNow(1_000, () => {
      const target =
        1_000 + (2 * 24 * 60 * 60 + 3 * 60 * 60 + 4 * 60 + 5) * 1_000;
      const { getLatest, unmount } = renderUseCountdown(target);
      expect(getLatest()).toBe('2d 3h 4m 5s');
      unmount();
    });
  });

  it('formats countdown without days under 24 hours', () => {
    withMockedNow(10_000, () => {
      const target = 10_000 + (5 * 60 * 60 + 6 * 60 + 7) * 1_000;
      const { getLatest, unmount } = renderUseCountdown(target);
      expect(getLatest()).toBe('5h 6m 7s');
      unmount();
    });
  });
});

describe('date formatting helpers', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls toLocaleDateString with expected short-date options', () => {
    const dateSpy = vi
      .spyOn(Date.prototype, 'toLocaleDateString')
      .mockReturnValue('mock-date');

    const result = formatDate(1_700_000_000_000);

    expect(result).toBe('mock-date');
    expect(dateSpy).toHaveBeenCalledWith(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  });

  it('calls toLocaleTimeString with expected time options', () => {
    const timeSpy = vi
      .spyOn(Date.prototype, 'toLocaleTimeString')
      .mockReturnValue('mock-time');

    const result = formatTime(1_700_000_000_000);

    expect(result).toBe('mock-time');
    expect(timeSpy).toHaveBeenCalledWith(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  });

  it('calls toLocaleDateString with expected long-date options', () => {
    const dateSpy = vi
      .spyOn(Date.prototype, 'toLocaleDateString')
      .mockReturnValue('mock-long-date');

    const result = formatDateLong(1_700_000_000_000);

    expect(result).toBe('mock-long-date');
    expect(dateSpy).toHaveBeenCalledWith(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  });
});
