/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';
import { api } from './_generated/api';
import type { Id, TableNames } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';
import {
  loadLatestScoredWeekend,
  loadUserPredictionHistory,
} from './predictions';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
type Ctx = Parameters<Parameters<ReturnType<typeof convexTest>['run']>[0]>[0];

async function seed(ctx: Ctx) {
  const userId = await ctx.db.insert('users', {
    clerkUserId: 'viewer',
    createdAt: 0,
    updatedAt: 0,
  });
  const rivalId = await ctx.db.insert('users', {
    clerkUserId: 'rival',
    createdAt: 0,
    updatedAt: 0,
  });
  const raceIds: Id<'races'>[] = [];
  // Insertion order deliberately disagrees with race-date order.
  for (const round of [3, 1, 2]) {
    const raceId = await ctx.db.insert('races', {
      season: 2026,
      round,
      name: `Round ${round}`,
      slug: `round-${round}`,
      raceStartAt: round * 1000,
      predictionLockAt: round * 1000,
      status: 'finished',
      createdAt: 0,
      updatedAt: 0,
    });
    raceIds[round - 1] = raceId;
    await ctx.db.insert('predictions', {
      userId,
      raceId,
      sessionType: 'race',
      picks: [],
      submittedAt: 0,
      updatedAt: 0,
    });
    for (const playerId of [userId, rivalId]) {
      await ctx.db.insert('scores', {
        userId: playerId,
        raceId,
        sessionType: 'race',
        points: round === 3 ? 0 : 10,
        createdAt: 0,
        updatedAt: 0,
      });
    }
  }
  return { userId, rivalId, raceIds };
}

describe('focused dashboard result', () => {
  it('matches history including zero scores and tied ranks with fewer leaderboard reads', async () => {
    const t = convexTest(schema, modules);
    const { userId, raceIds } = await t.run(seed);
    const viewer = t.withIdentity({ subject: 'viewer' });
    const scoreQueryCounts: number[] = [];
    const raceReadCounts: number[] = [];
    const result = await viewer.run(async (ctx) => {
      const reads: TableNames[] = [];
      let raceReads = 0;
      const tracked: QueryCtx = {
        ...ctx,
        db: new Proxy(ctx.db, {
          get(target, property, receiver) {
            if (property === 'get') {
              return (...args: unknown[]) => {
                raceReads++;
                return Reflect.apply(target.get, target, args);
              };
            }
            if (property === 'query') {
              return (table: TableNames) => {
                reads.push(table);
                return target.query(table);
              };
            }
            return Reflect.get(target, property, receiver);
          },
        }),
      };
      const history = await loadUserPredictionHistory(tracked, { userId });
      scoreQueryCounts.push(reads.filter((table) => table === 'scores').length);
      raceReadCounts.push(raceReads);
      reads.length = 0;
      raceReads = 0;
      const latest = await loadLatestScoredWeekend(tracked, userId);
      scoreQueryCounts.push(reads.filter((table) => table === 'scores').length);
      raceReadCounts.push(raceReads);
      expect(latest).toMatchObject({
        raceId: raceIds[2],
        totalPoints: 0,
        top5Rank: 1,
        top5FieldSize: 2,
      });
      expect(history[0]).toMatchObject(latest!);
      return latest;
    });
    expect(scoreQueryCounts).toEqual([6, 2]);
    expect(raceReadCounts).toEqual([3, 3]);
    expect(
      await viewer.query(api.predictions.getMyLatestScoredWeekend, {}),
    ).toEqual(result);
    const dashboard = await viewer.query(api.home.getDashboardPageData, {});
    expect(dashboard?.latestScoredWeekend).toEqual(result);
  });

  it('is viewer-scoped and returns null for signed-out and new players', async () => {
    const t = convexTest(schema, modules);
    await t.run(seed);
    await t.run((ctx) =>
      ctx.db.insert('users', {
        clerkUserId: 'new',
        createdAt: 0,
        updatedAt: 0,
      }),
    );
    expect(
      await t.query(api.predictions.getMyLatestScoredWeekend, {}),
    ).toBeNull();
    expect(
      await t
        .withIdentity({ subject: 'new' })
        .query(api.predictions.getMyLatestScoredWeekend, {}),
    ).toBeNull();
  });

  it('ignores unscored predictions, orphan scores, and deleted races', async () => {
    const t = convexTest(schema, modules);
    const { userId, raceIds } = await t.run(seed);
    await t.run(async (ctx) => {
      await ctx.db.delete('races', raceIds[2]);
      const prediction = await ctx.db
        .query('predictions')
        .withIndex('by_user_race_session', (q) =>
          q.eq('userId', userId).eq('raceId', raceIds[1]),
        )
        .first();
      await ctx.db.delete('predictions', prediction!._id);
      const unscored = await ctx.db.insert('races', {
        season: 2026,
        round: 4,
        name: 'Unscored',
        slug: 'unscored',
        raceStartAt: 4000,
        predictionLockAt: 4000,
        status: 'locked',
        createdAt: 0,
        updatedAt: 0,
      });
      await ctx.db.insert('predictions', {
        userId,
        raceId: unscored,
        sessionType: 'race',
        picks: [],
        submittedAt: 0,
        updatedAt: 0,
      });
    });
    const viewer = t.withIdentity({ subject: 'viewer' });
    const latest = await viewer.query(
      api.predictions.getMyLatestScoredWeekend,
      {},
    );
    const history = await viewer.query(
      api.predictions.getUserPredictionHistory,
      { userId },
    );
    expect(latest?.raceId).toBe(raceIds[0]);
    expect(history.find((weekend) => weekend.hasScores)).toMatchObject(latest!);
  });

  it('still hides open picks from visitors while showing owners their submissions', async () => {
    const t = convexTest(schema, modules);
    const { userId, raceIds } = await t.run(seed);
    await t.run(async (ctx) => {
      await ctx.db.patch('races', raceIds[2], {
        predictionLockAt: Date.now() + 60_000,
        status: 'upcoming',
      });
      const prediction = await ctx.db
        .query('predictions')
        .withIndex('by_user_race_session', (q) =>
          q.eq('userId', userId).eq('raceId', raceIds[2]),
        )
        .first();
      await ctx.db.patch('predictions', prediction!._id, { submittedAt: 123 });
    });
    const visitor = await t.query(api.predictions.getUserPredictionHistory, {
      userId,
    });
    expect(visitor[0].sessions.race).toMatchObject({
      isHidden: true,
      submittedAt: 0,
      points: null,
    });
    const owner = await t
      .withIdentity({ subject: 'viewer' })
      .query(api.predictions.getUserPredictionHistory, { userId });
    expect(owner[0].sessions.race).toMatchObject({
      isHidden: false,
      submittedAt: 123,
      points: 0,
    });
  });
});
