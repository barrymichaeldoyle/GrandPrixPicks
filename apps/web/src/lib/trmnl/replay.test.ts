import type { Id } from '@convex-generated/dataModel';
import { describe, expect, it } from 'vitest';

import { momentAt, pickReplay, replayWeekend } from './replay';
import type { TrmnlWeekendData } from './weekendData';

function at(iso: string): number {
  return Date.parse(iso);
}

const HOUR = 60 * 60 * 1000;

const monza = {
  _id: 'monza' as Id<'races'>,
  slug: 'italy-2026',
  name: 'Italian Grand Prix',
  round: 16,
  season: 2026,
  status: 'finished' as const,
  hasSprint: false,
  fp1StartAt: at('2026-09-04T11:30:00Z'),
  fp2StartAt: at('2026-09-04T15:00:00Z'),
  fp3StartAt: at('2026-09-05T10:30:00Z'),
  sprintQualiStartAt: undefined,
  sprintQualiLockAt: undefined,
  sprintStartAt: undefined,
  sprintLockAt: undefined,
  qualiStartAt: at('2026-09-05T14:00:00Z'),
  qualiLockAt: at('2026-09-05T14:00:00Z'),
  raceStartAt: at('2026-09-06T13:00:00Z'),
  predictionLockAt: at('2026-09-06T13:00:00Z'),
};

const baku = {
  ...monza,
  _id: 'baku' as Id<'races'>,
  slug: 'azerbaijan-2026',
  name: 'Azerbaijan Grand Prix',
  round: 17,
  status: 'upcoming' as const,
  fp1StartAt: at('2026-09-24T08:30:00Z'),
  fp2StartAt: at('2026-09-24T12:00:00Z'),
  fp3StartAt: at('2026-09-25T08:30:00Z'),
  qualiStartAt: at('2026-09-25T12:00:00Z'),
  qualiLockAt: at('2026-09-25T12:00:00Z'),
  raceStartAt: at('2026-09-26T11:00:00Z'),
  predictionLockAt: at('2026-09-26T11:00:00Z'),
};

const miami = {
  ...monza,
  _id: 'miami' as Id<'races'>,
  slug: 'miami-2026',
  name: 'Miami Grand Prix',
  round: 6,
  hasSprint: true,
  fp1StartAt: at('2026-05-01T16:30:00Z'),
  fp2StartAt: undefined,
  fp3StartAt: undefined,
  sprintQualiStartAt: at('2026-05-01T20:30:00Z'),
  sprintStartAt: at('2026-05-02T16:00:00Z'),
  qualiStartAt: at('2026-05-02T20:00:00Z'),
  raceStartAt: at('2026-05-03T20:00:00Z'),
};

const season = [miami, monza, baku];

describe('pickReplay', () => {
  const tuesday = at('2026-09-22T12:00:00Z');

  it('shows the coming build-up live, at the real time', () => {
    expect(pickReplay(season, 'build-up', tuesday)).toEqual({
      race: baku,
      at: tuesday,
      live: true,
    });
  });

  it('replays the last weekend for moments this one has not reached', () => {
    const friday = pickReplay(season, 'friday', tuesday);
    expect(friday?.race.slug).toBe('italy-2026');
    expect(friday?.at).toBe(monza.fp2StartAt + 3 * HOUR);
    expect(friday?.live).toBe(false);
  });

  it("moves to this weekend's Friday once it has come", () => {
    const saturday = at('2026-09-25T09:00:00Z');
    expect(pickReplay(season, 'friday', saturday)?.race.slug).toBe(
      'azerbaijan-2026',
    );
    expect(pickReplay(season, 'saturday', saturday)?.race.slug).toBe(
      'italy-2026',
    );
  });

  it('finds the last sprint weekend for the sprint moment', () => {
    expect(pickReplay(season, 'sprint', tuesday)?.race.slug).toBe('miami-2026');
  });

  it('has nothing to replay before any weekend reached the moment', () => {
    expect(pickReplay([baku], 'finished', tuesday)).toBe(null);
  });

  it('skips a cancelled round', () => {
    const cancelled = { ...monza, status: 'cancelled' as const };
    expect(
      pickReplay([miami, cancelled, baku], 'finished', tuesday)?.race.slug,
    ).toBe('miami-2026');
  });
});

describe('momentAt', () => {
  it('has no sprint moment on a regular weekend', () => {
    expect(momentAt(monza, 'sprint')).toBe(null);
  });

  it('puts a sprint weekend Friday after sprint qualifying', () => {
    expect(momentAt(miami, 'friday')).toBe(miami.sprintQualiStartAt + 3 * HOUR);
  });
});

describe('replayWeekend', () => {
  const row = { position: 1, code: 'NOR', displayName: 'Lando Norris' };
  const data: TrmnlWeekendData = {
    race: monza,
    results: { quali: [row], race: [row] },
    practice: [
      { sessionType: 'fp1', topThree: [row] },
      { sessionType: 'fp3', topThree: [row] },
    ],
    news: [
      {
        headline: 'Starting grid confirmed',
        publishedAt: at('2026-09-06T09:00:00Z'),
      },
    ],
    weather: null,
  };

  it('shows only what had been published by then', () => {
    const friday = replayWeekend(data, monza.fp2StartAt + 3 * HOUR);
    expect(Object.keys(friday.results)).toEqual([]);
    expect(friday.practice.map((p) => p.sessionType)).toEqual(['fp1']);
    expect(friday.news).toEqual([]);

    const saturday = replayWeekend(data, monza.qualiStartAt + 3 * HOUR);
    expect(Object.keys(saturday.results)).toEqual(['quali']);

    const sunday = replayWeekend(data, monza.raceStartAt + 4 * HOUR);
    expect(Object.keys(sunday.results).sort()).toEqual(['quali', 'race']);
    expect(sunday.news).toHaveLength(1);
  });
});
