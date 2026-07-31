import { describe, expect, it } from 'vitest';

import {
  formatRaceLocalLockDate,
  formatRaceLocalLockTime,
} from './raceLockTime';

describe('formatRaceLocalLockTime', () => {
  it('formats in the circuit timezone, not the machine timezone', () => {
    // 2026-08-28T14:30:00Z is 16:30 in Amsterdam (CEST, UTC+2).
    expect(
      formatRaceLocalLockTime(
        Date.parse('2026-08-28T14:30:00Z'),
        'netherlands-2026',
      ),
    ).toBe('Friday, 16:30 CEST');
  });

  it('follows the circuit through its own daylight-saving change', () => {
    // Same circuit in November: CET, so the same UTC instant is an hour earlier.
    expect(
      formatRaceLocalLockTime(
        Date.parse('2026-11-06T14:30:00Z'),
        'netherlands-2026',
      ),
    ).toBe('Friday, 15:30 CET');
  });

  it('crosses the date line into the next local day where the zone requires it', () => {
    // 23:00 UTC on the Friday is Saturday morning in Melbourne.
    const formatted = formatRaceLocalLockTime(
      Date.parse('2026-03-06T23:00:00Z'),
      'australia-2026',
    );
    expect(formatted).toMatch(/^Saturday, 10:00 /);
  });

  it('uses a 24-hour clock rather than am/pm', () => {
    expect(
      formatRaceLocalLockTime(
        Date.parse('2026-07-04T13:00:00Z'),
        'britain-2026',
      ),
    ).toBe('Saturday, 14:00 BST');
  });

  it('returns null for a slug with no known timezone, so callers can omit it', () => {
    expect(
      formatRaceLocalLockTime(
        Date.parse('2026-07-04T13:00:00Z'),
        'atlantis-2026',
      ),
    ).toBeNull();
  });
});

describe('formatRaceLocalLockDate', () => {
  it('splits the deadline into a dated headline and its time', () => {
    expect(
      formatRaceLocalLockDate(
        Date.parse('2026-08-28T14:30:00Z'),
        'netherlands-2026',
      ),
    ).toEqual({ date: 'Fri 28 Aug', time: '16:30 CEST' });
  });

  it('dates the session in the circuit timezone, not the machine timezone', () => {
    // 23:00 UTC on the Friday is already Saturday morning in Melbourne.
    expect(
      formatRaceLocalLockDate(
        Date.parse('2026-03-06T23:00:00Z'),
        'australia-2026',
      )?.date,
    ).toBe('Sat 7 Mar');
  });

  it('returns null for a slug with no known timezone', () => {
    expect(
      formatRaceLocalLockDate(
        Date.parse('2026-07-04T13:00:00Z'),
        'atlantis-2026',
      ),
    ).toBeNull();
  });
});
