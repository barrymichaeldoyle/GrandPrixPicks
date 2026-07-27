import { describe, expect, it } from 'vitest';

import { buildPracticeSessionSummaries } from './practiceResults';

describe('practice session social summaries', () => {
  it('derives leaders, teammate gaps, reserves, and session changes', () => {
    function makeEntry(
      driverNumber: number,
      code: string,
      team: string,
      position: number,
      bestLapSeconds: number,
    ) {
      return {
        driverNumber,
        code,
        displayName: code,
        team,
        position,
        bestLapSeconds,
        gapToLeaderSeconds: bestLapSeconds - 80,
        lapCount: 20,
      };
    }
    const summaries = buildPracticeSessionSummaries(
      [
        {
          sessionType: 'fp1',
          publishedAt: 1,
          entries: [
            makeEntry(1, 'AAA', 'Alpha', 1, 80),
            makeEntry(2, 'BBB', 'Alpha', 2, 80.5),
            makeEntry(99, 'RES', 'Beta', 3, 81),
          ],
        },
        {
          sessionType: 'fp2',
          publishedAt: 2,
          entries: [
            makeEntry(2, 'BBB', 'Alpha', 1, 79),
            makeEntry(1, 'AAA', 'Alpha', 2, 79.2),
            makeEntry(99, 'RES', 'Beta', 3, 80),
          ],
        },
      ],
      new Set([1, 2]),
    );

    expect(summaries[0]?.fastest?.code).toBe('AAA');
    expect(summaries[0]?.teammateGaps[0]?.gapSeconds).toBeCloseTo(0.5);
    expect(summaries[0]?.reserveDrivers.map((driver) => driver.code)).toEqual([
      'RES',
    ]);
    expect(summaries[1]?.positionChanges[0]).toMatchObject({
      code: 'BBB',
      placesGained: 1,
    });
  });
});
