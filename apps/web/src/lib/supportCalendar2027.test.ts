import { describe, expect, it } from 'vitest';

import { CALENDAR_2027 } from './calendar2027';
import { SUPPORT_CALENDAR_2027 } from './supportCalendar2027';

describe('2027 support-series alignment', () => {
  it('resolves every support venue to an F1 weekend on the same race day', () => {
    for (const support of SUPPORT_CALENDAR_2027) {
      const f1 = CALENDAR_2027.find((round) => round.slug === support.slug);
      expect(f1, support.slug).toBeDefined();
      expect(support.raceDate).toBe(f1!.raceDate);
    }
    expect(new Set(SUPPORT_CALENDAR_2027.map((round) => round.slug)).size).toBe(
      SUPPORT_CALENDAR_2027.length,
    );
  });

  it('keeps the published support dates independent of F1’s Friday starts', () => {
    expect(
      SUPPORT_CALENDAR_2027.find((round) => round.slug === 'canada')?.dates,
    ).toBe('20–23 May');
    expect(
      SUPPORT_CALENDAR_2027.find((round) => round.slug === 'monaco')?.dates,
    ).toBe('3–6 June');
    expect(CALENDAR_2027.find((round) => round.slug === 'canada')?.dates).toBe(
      '21–23 May',
    );
    expect(CALENDAR_2027.find((round) => round.slug === 'monaco')?.dates).toBe(
      '4–6 June',
    );
  });
});
