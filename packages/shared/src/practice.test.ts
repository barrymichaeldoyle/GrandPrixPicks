import { describe, expect, it } from 'vitest';

import {
  formatPracticeLap,
  PRACTICE_SESSION_LABELS,
  practiceGapOrLap,
} from './practice';

describe('PRACTICE_SESSION_LABELS', () => {
  it('names every session in full, never as an abbreviation', () => {
    // The mobile feed used to render `sessionType.toUpperCase()` here, which is
    // the drift this shared table exists to prevent.
    expect(PRACTICE_SESSION_LABELS).toEqual({
      fp1: 'Free Practice 1',
      fp2: 'Free Practice 2',
      fp3: 'Free Practice 3',
    });
  });
});

describe('formatPracticeLap', () => {
  it('formats a lap as minutes, seconds and three decimals', () => {
    expect(formatPracticeLap(89.412)).toBe('1:29.412');
  });

  it('zero-pads the seconds so a column of laps stays aligned', () => {
    expect(formatPracticeLap(63.5)).toBe('1:03.500');
  });

  it('handles a sub-minute lap', () => {
    expect(formatPracticeLap(59.999)).toBe('0:59.999');
  });

  it('returns an em dash when there is no lap rather than a zero', () => {
    expect(formatPracticeLap(undefined)).toBe('—');
  });
});

describe('practiceGapOrLap', () => {
  it('gives P1 an absolute lap time', () => {
    expect(practiceGapOrLap({ position: 1, bestLapSeconds: 89.412 })).toBe(
      '1:29.412',
    );
  });

  it('gives everyone else the gap to the leader', () => {
    expect(
      practiceGapOrLap({
        position: 2,
        bestLapSeconds: 89.626,
        gapToLeaderSeconds: 0.214,
      }),
    ).toBe('+0.214');
  });

  it('pads a gap to three decimals', () => {
    expect(practiceGapOrLap({ position: 3, gapToLeaderSeconds: 1.5 })).toBe(
      '+1.500',
    );
  });

  it('ignores a best lap for a driver who is not P1', () => {
    // P2 has a lap time, but the column compares gaps, so the lap is not shown.
    expect(practiceGapOrLap({ position: 2, bestLapSeconds: 89.626 })).toBe('—');
  });

  it('returns an em dash when a non-leader has no gap', () => {
    expect(practiceGapOrLap({ position: 5 })).toBe('—');
  });
});
