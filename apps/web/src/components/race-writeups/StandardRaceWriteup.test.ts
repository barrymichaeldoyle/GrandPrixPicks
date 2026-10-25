import { describe, expect, it } from 'vitest';

import { formatWeekendSpan } from './StandardRaceWriteup';

describe('formatWeekendSpan', () => {
  it('reads first practice to the race in track time', () => {
    // Las Vegas 2026: FP1 Thursday evening, race Saturday 20:00 local, which
    // is already Sunday in UTC. Track time keeps it on the 21st.
    expect(
      formatWeekendSpan(
        {
          fp1StartAt: Date.parse('2026-11-20T00:30:00Z'),
          raceStartAt: Date.parse('2026-11-22T04:00:00Z'),
        },
        'America/Los_Angeles',
      ),
    ).toBe('19–21 Nov');
  });

  it('names both months across a month end', () => {
    expect(
      formatWeekendSpan(
        {
          fp1StartAt: Date.parse('2026-10-30T18:30:00Z'),
          raceStartAt: Date.parse('2026-11-01T20:00:00Z'),
        },
        'America/Mexico_City',
      ),
    ).toBe('30 Oct–1 Nov');
  });

  it('falls back to the race day alone without a practice time', () => {
    expect(
      formatWeekendSpan(
        {
          fp1StartAt: undefined,
          raceStartAt: Date.parse('2026-12-06T13:00:00Z'),
        },
        'Asia/Dubai',
      ),
    ).toBe('6 Dec');
  });
});
