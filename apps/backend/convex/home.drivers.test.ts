/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';
import { loadRosterWithConstructorPoints } from './drivers';
import { loadConstructorPoints } from './f1Standings';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

const HOUR = 60 * 60 * 1000;

type Ctx = Parameters<Parameters<ReturnType<typeof convexTest>['run']>[0]>[0];

/**
 * Alphabetical order and constructor order deliberately disagree here: the
 * driver whose name sorts first is in the team that sorts last. A test seeded
 * with names already in team order would pass against either ordering rule,
 * which is exactly the bug this file exists to catch.
 */
const GRID = [
  { code: 'AAA', displayName: 'Aaa', team: 'Haas F1 Team', number: 1 },
  { code: 'BBB', displayName: 'Bbb', team: 'Haas F1 Team', number: 2 },
  { code: 'YYY', displayName: 'Yyy', team: 'McLaren', number: 3 },
  { code: 'ZZZ', displayName: 'Zzz', team: 'McLaren', number: 4 },
] as const;

async function seedNextRaceGrid(ctx: Ctx) {
  await ctx.db.insert('races', {
    season: 2026,
    round: 3,
    name: 'Test Grand Prix',
    slug: 'test-2026',
    raceStartAt: Date.now() + HOUR,
    predictionLockAt: Date.now() + HOUR,
    status: 'upcoming',
    createdAt: 0,
    updatedAt: 0,
  });

  for (const driver of GRID) {
    const driverId: Id<'drivers'> = await ctx.db.insert('drivers', {
      code: driver.code,
      displayName: driver.displayName,
      team: driver.team,
      number: driver.number,
      createdAt: 0,
      updatedAt: 0,
    });
    await ctx.db.insert('driverTeamStints', {
      driverId,
      season: 2026,
      team: driver.team,
      fromRound: 1,
      createdAt: 0,
      updatedAt: 0,
    });
  }
}

describe('getHomePageData drivers', () => {
  it('reads the roster and stints once while preserving championship ordering', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await seedNextRaceGrid(ctx);
      const raceId = await ctx.db.insert('races', {
        season: 2026,
        round: 2,
        name: 'Previous Grand Prix',
        slug: 'previous-2026',
        raceStartAt: Date.now() - HOUR,
        predictionLockAt: Date.now() - HOUR,
        status: 'finished',
        createdAt: 0,
        updatedAt: 0,
      });
      const allDrivers = await ctx.db.query('drivers').collect();
      const byCode = new Map(
        allDrivers.map((driver) => [driver.code, driver._id]),
      );
      await ctx.db.insert('results', {
        raceId,
        sessionType: 'race',
        classification: ['AAA', 'YYY', 'BBB', 'ZZZ'].map((code) =>
          byCode.get(code)!,
        ),
        publishedAt: 0,
        updatedAt: 0,
      });
      const reads: string[] = [];
      const tracked: QueryCtx = {
        ...ctx,
        db: new Proxy(ctx.db, {
          get(target, property, receiver) {
            if (property === 'query') {
              return (table: Parameters<typeof target.query>[0]) => {
                reads.push(table);
                return target.query(table);
              };
            }
            return Reflect.get(target, property, receiver);
          },
        }),
      };
      const roster = await loadRosterWithConstructorPoints(tracked, {
        season: 2026,
        round: 3,
      });
      expect(reads.filter((table) => table === 'drivers')).toHaveLength(1);
      expect(
        reads.filter((table) => table === 'driverTeamStints'),
      ).toHaveLength(1);
      expect(roster.teamPoints).toEqual(await loadConstructorPoints(ctx, 2026));
      expect(roster.drivers.map((driver) => driver.code)).toEqual([
        'AAA',
        'BBB',
        'YYY',
        'ZZZ',
      ]);
    });
  });

  it('returns the roster listDrivers returns, so the picker does not re-order on hydration', async () => {
    const t = convexTest(schema, modules);
    await t.run(seedNextRaceGrid);

    // The arguments the picker's own subscription passes for the next race.
    const live = await t.query(api.drivers.listDrivers, {
      round: 3,
      season: 2026,
      includeNotRacing: true,
    });
    const ssr = await t.query(api.home.getHomePageData, { now: Date.now() });

    // Guards the guard: if the seed ever sorted the same both ways, the
    // assertion below would hold no matter which ordering home.ts used.
    expect(live.map((driver) => driver.code)).toEqual([
      'YYY',
      'ZZZ',
      'AAA',
      'BBB',
    ]);
    expect(ssr.drivers.map((driver) => driver.code)).toEqual(
      live.map((driver) => driver.code),
    );
  });

  it('preserves weekend points and identity fallbacks without exposing display names', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await seedNextRaceGrid(ctx);
      const raceId = await ctx.db.insert('races', {
        season: 2026,
        round: 2,
        name: 'Previous Grand Prix',
        slug: 'previous-2026',
        raceStartAt: Date.now() - HOUR,
        predictionLockAt: Date.now() - HOUR,
        status: 'finished',
        createdAt: 0,
        updatedAt: 0,
      });
      for (const [index, source] of ['top5', 'h2h', 'user'].entries()) {
        const userId = await ctx.db.insert('users', {
          clerkUserId: source,
          username: `${source}-user`,
          displayName: 'Private Name',
          avatarUrl: `${source}-avatar`,
          createdAt: 0,
          updatedAt: 0,
        });
        await ctx.db.insert('scores', {
          userId,
          raceId,
          sessionType: 'race',
          points: 30 - index * 10,
          createdAt: 0,
          updatedAt: 0,
        });
        if (source !== 'user') {
          await ctx.db.insert('h2hSeasonStandings', {
            userId,
            season: 2026,
            username: `${source}-h2h-standing`,
            avatarUrl: `${source}-h2h-avatar`,
            totalPoints: 1,
            raceCount: 1,
            correctPicks: 1,
            totalPicks: 11,
            updatedAt: 0,
          });
        }
        if (source === 'top5') {
          await ctx.db.insert('seasonStandings', {
            userId,
            season: 2026,
            username: 'top5-standing',
            avatarUrl: 'top5-standing-avatar',
            totalPoints: 30,
            raceCount: 1,
            updatedAt: 0,
          });
        }
      }
    });
    const home = await t.query(api.home.getHomePageData, { now: Date.now() });
    expect(home.weekendBoard).toMatchObject({
      raceSlug: 'previous-2026',
      playerCount: 3,
      players: [
        {
          rank: 1,
          points: 30,
          username: 'top5-standing',
          avatarUrl: 'top5-standing-avatar',
        },
        {
          rank: 2,
          points: 20,
          username: 'h2h-h2h-standing',
          avatarUrl: 'h2h-h2h-avatar',
        },
        {
          rank: 3,
          points: 10,
          username: 'user-user',
          avatarUrl: 'user-avatar',
        },
      ],
    });
    for (const player of home.weekendBoard!.players) {
      expect(player).not.toHaveProperty('displayName');
    }
  });
});
