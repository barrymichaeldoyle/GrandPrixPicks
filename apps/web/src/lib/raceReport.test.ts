import { describe, expect, it } from 'vitest';

import type { RaceReportEntry } from './raceReport';
import { buildRaceReport } from './raceReport';

function classification(names: [string, string | null, string | null][]): {
  enrichedClassification: RaceReportEntry[];
} {
  return {
    enrichedClassification: names.map(([displayName, team, status], index) => ({
      position: index + 1,
      displayName,
      team,
      status,
    })),
  };
}

const raceResult = classification([
  ['Lando Norris', 'McLaren', null],
  ['Kimi Antonelli', 'Mercedes', null],
  ['George Russell', 'Mercedes', null],
  ['Max Verstappen', 'Red Bull Racing', 'dnf'],
]);

describe('buildRaceReport', () => {
  it('leads with the winner, their team and the rest of the podium', () => {
    const [first] = buildRaceReport({
      raceName: 'Dutch Grand Prix',
      season: 2026,
      circuitName: 'Circuit Zandvoort',
      resultsBySession: { race: raceResult },
    });

    expect(first).toBe(
      'Lando Norris (McLaren) won the 2026 Dutch Grand Prix at Circuit Zandvoort, ahead of Kimi Antonelli and George Russell.',
    );
  });

  it('combines pole and the sprint into one sentence on a sprint weekend', () => {
    const sentences = buildRaceReport({
      raceName: 'Dutch Grand Prix',
      season: 2026,
      hasSprint: true,
      resultsBySession: {
        race: raceResult,
        quali: classification([['George Russell', 'Mercedes', null]]),
        sprint: classification([['Oscar Piastri', 'McLaren', null]]),
      },
    });

    expect(sentences[1]).toBe(
      'George Russell (Mercedes) took pole position, and Oscar Piastri (McLaren) won the sprint.',
    );
  });

  it('ignores the sprint classification on a non-sprint weekend', () => {
    const sentences = buildRaceReport({
      raceName: 'Dutch Grand Prix',
      season: 2026,
      hasSprint: false,
      resultsBySession: {
        race: raceResult,
        sprint: classification([['Oscar Piastri', 'McLaren', null]]),
      },
    });

    expect(sentences.some((s) => s.includes('sprint'))).toBe(false);
  });

  it('counts retirements from the classification status', () => {
    const sentences = buildRaceReport({
      raceName: 'Dutch Grand Prix',
      season: 2026,
      resultsBySession: { race: raceResult },
    });

    expect(sentences.at(-1)).toBe(
      '1 of the 4 drivers classified did not finish.',
    );
  });

  it('omits the retirement sentence when everyone finished', () => {
    const sentences = buildRaceReport({
      raceName: 'Dutch Grand Prix',
      season: 2026,
      resultsBySession: {
        race: classification([
          ['Lando Norris', 'McLaren', null],
          ['Kimi Antonelli', 'Mercedes', null],
        ]),
      },
    });

    expect(sentences.some((s) => s.includes('did not finish'))).toBe(false);
  });

  it('returns nothing until the race itself is scored', () => {
    expect(
      buildRaceReport({
        raceName: 'Dutch Grand Prix',
        season: 2026,
        resultsBySession: {
          quali: classification([['George Russell', 'Mercedes', null]]),
        },
      }),
    ).toEqual([]);
  });

  it('drops the venue clause when the circuit is unknown', () => {
    const [first] = buildRaceReport({
      raceName: 'Dutch Grand Prix',
      season: 2026,
      circuitName: null,
      resultsBySession: { race: raceResult },
    });

    expect(first).toBe(
      'Lando Norris (McLaren) won the 2026 Dutch Grand Prix, ahead of Kimi Antonelli and George Russell.',
    );
  });
});
