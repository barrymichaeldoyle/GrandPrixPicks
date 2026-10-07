import { describe, expect, it } from 'vitest';

import { duelFormGuideRows } from './duelFormGuide';

const driver1 = { _id: 'ver', code: 'VER' };
const driver2 = { _id: 'had', code: 'HAD' };

const battle = {
  matchupId: 'rb',
  drivers: [
    {
      driverId: 'ver',
      qualifying: 9,
      race: 7,
      sprintQualifying: 2,
      sprint: 1,
      total: 19,
    },
    {
      driverId: 'had',
      qualifying: 4,
      race: 6,
      sprintQualifying: 1,
      sprint: 2,
      total: 13,
    },
  ],
};

const practice = [
  {
    sessionType: 'fp1' as const,
    entries: [
      { code: 'VER', position: 3 },
      { code: 'HAD', position: 7 },
    ],
  },
  {
    sessionType: 'fp2' as const,
    entries: [
      { code: 'HAD', position: 2 },
      { code: 'VER', position: 5 },
    ],
  },
];

describe('duelFormGuideRows', () => {
  it('leads with the record for the session being called, then the season', () => {
    const rows = duelFormGuideRows({
      driver1,
      driver2,
      sessionType: 'quali',
      battle,
      practice: [],
    });
    expect(rows.map((row) => [row.label, ...row.values, row.edge])).toEqual([
      ['Qualifying this season', '9', '4', 'driver1'],
      ['All sessions this season', '19', '13', 'driver1'],
    ]);
  });

  it('shows one season row when every call covers every session', () => {
    const rows = duelFormGuideRows({
      driver1,
      driver2,
      sessionType: undefined,
      battle,
      practice: [],
    });
    expect(rows.map((row) => row.label)).toEqual(['Head-to-head this season']);
  });

  it('reads practice positions in the duel order and marks the lower one', () => {
    const rows = duelFormGuideRows({
      driver1,
      driver2,
      sessionType: 'race',
      battle: undefined,
      practice,
    });
    expect(rows.map((row) => [row.label, ...row.values, row.edge])).toEqual([
      ['FP1', 'P3', 'P7', 'driver1'],
      ['FP2', 'P5', 'P2', 'driver2'],
    ]);
  });

  it('dashes a driver who sat a session out and keeps the other side', () => {
    const rows = duelFormGuideRows({
      driver1,
      driver2,
      sessionType: 'race',
      battle: undefined,
      practice: [
        { sessionType: 'fp1', entries: [{ code: 'HAD', position: 12 }] },
      ],
    });
    expect(rows).toEqual([
      { key: 'fp1', label: 'FP1', values: ['–', 'P12'], edge: null },
    ]);
  });

  it('draws nothing before the season or the weekend has data', () => {
    expect(
      duelFormGuideRows({
        driver1,
        driver2,
        sessionType: 'quali',
        battle: {
          matchupId: 'rb',
          drivers: battle.drivers.map((driver) => ({
            ...driver,
            qualifying: 0,
            race: 0,
            sprintQualifying: 0,
            sprint: 0,
            total: 0,
          })),
        },
        practice: [],
      }),
    ).toEqual([]);
  });

  it('calls a level record level', () => {
    const rows = duelFormGuideRows({
      driver1,
      driver2,
      sessionType: 'sprint',
      battle: {
        matchupId: 'rb',
        drivers: battle.drivers.map((driver) => ({ ...driver, sprint: 2 })),
      },
      practice: [],
    });
    expect(rows[0]?.edge).toBeNull();
  });
});
