import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  formatCalendarDate,
  formatDate,
  formatDateLong,
  formatDateTime,
  formatInTimeZone,
  formatMonthDay,
  formatTime,
  useCountdown,
} from './date';

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
  it('calls toLocaleDateString with expected short-date options', () => {
    const dateSpy = vi
      .spyOn(Date.prototype, 'toLocaleDateString')
      .mockReturnValue('mock-date');

    expect(formatDate(1_700_000_000_000)).toBe('mock-date');
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

    expect(formatTime(1_700_000_000_000)).toBe('mock-time');
    expect(timeSpy).toHaveBeenCalledWith(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  });

  it('calls toLocaleDateString with expected long-date options', () => {
    const dateSpy = vi
      .spyOn(Date.prototype, 'toLocaleDateString')
      .mockReturnValue('mock-long-date');

    expect(formatDateLong(1_700_000_000_000)).toBe('mock-long-date');
    expect(dateSpy).toHaveBeenCalledWith(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  });

  it('calls toLocaleDateString with expected month-day options', () => {
    const dateSpy = vi
      .spyOn(Date.prototype, 'toLocaleDateString')
      .mockReturnValue('mock-calendar-date');

    expect(formatMonthDay(1_700_000_000_000)).toBe('mock-calendar-date');
    expect(dateSpy).toHaveBeenCalledWith(undefined, {
      month: 'short',
      day: 'numeric',
    });
  });

  it('calls toLocaleDateString with expected calendar-date options', () => {
    const dateSpy = vi
      .spyOn(Date.prototype, 'toLocaleDateString')
      .mockReturnValue('mock-calendar-date');

    expect(formatCalendarDate(1_700_000_000_000)).toBe('mock-calendar-date');
    expect(dateSpy).toHaveBeenCalledWith(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  it('calls toLocaleString for combined date-time values', () => {
    const dateTimeSpy = vi
      .spyOn(Date.prototype, 'toLocaleString')
      .mockReturnValue('mock-datetime');

    expect(formatDateTime(1_700_000_000_000)).toBe('mock-datetime');
    expect(dateTimeSpy).toHaveBeenCalledWith();
  });

  it('formats dates in an explicit time zone with a local fallback', () => {
    const timestamp = 1_700_000_000_000;

    expect(
      formatInTimeZone(timestamp, 'Australia/Melbourne', {
        weekday: 'short',
      }),
    ).toBe(
      new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        timeZone: 'Australia/Melbourne',
      }).format(timestamp),
    );

    expect(
      formatInTimeZone(timestamp, 'Not/AZone', {
        weekday: 'short',
      }),
    ).toBe(
      new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
      }).format(timestamp),
    );
  });
});
