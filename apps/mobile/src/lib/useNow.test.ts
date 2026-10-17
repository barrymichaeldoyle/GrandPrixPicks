import { describe, expect, it } from 'vitest';

import {
  COARSE_TICK_MS,
  countdownTickMs,
  SECONDS_SHOWN_WITHIN_MS,
} from './useNow';

const now = 1_700_000_000_000;

describe('countdownTickMs', () => {
  it('ticks every second once a target is inside the last day', () => {
    expect(countdownTickMs([now + 60_000], now)).toBe(1000);
    expect(countdownTickMs([now + SECONDS_SHOWN_WITHIN_MS - 1], now)).toBe(
      1000,
    );
  });

  it('ticks coarsely while every target shows days', () => {
    expect(countdownTickMs([now + SECONDS_SHOWN_WITHIN_MS], now)).toBe(
      COARSE_TICK_MS,
    );
    expect(countdownTickMs([now + 3 * SECONDS_SHOWN_WITHIN_MS], now)).toBe(
      COARSE_TICK_MS,
    );
  });

  it('uses the nearest future target and ignores passed or missing ones', () => {
    expect(
      countdownTickMs(
        [
          now - 1000,
          null,
          undefined,
          now + 5 * SECONDS_SHOWN_WITHIN_MS,
          now + 10_000,
        ],
        now,
      ),
    ).toBe(1000);
  });

  it('ticks coarsely with nothing ahead', () => {
    expect(countdownTickMs([], now)).toBe(COARSE_TICK_MS);
    expect(countdownTickMs([now - 1], now)).toBe(COARSE_TICK_MS);
  });
});
