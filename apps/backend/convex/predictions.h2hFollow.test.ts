/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import schema from './schema';

const modules = import.meta.glob('./**/*.{ts,tsx}');

async function setup() {
  const t = convexTest(schema, modules);
  const lockAt = Date.now() + 7 * 24 * 60 * 60 * 1000;
  const ids = await t.run(async (ctx) => {
    const userId = await ctx.db.insert('users', {
      clerkUserId: 'player',
      username: 'player',
      createdAt: 0,
      updatedAt: 0,
    });
    const raceId = await ctx.db.insert('races', {
      season: 2026,
      round: 17,
      name: 'Test Grand Prix',
      slug: 'test-2026',
      qualiLockAt: lockAt - 1000,
      raceStartAt: lockAt,
      predictionLockAt: lockAt,
      status: 'upcoming',
      createdAt: 0,
      updatedAt: 0,
    });
    function driver(code: string, team: string) {
      return ctx.db.insert('drivers', {
        code,
        displayName: `Driver ${code}`,
        team,
        createdAt: 0,
        updatedAt: 0,
      });
    }
    const codes = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E1', 'E2'];
    const d: Record<string, Id<'drivers'>> = {};
    for (const code of codes) {
      d[code] = await driver(code, `Team ${code[0]}`);
    }
    function matchup(team: string) {
      return ctx.db.insert('h2hMatchups', {
        season: 2026,
        team: `Team ${team}`,
        driver1Id: d[`${team}1`],
        driver2Id: d[`${team}2`],
        createdAt: 0,
        updatedAt: 0,
      });
    }
    const m = {
      A: await matchup('A'),
      B: await matchup('B'),
      C: await matchup('C'),
    };
    return { userId, raceId, d, m };
  });
  return { t, player: t.withIdentity({ subject: 'player' }), ...ids };
}

describe('submitPrediction keeps duel picks in step with the Top 5', () => {
  it('moves picks that followed the old Top 5 and leaves hedges alone', async () => {
    const { t, player, userId, raceId, d, m } = await setup();

    await player.mutation(api.predictions.submitPrediction, {
      raceId,
      picks: [d.A1, d.B1, d.C1, d.D1, d.E1],
      sessionType: 'race',
    });
    await t.run(async (ctx) => {
      const base = {
        userId,
        raceId,
        sessionType: 'race' as const,
        submittedAt: 0,
        updatedAt: 0,
      };
      // A: follows the Top 5. B: a hedge against it. C: follows it, but the
      // new Top 5 drops both C drivers.
      await ctx.db.insert('h2hPredictions', {
        ...base,
        matchupId: m.A,
        predictedWinnerId: d.A1,
      });
      await ctx.db.insert('h2hPredictions', {
        ...base,
        matchupId: m.B,
        predictedWinnerId: d.B2,
      });
      await ctx.db.insert('h2hPredictions', {
        ...base,
        matchupId: m.C,
        predictedWinnerId: d.C1,
      });
    });

    await player.mutation(api.predictions.submitPrediction, {
      raceId,
      picks: [d.A2, d.B1, d.D1, d.E1, d.D2],
      sessionType: 'race',
    });

    const winners = await t.run(async (ctx) => {
      const rows = await ctx.db
        .query('h2hPredictions')
        .withIndex('by_user_race_session', (q) =>
          q.eq('userId', userId).eq('raceId', raceId).eq('sessionType', 'race'),
        )
        .collect();
      return Object.fromEntries(
        rows.map((row) => [row.matchupId, row.predictedWinnerId]),
      );
    });

    expect(winners[m.A]).toBe(d.A2);
    expect(winners[m.B]).toBe(d.B2);
    expect(winners[m.C]).toBe(d.C1);
  });
});
