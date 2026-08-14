import { getRaceTimeZoneFromSlug } from '@grandprixpicks/shared/raceTimezones';
import { describe, expect, it } from 'vitest';

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

  it('lets a full-slug override beat the prefix for a relocated race', () => {
    // The 2026 Bahrain GP is run at Sepang, Malaysia.
    expect(getRaceTimeZoneFromSlug('bahrain-2026')).toBe('Asia/Kuala_Lumpur');
    // Every other Bahrain GP is still at Sakhir.
    expect(getRaceTimeZoneFromSlug('bahrain')).toBe('Asia/Bahrain');
    expect(getRaceTimeZoneFromSlug('bahrain-2027')).toBe('Asia/Bahrain');
  });

  it('returns undefined for unknown slugs', () => {
    expect(getRaceTimeZoneFromSlug('made-up-grand-prix-2026')).toBeUndefined();
  });
});
