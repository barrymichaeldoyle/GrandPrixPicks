import { describe, expect, it } from 'vitest';

import type { Id } from './_generated/dataModel';
import { RECHECK_GAPS, nextRecheckAt } from './lib/recheckSchedule';
import { buildAmendmentNote } from './resultsRecheck';

function driver(code: string): Id<'drivers'> {
  return code as unknown as Id<'drivers'>;
}

const codes = new Map<Id<'drivers'>, string>([
  [driver('a'), 'NOR'],
  [driver('b'), 'PIA'],
  [driver('c'), 'SAI'],
  [driver('d'), 'OCO'],
]);

describe('nextRecheckAt', () => {
  it('schedules each pass relative to the previous one', () => {
    const now = 1_000_000;

    expect(nextRecheckAt(0, now)).toBe(now + RECHECK_GAPS[0]);
    expect(nextRecheckAt(1, now)).toBe(now + RECHECK_GAPS[1]);
    expect(nextRecheckAt(2, now)).toBe(now + RECHECK_GAPS[2]);
  });

  it('stops scheduling once every pass has run', () => {
    expect(nextRecheckAt(RECHECK_GAPS.length, 1_000_000)).toBeUndefined();
  });
});

describe('buildAmendmentNote', () => {
  it('names the drivers whose positions moved, in finishing order', () => {
    const note = buildAmendmentNote(
      [
        { driverId: driver('b'), from: 3, to: 2 },
        { driverId: driver('a'), from: 2, to: 3 },
      ],
      codes,
    );

    expect(note).toBe(
      'Updated to match the official FIA classification: PIA P3 → P2, NOR P2 → P3.',
    );
  });

  it('describes a driver dropped from the classification', () => {
    const note = buildAmendmentNote(
      [{ driverId: driver('c'), from: 4, to: null }],
      codes,
    );

    expect(note).toContain('SAI P4 → unclassified');
  });

  it('keeps the note short when many positions shuffle', () => {
    const movements = Array.from({ length: 10 }, (_, index) => ({
      driverId: driver('a'),
      from: index + 1,
      to: index + 2,
    }));

    const note = buildAmendmentNote(movements, codes);

    expect(note.split(',')).toHaveLength(4);
  });

  it('falls back to a bare statement when nothing is describable', () => {
    expect(buildAmendmentNote([], codes)).toBe(
      'Updated to match the official FIA classification.',
    );
  });
});
