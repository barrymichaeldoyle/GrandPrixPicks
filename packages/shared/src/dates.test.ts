import { describe, expect, it } from 'vitest';

import { getCountdownParts } from './dates';

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('getCountdownParts', () => {
  it('returns null once the span has elapsed', () => {
    expect(getCountdownParts(0)).toBeNull();
    expect(getCountdownParts(-1)).toBeNull();
    expect(getCountdownParts(-DAY)).toBeNull();
  });

  it('decomposes a multi-day span', () => {
    const ms = 2 * DAY + 3 * HOUR + 4 * MINUTE + 5 * SECOND;
    expect(getCountdownParts(ms)).toEqual({
      days: 2,
      hours: 3,
      minutes: 4,
      seconds: 5,
    });
  });

  it('decomposes a sub-day span with zero days', () => {
    const ms = 5 * HOUR + 6 * MINUTE + 7 * SECOND;
    expect(getCountdownParts(ms)).toEqual({
      days: 0,
      hours: 5,
      minutes: 6,
      seconds: 7,
    });
  });

  it('floors partial seconds', () => {
    expect(getCountdownParts(1500)).toEqual({
      days: 0,
      hours: 0,
      minutes: 0,
      seconds: 1,
    });
  });
});
