import { describe, expect, it } from 'vitest';

import { TEAMMATE_PAIRINGS_2026, coversRound } from './teams';

import {
  PENDING_ENTRY_RACES,
  hasPendingEntryList,
  markPendingEntryDrivers,
  pendingEntrySlugForCalendarRound,
} from './pendingEntry';

describe('PENDING_ENTRY_RACES', () => {
  it('only flags drivers who hold a seat for the race round', () => {
    // The flag says "this seat is provisional", so it can only land on someone
    // the round's own lineup already puts in a car. A code that is not in the
    // round's pairings would silently mark nothing, and the copy promising an
    // unconfirmed grid would sit over a grid with no marks on it.
    for (const [slug, race] of Object.entries(PENDING_ENTRY_RACES)) {
      const seated = new Set(
        TEAMMATE_PAIRINGS_2026.filter((pairing) =>
          coversRound(pairing, race.round),
        ).flatMap((pairing) => [pairing.driver1Code, pairing.driver2Code]),
      );

      for (const code of race.unconfirmedDriverCodes) {
        expect(seated.has(code), `${slug}: ${code}`).toBe(true);
      }
    }
  });
});

describe('pendingEntrySlugForCalendarRound', () => {
  it('leaves rounds with a settled entry list alone', () => {
    expect(pendingEntrySlugForCalendarRound(2026, 13)).toBeNull();
    expect(pendingEntrySlugForCalendarRound(2026, 12)).toBeNull();
    expect(pendingEntrySlugForCalendarRound(2025, 13)).toBeNull();
  });
});

describe('markPendingEntryDrivers', () => {
  const drivers = [
    { code: 'VER' },
    { code: 'LAW' },
    { code: 'TSU' },
    { code: 'LIN' },
  ] as const;

  it('leaves the settled Monza grid unflagged', () => {
    expect(markPendingEntryDrivers('italy-2026', drivers)).toEqual([
      ...drivers,
    ]);
    expect(markPendingEntryDrivers('netherlands-2026', drivers)).toEqual([
      ...drivers,
    ]);
  });

  it('drops nobody from the grid', () => {
    // The picker offers a full field or a slot becomes unfillable.
    expect(markPendingEntryDrivers('italy-2026', drivers)).toHaveLength(
      drivers.length,
    );
    expect(hasPendingEntryList('italy-2026')).toBe(false);
  });
});
