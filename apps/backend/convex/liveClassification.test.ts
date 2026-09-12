import { describe, expect, it } from 'vitest';
import { bestLapOrder } from './liveClassification';

describe('bestLapOrder', () => {
  it('keeps each driver best lap and ranks timed drivers', () => {
    expect(
      bestLapOrder([
        { driver_number: 4, lap_duration: 82.1 },
        { driver_number: 1, lap_duration: 81.9 },
        { driver_number: 4, lap_duration: 81.7 },
        { driver_number: 1, lap_duration: null },
      ]),
    ).toEqual([
      { driverNumber: 4, bestLapSeconds: 81.7 },
      { driverNumber: 1, bestLapSeconds: 81.9 },
    ]);
  });
});
