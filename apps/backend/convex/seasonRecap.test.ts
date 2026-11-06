/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

type Ctx = Parameters<Parameters<ReturnType<typeof convexTest>['run']>[0]>[0];

async function addUser(ctx: Ctx, username: string) {
  return await ctx.db.insert('users', {
    clerkUserId: username,
    username,
    displayName: username,
    createdAt: 0,
    updatedAt: 0,
  });
}

async function addRace(
  ctx: Ctx,
  round: number,
  status: 'upcoming' | 'finished' | 'cancelled',
) {
  return await ctx.db.insert('races', {
    season: 2026,
    round,
    name: `Race ${round}`,
    slug: `race-${round}-2026`,
    raceStartAt: round * 1000,
    predictionLockAt: round * 1000,
    status,
    createdAt: 0,
    updatedAt: 0,
  });
}

async function addDriver(ctx: Ctx, code: string, team: string) {
  return await ctx.db.insert('drivers', {
    code,
    displayName: code,
    team,
    createdAt: 0,
    updatedAt: 0,
  });
}

type Pick = {
  driverId: Id<'drivers'>;
  predictedPosition: number;
  actualPosition?: number;
  points: number;
};

async function addScore(
  ctx: Ctx,
  userId: Id<'users'>,
  raceId: Id<'races'>,
  sessionType: 'quali' | 'race',
  breakdown: Pick[],
) {
  await ctx.db.insert('scores', {
    userId,
    raceId,
    sessionType,
    points: breakdown.reduce((sum, pick) => sum + pick.points, 0),
    breakdown,
    createdAt: 0,
    updatedAt: 0,
  });
}

describe('seasonRecap.getSeasonRecap', () => {
  it('returns null for an unknown username', async () => {
    const t = convexTest(schema, modules);
    expect(
      await t.query(api.seasonRecap.getSeasonRecap, { username: 'nobody' }),
    ).toBeNull();
  });

  it('sums a season from published scores and ranks the player', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const me = await addUser(ctx, 'me');
      const rival = await addUser(ctx, 'rival');
      const ver = await addDriver(ctx, 'VER', 'Red Bull Racing');
      const nor = await addDriver(ctx, 'NOR', 'McLaren');
      const r1 = await addRace(ctx, 1, 'finished');
      const r2 = await addRace(ctx, 2, 'finished');
      await addRace(ctx, 3, 'cancelled');
      await addRace(ctx, 4, 'upcoming');

      // Round 1: VER called as the winner, NOR one place off.
      await addScore(ctx, me, r1, 'race', [
        { driverId: ver, predictedPosition: 1, actualPosition: 1, points: 5 },
        { driverId: nor, predictedPosition: 2, actualPosition: 3, points: 3 },
      ]);
      // Round 2: VER in the top 5 but two off, NOR missed.
      await addScore(ctx, me, r2, 'race', [
        { driverId: ver, predictedPosition: 1, actualPosition: 3, points: 1 },
        { driverId: nor, predictedPosition: 2, actualPosition: 9, points: 0 },
      ]);
      await addScore(ctx, me, r2, 'quali', [
        { driverId: ver, predictedPosition: 1, actualPosition: 1, points: 5 },
      ]);
      // The rival beats me in round 2 only.
      await addScore(ctx, rival, r2, 'race', [
        { driverId: nor, predictedPosition: 1, actualPosition: 1, points: 5 },
        { driverId: ver, predictedPosition: 2, actualPosition: 3, points: 3 },
      ]);

      for (const [userId, totalPoints] of [
        [me, 14],
        [rival, 8],
      ] as const) {
        await ctx.db.insert('seasonStandings', {
          userId,
          season: 2026,
          totalPoints,
          raceCount: 2,
          updatedAt: 0,
        });
      }
      await ctx.db.insert('h2hSeasonStandings', {
        userId: me,
        season: 2026,
        totalPoints: 7,
        raceCount: 2,
        correctPicks: 7,
        totalPicks: 11,
        updatedAt: 0,
      });
    });

    const recap = await t.query(api.seasonRecap.getSeasonRecap, {
      username: 'me',
    });
    expect(recap).not.toBeNull();
    expect(recap!.season).toBe(2026);
    // The cancelled round is not a round; the upcoming one keeps it open.
    expect(recap!.roundsInSeason).toBe(3);
    expect(recap!.roundsFinished).toBe(2);
    expect(recap!.seasonComplete).toBe(false);

    expect(recap!.topFive).toEqual({
      points: 14,
      rank: 1,
      players: 2,
      weekendsScored: 2,
      sessionsScored: 3,
      exactPicks: 2,
      nearPicks: 1,
      topFivePicks: 1,
      totalPicks: 5,
      winnerCalls: 2,
    });
    expect(recap!.h2h).toEqual({
      points: 7,
      rank: 1,
      players: 1,
      correct: 7,
      total: 11,
    });

    expect(recap!.bestWeekend).toMatchObject({
      round: 1,
      points: 8,
      rank: 1,
      players: 1,
    });
    expect(recap!.bestSession).toMatchObject({
      round: 1,
      sessionType: 'race',
      points: 8,
    });
    expect(recap!.mostBacked).toEqual({
      code: 'VER',
      name: 'VER',
      team: 'Red Bull Racing',
      timesPicked: 3,
      timesInTopFive: 3,
    });
    expect(recap!.weekends.map((w) => [w.round, w.points, w.rank])).toEqual([
      [1, 8, 1],
      [2, 6, 2],
    ]);
  });

  it('reports a complete season once every real round has finished', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await addUser(ctx, 'me');
      await addRace(ctx, 1, 'finished');
      await addRace(ctx, 2, 'cancelled');
    });
    const recap = await t.query(api.seasonRecap.getSeasonRecap, {
      username: 'me',
    });
    expect(recap!.seasonComplete).toBe(true);
    expect(recap!.topFive.points).toBe(0);
    expect(recap!.h2h).toBeNull();
    expect(recap!.mostBacked).toBeNull();
    expect(recap!.bestWeekend).toBeNull();
  });
});
