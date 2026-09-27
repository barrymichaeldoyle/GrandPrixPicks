/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api, internal } from './_generated/api';
import schema from './schema';
import { parseOpenF1Results, parseResultTiming } from './openF1Results';

const modules = import.meta.glob('./**/*.ts');

describe('OpenF1 finishing gaps', () => {
  it('reads seconds, laps down, laps and race time', () => {
    expect(
      parseResultTiming({
        gap_to_leader: 0,
        duration: 5882.143,
        number_of_laps: 51,
      }),
    ).toEqual({ gapToLeaderSeconds: 0, durationSeconds: 5882.143, laps: 51 });
    expect(parseResultTiming({ gap_to_leader: 0.196 })).toEqual({
      gapToLeaderSeconds: 0.196,
    });
    expect(parseResultTiming({ gap_to_leader: '+1 LAP' })).toEqual({
      lapsDown: 1,
    });
    expect(parseResultTiming({ gap_to_leader: '+2 LAPS' })).toEqual({
      lapsDown: 2,
    });
  });

  it('drops what it does not recognise instead of failing the result', () => {
    // Qualifying sends one value per part; a retirement sends nulls.
    expect(
      parseResultTiming({
        gap_to_leader: [0, 0.1, 0.2],
        duration: [90.1, 89.5, null],
      }),
    ).toEqual({});
    expect(
      parseResultTiming({
        gap_to_leader: null,
        duration: null,
        number_of_laps: 7,
      }),
    ).toEqual({ laps: 7 });
    expect(parseResultTiming({ gap_to_leader: 'DNF' })).toEqual({});
  });

  it('carries the gaps through the parsed classification', () => {
    const rows = parseOpenF1Results(
      Array.from({ length: 5 }, (_, index) => ({
        driver_number: index + 1,
        position: index + 1,
        dnf: false,
        dns: false,
        dsq: false,
        gap_to_leader: index === 0 ? 0 : index * 1.5,
        number_of_laps: 51,
      })),
    );
    expect(rows[1]).toMatchObject({ gapToLeaderSeconds: 1.5, laps: 51 });
  });
});

describe('recordResultTiming', () => {
  async function seed() {
    const t = convexTest(schema, modules);
    const ids = await t.run(async (ctx) => {
      const raceId = await ctx.db.insert('races', {
        season: 2026,
        round: 15,
        name: 'Azerbaijan Grand Prix',
        slug: 'azerbaijan-2026',
        raceStartAt: 0,
        predictionLockAt: 0,
        status: 'finished',
        createdAt: 0,
        updatedAt: 0,
      });
      const winner = await ctx.db.insert('drivers', {
        code: 'RUS',
        displayName: 'George Russell',
        team: 'Mercedes',
        createdAt: 0,
        updatedAt: 0,
      });
      const second = await ctx.db.insert('drivers', {
        code: 'VER',
        displayName: 'Max Verstappen',
        team: 'Red Bull Racing',
        createdAt: 0,
        updatedAt: 0,
      });
      const resultId = await ctx.db.insert('results', {
        raceId,
        sessionType: 'race',
        classification: [winner, second],
        scoringStatus: 'complete',
        publishedAt: 1,
        updatedAt: 1,
      });
      return { raceId, winner, second, resultId };
    });
    return { t, ...ids };
  }

  it('stores the gaps and changes nothing else on the result', async () => {
    const { t, raceId, winner, second, resultId } = await seed();
    const before = await t.run((ctx) => ctx.db.get(resultId));

    const outcome = await t.mutation(
      internal.openF1Results.recordResultTiming,
      {
        raceId,
        sessionType: 'race',
        timing: [
          {
            driverId: winner,
            gapToLeaderSeconds: 0,
            durationSeconds: 5882.143,
          },
          { driverId: second, gapToLeaderSeconds: 0.196 },
        ],
      },
    );
    expect(outcome).toEqual({ recorded: true });

    const after = await t.run((ctx) => ctx.db.get(resultId));
    const { timing, ...rest } = after!;
    const { timing: _none, ...restBefore } = before!;
    expect(rest).toEqual(restBefore);
    expect(timing).toHaveLength(2);

    const result = await t.query(api.results.getResultForRace, {
      raceId,
      sessionType: 'race',
    });
    expect(result?.enrichedClassification[1]).toMatchObject({
      code: 'VER',
      gapToLeaderSeconds: 0.196,
      lapsDown: null,
    });
  });

  it('leaves a missing result and an empty timing alone', async () => {
    const { t, raceId, winner } = await seed();
    expect(
      await t.mutation(internal.openF1Results.recordResultTiming, {
        raceId,
        sessionType: 'sprint',
        timing: [{ driverId: winner, gapToLeaderSeconds: 0 }],
      }),
    ).toEqual({ recorded: false });
    expect(
      await t.mutation(internal.openF1Results.recordResultTiming, {
        raceId,
        sessionType: 'race',
        timing: [],
      }),
    ).toEqual({ recorded: false });
  });
});
