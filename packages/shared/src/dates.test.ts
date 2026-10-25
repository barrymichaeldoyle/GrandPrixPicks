import { describe, expect, it } from 'vitest';

import { formatRelativeTime, getCountdownParts } from './dates';

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

describe('formatRelativeTime', () => {
  const now = Date.parse('2026-10-25T12:00:00Z');

  it('counts up to a month, then gives the date', () => {
    expect(formatRelativeTime(now - 20_000, now)).toBe('just now');
    expect(formatRelativeTime(now - 5 * 60_000, now)).toBe('5m ago');
    expect(formatRelativeTime(now - 3 * 3_600_000, now)).toBe('3h ago');
    expect(formatRelativeTime(now - 12 * 86_400_000, now)).toBe('12d ago');
    expect(formatRelativeTime(now - 40 * 86_400_000, now)).not.toMatch(/ago$/);
  });

  it('adds the year to a date from a previous year', () => {
    expect(formatRelativeTime(Date.parse('2025-06-01T12:00:00Z'), now)).toMatch(
      /2025/,
    );
  });
});
