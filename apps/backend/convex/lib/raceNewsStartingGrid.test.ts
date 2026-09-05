import { describe, expect, it } from 'vitest';

import {
  sortStartingGrid,
  validateStartingGrid,
  type StartingGridEntry,
} from './raceNewsStartingGrid';

function grid(codes: string[]): StartingGridEntry[] {
  return codes.map((code, index) => ({ position: index + 1, code }));
}

const FULL_FIELD = grid([
  'GAS',
  'RUS',
  'LEC',
  'HAM',
  'VER',
  'PIA',
  'COL',
  'NOR',
  'LIN',
  'BOR',
  'BEA',
  'HUL',
  'SAI',
  'OCO',
  'TSU',
  'BOT',
  'PER',
  'ALO',
  'STR',
  'ANT',
  'ALB',
  'LAW',
]);

describe('validateStartingGrid', () => {
  it('accepts a full field', () => {
    expect(validateStartingGrid(FULL_FIELD)).toBeNull();
  });

  it('accepts notes on the drivers who moved', () => {
    const withNotes = FULL_FIELD.map((entry) =>
      entry.code === 'PIA' ? { ...entry, note: '3-place penalty' } : entry,
    );
    expect(validateStartingGrid(withNotes)).toBeNull();
  });

  it('refuses an empty grid', () => {
    // Rather than writing an empty array onto the record, where the card would
    // render a headline with nothing under it.
    expect(validateStartingGrid([])).toMatch(/at least one entry/);
  });

  it('refuses a gap in the positions', () => {
    // The failure this exists for: a grid one row short renders as a perfectly
    // tidy table, and the row that is missing is somebody's pick.
    const problem = validateStartingGrid([
      { position: 1, code: 'GAS' },
      { position: 3, code: 'RUS' },
    ]);
    expect(problem).toMatch(/no gaps/);
    // The message shows what it got, so the caller can see which row is wrong
    // without diffing 22 lines by eye.
    expect(problem).toMatch(/1, 3/);
  });

  it('refuses a repeated position', () => {
    expect(
      validateStartingGrid([
        { position: 1, code: 'GAS' },
        { position: 1, code: 'RUS' },
      ]),
    ).toMatch(/no gaps and no repeats/);
  });

  it('refuses the same driver twice, whatever the case', () => {
    // Codes are normalised at publish, so the duplicate check has to be too:
    // `gas` and `GAS` are one driver in two slots.
    expect(
      validateStartingGrid([
        { position: 1, code: 'GAS' },
        { position: 2, code: 'gas' },
      ]),
    ).toMatch(/GAS more than once/);
  });

  it('refuses a note long enough to be a sentence', () => {
    const problem = validateStartingGrid([
      {
        position: 1,
        code: 'GAS',
        note: 'Dropped three places for impeding Lawson on his final Q2 lap, the standard penalty',
      },
    ]);
    expect(problem).toMatch(/P1/);
    expect(problem).toMatch(/3-place penalty/);
  });

  it('refuses more entries than a field can hold', () => {
    const tooMany = grid(Array.from({ length: 31 }, (_, index) => `D${index}`));
    expect(validateStartingGrid(tooMany)).toMatch(/more than the 30/);
  });
});

describe('sortStartingGrid', () => {
  it('puts a grid published out of order into starting order', () => {
    expect(
      sortStartingGrid([
        { position: 3, code: 'LEC' },
        { position: 1, code: 'GAS' },
        { position: 2, code: 'RUS' },
      ]).map((entry) => entry.code),
    ).toEqual(['GAS', 'RUS', 'LEC']);
  });

  it('leaves the input alone', () => {
    const input = [
      { position: 2, code: 'RUS' },
      { position: 1, code: 'GAS' },
    ];
    sortStartingGrid(input);
    expect(input[0]!.code).toBe('RUS');
  });
});
