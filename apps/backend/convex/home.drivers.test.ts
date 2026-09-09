/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
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
});
