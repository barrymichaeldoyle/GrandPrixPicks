/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { expect, it, vi } from 'vitest';
import { internal } from './_generated/api';
import type { QueryCtx } from './_generated/server';
import { loadChampionship, loadConstructorPoints } from './f1Standings';
import { withStandingsInvalidation } from './lib/standingsMutations';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

async function fixture() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const first = await ctx.db.insert('drivers', {
      code: 'AAA',
      displayName: 'First',
      team: 'McLaren',
      createdAt: 0,
      updatedAt: 0,
    });
    const second = await ctx.db.insert('drivers', {
      code: 'BBB',
      displayName: 'Second',
      team: 'Ferrari',
      createdAt: 0,
      updatedAt: 0,
    });
    const stint = await ctx.db.insert('driverTeamStints', {
      driverId: first,
      season: 2026,
      team: 'McLaren',
      fromRound: 1,
      createdAt: 0,
      updatedAt: 0,
    });
    const race = await ctx.db.insert('races', {
      season: 2026,
      round: 1,
      name: 'Race',
      slug: 'race',
      raceStartAt: 1,
      predictionLockAt: 1,
      status: 'finished',
      createdAt: 0,
      updatedAt: 0,
    });
    const result = await ctx.db.insert('results', {
      raceId: race,
      sessionType: 'race',
      classification: [first, second],
      publishedAt: 1,
      updatedAt: 1,
    });
    return { first, second, stint, race, result };
  });
  return { t, ...ids };
}

it('warms missing summaries once and leaves valid summaries cached', async () => {
  vi.useFakeTimers();
  try {
    const { t } = await fixture();
    await t.run(async (ctx) => {
      for (let round = 1; round <= 102; round++) {
        await ctx.db.insert('races', {
          season: 2025,
          round,
          name: 'Historical race',
          slug: `history-${round}`,
          status: 'finished',
          raceStartAt: 0,
          predictionLockAt: 0,
          createdAt: 0,
          updatedAt: 0,
        });
      }
    });
    expect(await t.mutation(internal.constructorPointsCache.warm, {})).toEqual([
      2025, 2026,
    ]);
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    expect(await t.mutation(internal.constructorPointsCache.warm, {})).toEqual(
      [],
    );
  } finally {
    vi.useRealTimers();
  }
});

it('returns identical constructor points from one summary read and supports missing/versioned caches', async () => {
  const { t } = await fixture();
  const expected = await t.run(async (ctx) =>
    (await loadChampionship(ctx, 2026)).constructors.map(
      ({ team, points }) => [team, points] as const,
    ),
  );
  expect(
    await t.run(async (ctx) => [...(await loadConstructorPoints(ctx, 2026))]),
  ).toEqual(expected);
  await t.mutation(internal.constructorPointsCache.rebuild, { season: 2026 });
  const reads: string[] = [];
  await t.run(async (ctx) => {
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
    expect([...(await loadConstructorPoints(tracked, 2026))]).toEqual(expected);
  });
  expect(reads).toEqual(['constructorPointsCache']);
  await t.run(async (ctx) => {
    const cached = await ctx.db.query('constructorPointsCache').first();
    await ctx.db.patch('constructorPointsCache', cached!._id, {
      version: -1,
      points: [],
    });
    expect([...(await loadConstructorPoints(ctx, 2026))]).toEqual(expected);
  });
});

it('invalidates published corrections immediately and rebuilds without serving old points', async () => {
  const { t, first, second, race } = await fixture();
  await t.mutation(internal.constructorPointsCache.rebuild, { season: 2026 });
  // Exercise a registered writer, rather than only the invalidation helper.
  await t.mutation(internal.testing.publishTestResults, {
    raceId: race,
    classification: [second, first],
  });
  await t.run(async (ctx) => {
    expect(await ctx.db.query('constructorPointsCache').first()).toBeNull();
    const live = await loadConstructorPoints(ctx, 2026);
    expect(live.get('McLaren')).toBe(18);
    expect(live.get('Ferrari')).toBe(25);
  });
  await t.mutation(internal.constructorPointsCache.rebuild, { season: 2026 });
  expect(
    await t.run(async (ctx) => [...(await loadConstructorPoints(ctx, 2026))]),
  ).toEqual([
    ['Ferrari', 25],
    ['McLaren', 18],
  ]);
});

it('ignores timing/recheck writes and qualifying, but invalidates sprint and DNF changes', async () => {
  const { t, first, second, race, result } = await fixture();
  await t.mutation(internal.constructorPointsCache.rebuild, { season: 2026 });
  await t.run(async (ctx) => {
    const source = withStandingsInvalidation(ctx);
    await source.db.patch('results', result, {
      lastRecheckedAt: 500,
      updatedAt: 500,
    });
    await source.db.insert('results', {
      raceId: race,
      sessionType: 'quali',
      classification: [second, first],
      publishedAt: 2,
      updatedAt: 2,
    });
    expect(await ctx.db.query('constructorPointsCache').first()).not.toBeNull();
  });
  await t.run(async (ctx) => {
    await withStandingsInvalidation(ctx).db.insert('results', {
      raceId: race,
      sessionType: 'sprint',
      classification: [second, first],
      publishedAt: 3,
      updatedAt: 3,
    });
    expect(await ctx.db.query('constructorPointsCache').first()).toBeNull();
    expect((await loadConstructorPoints(ctx, 2026)).get('Ferrari')).toBe(26);
  });
  await t.mutation(internal.constructorPointsCache.rebuild, { season: 2026 });
  await t.run(async (ctx) => {
    await withStandingsInvalidation(ctx).db.patch('results', result, {
      dnfDriverIds: [first],
    });
    expect(await ctx.db.query('constructorPointsCache').first()).toBeNull();
    expect((await loadConstructorPoints(ctx, 2026)).get('McLaren')).toBe(7);
  });
});

it('re-attributes points after a stint correction and driver fallback change', async () => {
  const { t, stint, second } = await fixture();
  await t.mutation(internal.constructorPointsCache.rebuild, { season: 2026 });
  await t.run(async (ctx) => {
    await withStandingsInvalidation(ctx).db.patch('driverTeamStints', stint, {
      team: 'Williams',
    });
    expect(await ctx.db.query('constructorPointsCache').first()).toBeNull();
    expect((await loadConstructorPoints(ctx, 2026)).get('Williams')).toBe(25);
  });
  await t.mutation(internal.constructorPointsCache.rebuild, { season: 2026 });
  await t.run(async (ctx) => {
    await withStandingsInvalidation(ctx).db.patch('drivers', second, {
      team: 'Haas F1 Team',
    });
    expect(await ctx.db.query('constructorPointsCache').first()).toBeNull();
    expect((await loadConstructorPoints(ctx, 2026)).get('Haas F1 Team')).toBe(
      18,
    );
  });
});

it('drops points when a scored race is cancelled or deleted and deduplicates rebuilds within a transaction', async () => {
  const { t, race, result, second } = await fixture();
  await t.mutation(internal.constructorPointsCache.rebuild, { season: 2026 });
  await t.run(async (ctx) => {
    const source = withStandingsInvalidation(ctx);
    await source.db.patch('results', result, { classification: [second] });
    await source.db.patch('races', race, { status: 'cancelled' });
    expect(await ctx.db.query('constructorPointsCache').first()).toBeNull();
    expect(
      [...(await loadConstructorPoints(ctx, 2026))].every(
        ([, points]) => points === 0,
      ),
    ).toBe(true);
    expect(
      await ctx.db.system.query('_scheduled_functions').collect(),
    ).toHaveLength(1);
  });
  await t.mutation(internal.constructorPointsCache.rebuild, { season: 2026 });
  await t.run(async (ctx) => {
    await withStandingsInvalidation(ctx).db.delete('races', race);
    expect(await ctx.db.query('constructorPointsCache').first()).toBeNull();
    expect(
      [...(await loadConstructorPoints(ctx, 2026))].every(
        ([, points]) => points === 0,
      ),
    ).toBe(true);
  });
});
