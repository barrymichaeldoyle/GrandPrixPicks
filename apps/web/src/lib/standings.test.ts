import { describe, expect, it } from 'vitest';

import {
  type Championship,
  type DriverRow,
  countbackLabel,
  gapLabel,
  roundCode,
  summarySentence,
  teamHistoryNote,
  tieGroups,
} from './standings';

function driver(row: Partial<DriverRow>): DriverRow {
  return {
    displayName: 'Driver',
    points: 0,
    countback: null,
    teamHistory: [],
    ...row,
  } as DriverRow;
}

describe('roundCode', () => {
  it('takes the Grand Prix name, not the word "Grand"', () => {
    expect(roundCode('Bahrain Grand Prix')).toBe('BAH');
    expect(roundCode('Las Vegas Grand Prix')).toBe('LAS');
  });
});

describe('gapLabel', () => {
  it('marks the leader rather than printing a zero gap', () => {
    expect(gapLabel(null)).toBe('—');
    expect(gapLabel(0)).toBe('—');
  });

  it('signs a real gap so it reads as points behind', () => {
    expect(gapLabel(59)).toBe('+59');
  });
});

describe('countbackLabel', () => {
  it('names the finish in the words the sport uses', () => {
    expect(countbackLabel(1, 2)).toBe('wins');
    expect(countbackLabel(1, 1)).toBe('win');
    expect(countbackLabel(2, 3)).toBe('second places');
  });

  it('falls back to a position once past the words we have', () => {
    expect(countbackLabel(12, 2)).toBe('P12 finishes');
  });
});

describe('tieGroups', () => {
  it('explains which finish separated two drivers level on points', () => {
    const groups = tieGroups(
      [
        driver({
          displayName: 'Russell',
          points: 183,
          countback: { finishPosition: 1, count: 2 },
        }),
        driver({
          displayName: 'Hamilton',
          points: 183,
          countback: { finishPosition: 1, count: 1 },
        }),
      ],
      (row) => row.displayName,
    );

    expect(groups).toEqual([
      {
        points: 183,
        names: ['Russell', 'Hamilton'],
        note: 'Russell is ahead on countback: 2 wins to 1.',
      },
    ]);
  });

  it('admits when the countback cannot separate them either', () => {
    const groups = tieGroups(
      [
        driver({ displayName: 'Russell', points: 183 }),
        driver({ displayName: 'Hamilton', points: 183 }),
      ],
      (row) => row.displayName,
    );
    expect(groups[0].note).toBeNull();
  });

  it('says nothing about drivers nobody is level with', () => {
    expect(
      tieGroups(
        [
          driver({ displayName: 'Russell', points: 184 }),
          driver({ displayName: 'Hamilton', points: 183 }),
        ],
        (row) => row.displayName,
      ),
    ).toEqual([]);
  });
});

describe('teamHistoryNote', () => {
  it('has nothing to say about a driver who stayed put', () => {
    expect(
      teamHistoryNote(
        driver({
          teamHistory: [{ team: 'Mercedes', fromRound: 1, toRound: null }],
        }),
      ),
    ).toBeNull();
  });

  it('states both seats and the rounds each one covers', () => {
    expect(
      teamHistoryNote(
        driver({
          displayName: 'Lawson',
          teamHistory: [
            { team: 'Racing Bulls', fromRound: 1, toRound: 11 },
            { team: 'Red Bull Racing', fromRound: 12, toRound: null },
          ],
        }),
      ),
    ).toBe(
      'Lawson: Rounds 1–11 at Racing Bulls, round 12 onwards at Red Bull.',
    );
  });
});

describe('summarySentence', () => {
  function standings(overrides: Partial<Championship>): Championship {
    return {
      roundsScored: 14,
      roundsTotal: 24,
      drivers: [],
      constructors: [],
      ...overrides,
    } as Championship;
  }

  it('leads with the drivers gap and follows with the constructors', () => {
    expect(
      summarySentence(
        standings({
          drivers: [
            driver({ displayName: 'Antonelli', points: 242, gapToLeader: 0 }),
            driver({ displayName: 'Russell', points: 183, gapToLeader: 59 }),
          ],
          constructors: [
            { team: 'Mercedes', points: 425, gapToLeader: 0 },
            { team: 'Ferrari', points: 338, gapToLeader: 87 },
          ] as unknown as Championship['constructors'],
        }),
      ),
    ).toBe(
      "After 14 of 24 rounds, Antonelli leads Russell by 59 points. Mercedes lead Ferrari by 87 in the constructors' championship.",
    );
  });

  it('has nothing to summarise before a round is scored', () => {
    expect(summarySentence(standings({ roundsScored: 0 }))).toBeNull();
  });
});

describe('tieGroups on zero points', () => {
  it('leaves the drivers who have not scored alone', () => {
    expect(
      tieGroups(
        [
          driver({ displayName: 'Russell', points: 0 }),
          driver({ displayName: 'Hamilton', points: 0 }),
        ],
        (row) => row.displayName,
      ),
    ).toEqual([]);
  });
});
