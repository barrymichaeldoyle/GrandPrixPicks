import { describe, expect, it } from 'vitest';

import {
  lineupRoundForCalendarRound,
  markPendingEntryDrivers,
} from './pendingEntry';

describe('lineupRoundForCalendarRound', () => {
  it('keeps Monza on the pre-Zandvoort grid until the entry is out', () => {
    expect(lineupRoundForCalendarRound(2026, 13)).toBe(11);
  });

  it('does not rewrite other rounds', () => {
    expect(lineupRoundForCalendarRound(2026, 12)).toBe(12);
    expect(lineupRoundForCalendarRound(2026, 11)).toBe(11);
  });
});

describe('markPendingEntryDrivers', () => {
  it('flags Hadjar as unconfirmed on Monza only', () => {
    const drivers = [
      { code: 'VER' },
      { code: 'HAD' },
      { code: 'LAW' },
    ] as const;

    expect(markPendingEntryDrivers('italy-2026', drivers)).toEqual([
      { code: 'VER' },
      { code: 'HAD', entryUnconfirmed: true },
      { code: 'LAW' },
    ]);
    expect(markPendingEntryDrivers('netherlands-2026', drivers)).toEqual([
      ...drivers,
    ]);
  });
});
