import { describe, expect, it } from 'vitest';

import { qualifyingSecondsByDriver } from './qualifyingSegments';

describe('qualifyingSecondsByDriver', () => {
  it('keeps each driver best lap per segment, null where none was set', () => {
    const byDriver = qualifyingSecondsByDriver(
      [
        {
          driver_number: 1,
          lap_number: 2,
          date_start: '2026-10-10T13:05:00Z',
          lap_duration: 91.2,
        },
        {
          driver_number: 1,
          lap_number: 3,
          date_start: '2026-10-10T13:07:00Z',
          lap_duration: 90.8,
        },
        // In-lap after the Q1 flag, before Q2 opens: counts for nothing.
        {
          driver_number: 1,
          lap_number: 4,
          date_start: '2026-10-10T13:18:30Z',
          lap_duration: 120.4,
        },
        {
          driver_number: 1,
          lap_number: 6,
          date_start: '2026-10-10T13:21:00Z',
          lap_duration: 90.1,
        },
        {
          driver_number: 2,
          lap_number: 2,
          date_start: '2026-10-10T13:06:00Z',
          lap_duration: 92.5,
        },
      ],
      [
        { date: '2026-10-10T13:00:00Z', qualifying_phase: 1 },
        {
          date: '2026-10-10T13:18:00Z',
          flag: 'CHEQUERED',
          qualifying_phase: 1,
        },
        { date: '2026-10-10T13:20:00Z', qualifying_phase: 2 },
      ],
    );

    expect(byDriver?.get(1)).toEqual([90.8, 90.1, null]);
    expect(byDriver?.get(2)).toEqual([92.5, null, null]);
  });

  it('reads race control lap N as OpenF1 lap N-1 when no time is given', () => {
    const byDriver = qualifyingSecondsByDriver(
      [
        {
          driver_number: 44,
          lap_number: 2,
          date_start: '2026-10-10T13:05:00Z',
          lap_duration: 91.5,
        },
        {
          driver_number: 44,
          lap_number: 3,
          date_start: '2026-10-10T13:07:00Z',
          lap_duration: 90.2,
        },
      ],
      [
        { date: '2026-10-10T13:00:00Z', qualifying_phase: 1 },
        {
          date: '2026-10-10T13:09:00Z',
          message:
            'CAR 44 (HAM) LAP DELETED - TRACK LIMITS AT TURN 16 LAP 4 21:08:30 (PIT)',
        },
      ],
    );

    expect(byDriver?.get(44)).toEqual([91.5, null, null]);
  });

  it('is null without segment data', () => {
    expect(qualifyingSecondsByDriver([], [])).toBeNull();
  });
});
