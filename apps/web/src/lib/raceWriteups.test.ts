import { describe, expect, it } from 'vitest';

import { footerWeekendPreview, listRaceWriteups } from './raceWriteups';

describe('footerWeekendPreview', () => {
  it('names the current write-up so the footer link stands on its own', () => {
    expect(footerWeekendPreview('madrid-2026')).toEqual({
      to: '/f1-2026-madrid-grand-prix-predictions',
      label: 'Madrid Weekend News',
      countryCode: 'es',
    });
    expect(footerWeekendPreview('bahrain-2026')).toEqual({
      to: '/f1-2026-bahrain-grand-prix-predictions',
      label: 'Sepang Weekend News',
      countryCode: 'bh',
    });
  });

  it('returns null when that round has no write-up', () => {
    expect(footerWeekendPreview('netherlands-2026')).toBeNull();
    expect(footerWeekendPreview(undefined)).toBeNull();
  });

  it('covers every registered write-up', () => {
    for (const writeup of listRaceWriteups()) {
      const preview = footerWeekendPreview(writeup.raceSlug);
      expect(preview, writeup.to).not.toBeNull();
      expect(preview!.to).toBe(writeup.to);
      expect(preview!.label).toBe(`${writeup.venueName} Weekend News`);
      expect(preview!.countryCode).toBeTruthy();
    }
  });
});
