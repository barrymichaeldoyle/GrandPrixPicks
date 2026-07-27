import { describe, expect, it } from 'vitest';

import {
  parseOpenF1PracticeDrivers,
  parseOpenF1PracticeResults,
} from './practiceResults';

describe('OpenF1 practice result validation', () => {
  it('sorts practice rows and retains lap timing data', () => {
    const rows = parseOpenF1PracticeResults([
      {
        driver_number: 4,
        position: 2,
        duration: 79.559,
        gap_to_leader: 0.484,
        number_of_laps: 25,
      },
      {
        driver_number: 16,
        position: 1,
        duration: 79.075,
        gap_to_leader: 0,
        number_of_laps: 19,
      },
      ...Array.from({ length: 3 }, (_, index) => ({
        driver_number: index + 50,
        position: index + 3,
        duration: 80 + index,
        gap_to_leader: 1 + index,
        number_of_laps: 20,
      })),
    ]);

    expect(rows[0]).toEqual({
      driverNumber: 16,
      position: 1,
      bestLapSeconds: 79.075,
      gapToLeaderSeconds: 0,
      lapCount: 19,
    });
    expect(rows.map((row) => row.position)).toEqual([1, 2, 3, 4, 5]);
  });

  it('rejects duplicate practice positions', () => {
    expect(() =>
      parseOpenF1PracticeResults(
        Array.from({ length: 5 }, (_, index) => ({
          driver_number: index + 1,
          position: index === 4 ? 4 : index + 1,
        })),
      ),
    ).toThrow('duplicate');
  });

  it('accepts reserve drivers from the session roster', () => {
    expect(
      parseOpenF1PracticeDrivers([
        {
          driver_number: 72,
          name_acronym: 'IWA',
          full_name: 'Ayumu Iwasa',
          team_name: 'Aston Martin',
        },
      ]),
    ).toEqual([
      {
        driverNumber: 72,
        code: 'IWA',
        displayName: 'Ayumu Iwasa',
        team: 'Aston Martin',
      },
    ]);
  });
});
