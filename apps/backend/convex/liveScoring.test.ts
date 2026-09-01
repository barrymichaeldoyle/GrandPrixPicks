import { describe, expect, it } from 'vitest';

import { parseOpenF1PositionRows, reduceRunningOrder } from './liveScoring';

describe('OpenF1 live running order', () => {
  it('keeps the latest event for each driver and sorts by current position', () => {
    const rows = parseOpenF1PositionRows([
      { driver_number: 4, position: 2, date: '2026-08-30T13:00:01Z' },
      { driver_number: 1, position: 1, date: '2026-08-30T13:00:01Z' },
      { driver_number: 4, position: 1, date: '2026-08-30T13:00:05Z' },
      { driver_number: 1, position: 2, date: '2026-08-30T13:00:05Z' },
    ]);

    expect(reduceRunningOrder([], rows)).toEqual([
      { driverNumber: 4, position: 1 },
      { driverNumber: 1, position: 2 },
    ]);
  });

  it('merges incremental changes into the previous snapshot', () => {
    expect(
      reduceRunningOrder(
        [
          { driverNumber: 1, position: 1 },
          { driverNumber: 4, position: 2 },
          { driverNumber: 81, position: 3 },
        ],
        [
          {
            driverNumber: 81,
            position: 2,
            date: '2026-08-30T13:10:00Z',
          },
          {
            driverNumber: 4,
            position: 3,
            date: '2026-08-30T13:10:00Z',
          },
        ],
      ),
    ).toEqual([
      { driverNumber: 1, position: 1 },
      { driverNumber: 81, position: 2 },
      { driverNumber: 4, position: 3 },
    ]);
  });

  it('rejects an incomplete order update with duplicate positions', () => {
    expect(() =>
      reduceRunningOrder(
        [
          { driverNumber: 1, position: 1 },
          { driverNumber: 4, position: 2 },
        ],
        [
          {
            driverNumber: 4,
            position: 1,
            date: '2026-08-30T13:10:00Z',
          },
        ],
      ),
    ).toThrow('duplicate positions');
  });
});
