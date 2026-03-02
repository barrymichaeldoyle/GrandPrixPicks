import { describe, expect, it } from 'vitest';

import { getRaceTimeZoneFromSlug } from './raceTimezones';

describe('getRaceTimeZoneFromSlug', () => {
  it('maps canonical slugs to a track timezone', () => {
    expect(getRaceTimeZoneFromSlug('australia')).toBe('Australia/Melbourne');
    expect(getRaceTimeZoneFromSlug('las-vegas')).toBe('America/Los_Angeles');
    expect(getRaceTimeZoneFromSlug('abu-dhabi')).toBe('Asia/Dubai');
  });

  it('normalizes case and strips trailing year suffixes', () => {
    expect(getRaceTimeZoneFromSlug('AuStRaLiAn-2026')).toBe(
      'Australia/Melbourne',
    );
    expect(getRaceTimeZoneFromSlug('UNITED-STATES-2025')).toBe(
      'America/Chicago',
    );
  });

  it('returns undefined for unknown slugs', () => {
    expect(getRaceTimeZoneFromSlug('made-up-grand-prix-2026')).toBeUndefined();
  });
});
