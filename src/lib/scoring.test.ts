import { describe, expect, it } from 'vitest';

import type { Id } from '../../convex/_generated/dataModel';
import { scoreTopFive } from '../../convex/lib/scoring';

function driver(id: string): Id<'drivers'> {
  return id as Id<'drivers'>;
}

describe('scoreTopFive', () => {
  it('scores exact and near matches in the top five', () => {
    const result = scoreTopFive({
      picks: [driver('A'), driver('B'), driver('C'), driver('D'), driver('E')],
      classification: [
        driver('A'),
        driver('C'),
        driver('B'),
        driver('F'),
        driver('E'),
        driver('D'),
      ],
    });

    expect(result.total).toBe(16);
    expect(result.breakdown).toEqual([
      {
        driverId: driver('A'),
        predictedPosition: 1,
        actualPosition: 1,
        points: 5,
      },
      {
        driverId: driver('B'),
        predictedPosition: 2,
        actualPosition: 3,
        points: 3,
      },
      {
        driverId: driver('C'),
        predictedPosition: 3,
        actualPosition: 2,
        points: 3,
      },
      {
        driverId: driver('D'),
        predictedPosition: 4,
        actualPosition: 6,
        points: 0,
      },
      {
        driverId: driver('E'),
        predictedPosition: 5,
        actualPosition: 5,
        points: 5,
      },
    ]);
  });

  it('gives one point for top-five drivers with larger position misses', () => {
    const result = scoreTopFive({
      picks: [driver('A'), driver('B'), driver('C'), driver('D'), driver('E')],
      classification: [
        driver('E'),
        driver('C'),
        driver('D'),
        driver('B'),
        driver('A'),
      ],
    });

    expect(result.total).toBe(9);
    expect(result.breakdown.map((entry) => entry.points)).toEqual([
      1, 1, 3, 3, 1,
    ]);
  });

  it('returns zero points when a picked driver is outside the top five or missing', () => {
    const result = scoreTopFive({
      picks: [driver('A'), driver('B'), driver('C'), driver('D'), driver('E')],
      classification: [
        driver('Z'),
        driver('Y'),
        driver('X'),
        driver('W'),
        driver('V'),
      ],
    });

    expect(result.total).toBe(0);
    expect(result.breakdown).toEqual([
      {
        driverId: driver('A'),
        predictedPosition: 1,
        actualPosition: undefined,
        points: 0,
      },
      {
        driverId: driver('B'),
        predictedPosition: 2,
        actualPosition: undefined,
        points: 0,
      },
      {
        driverId: driver('C'),
        predictedPosition: 3,
        actualPosition: undefined,
        points: 0,
      },
      {
        driverId: driver('D'),
        predictedPosition: 4,
        actualPosition: undefined,
        points: 0,
      },
      {
        driverId: driver('E'),
        predictedPosition: 5,
        actualPosition: undefined,
        points: 0,
      },
    ]);
  });
});
