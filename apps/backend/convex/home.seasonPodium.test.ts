/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

const DAY = 24 * 60 * 60 * 1000;

describe('getHomePageData seasonPodium', () => {
  it('ranks the finished season by Top 5 plus team-mate points, between seasons only', async () => {
    const t = convexTest(schema, modules);
    const now = Date.now();
    await t.run(async (ctx) => {
      await ctx.db.insert('races', {
        season: 2026,
        round: 23,
        name: 'Abu Dhabi Grand Prix',
        slug: 'abu-dhabi-2026',
        raceStartAt: now - 3 * DAY,
        predictionLockAt: now - 3 * DAY,
        status: 'finished',
        createdAt: 0,
        updatedAt: 0,
      });
      // Top 5 alone would put "top5" first; with team-mate points "duels" wins.
      for (const [name, top5, h2h] of [
        ['top5', 500, 10],
        ['duels', 480, 40],
        ['third', 400, 20],
        ['fourth', 100, 0],
      ] as const) {
        const userId = await ctx.db.insert('users', {
          clerkUserId: name,
          username: name,
          createdAt: 0,
          updatedAt: 0,
        });
        await ctx.db.insert('seasonStandings', {
          userId,
          season: 2026,
          totalPoints: top5,
          raceCount: 23,
          username: name,
          updatedAt: 0,
        });
        await ctx.db.insert('h2hSeasonStandings', {
          userId,
          season: 2026,
          totalPoints: h2h,
          raceCount: 23,
          correctPicks: h2h,
          totalPicks: 100,
          username: name,
          updatedAt: 0,
        });
      }
    });

    const offSeason = await t.query(api.home.getHomePageData, { now });
    expect(offSeason.seasonPodium).toMatchObject({
      season: 2026,
      players: [
        { rank: 1, username: 'duels', points: 520 },
        { rank: 2, username: 'top5', points: 510 },
        { rank: 3, username: 'third', points: 420 },
      ],
    });

    await t.run(async (ctx) => {
      await ctx.db.insert('races', {
        season: 2027,
        round: 1,
        name: 'Bahrain Grand Prix',
        slug: 'bahrain-2027',
        raceStartAt: now + 30 * DAY,
        predictionLockAt: now + 30 * DAY,
        status: 'upcoming',
        createdAt: 0,
        updatedAt: 0,
      });
    });
    const raceWeek = await t.query(api.home.getHomePageData, { now });
    expect(raceWeek.seasonPodium).toBeNull();
  });
});
