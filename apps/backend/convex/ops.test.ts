/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

const HOUR = 60 * 60 * 1000;

const newsItem = {
  raceSlug: 'test-2026',
  headline: 'Headline',
  body: 'Body.',
  sourceName: 'Example',
  sourceUrl: 'https://example.com/story',
};

async function seed(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const raceId = await ctx.db.insert('races', {
      season: 2026,
      round: 1,
      name: 'Test Grand Prix',
      slug: 'test-2026',
      qualiLockAt: Date.now() + HOUR,
      raceStartAt: Date.now() + 2 * HOUR,
      predictionLockAt: Date.now() + 2 * HOUR,
      status: 'upcoming',
      createdAt: 0,
      updatedAt: 0,
    });
    const driverId = await ctx.db.insert('drivers', {
      code: 'VER',
      displayName: 'Driver VER',
      team: 'Red Bull',
      createdAt: 0,
      updatedAt: 0,
    });
    for (let i = 0; i < 3; i += 1) {
      const userId = await ctx.db.insert('users', {
        clerkUserId: `player-${i}`,
        username: `player-${i}`,
        displayName: `Player ${i}`,
        createdAt: 0,
        updatedAt: 0,
      });
      await ctx.db.insert('predictions', {
        userId,
        raceId,
        sessionType: i === 0 ? 'quali' : 'race',
        picks: [driverId],
        submittedAt: 0,
        updatedAt: 0,
      });
    }
    return raceId;
  });
}

describe('ops.raceState', () => {
  it('summarises the current weekend when no slug is given', async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    await t.mutation(internal.raceNews.publish, {
      ...newsItem,
      key: 'a',
      category: 'general',
      affectsSessions: [],
    });
    await t.mutation(internal.raceNews.publish, {
      ...newsItem,
      key: 'b',
      category: 'general',
      affectsSessions: [],
    });
    await t.mutation(internal.raceNews.retract, {
      raceSlug: 'test-2026',
      key: 'b',
    });

    const state = await t.query(internal.ops.raceState, {});
    expect(state).toMatchObject({
      slug: 'test-2026',
      status: 'upcoming',
      hasSprint: false,
      news: { active: 1, retracted: 1, held: 0 },
    });
    expect(
      state?.sessions.map((s) => [s.session, s.top5Pickers, s.result]),
    ).toEqual([
      ['quali', 1, null],
      ['race', 2, null],
    ]);
  });

  it('returns null for an unknown slug', async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    expect(
      await t.query(internal.ops.raceState, { raceSlug: 'nope-2026' }),
    ).toBeNull();
  });
});

describe('ops.newsList', () => {
  it('lists compact rows with defaults filled in, and one item in full by key', async () => {
    const t = convexTest(schema, modules);
    await seed(t);
    await t.mutation(internal.raceNews.publish, {
      ...newsItem,
      key: 'ver-penalty',
      affectsSessions: ['race'],
      driverCodes: ['VER'],
    });

    const list = await t.query(internal.ops.newsList, {
      raceSlug: 'test-2026',
    });
    expect(list?.items).toEqual([
      expect.objectContaining({
        key: 'ver-penalty',
        category: 'pick_related',
        affectsSessions: ['race'],
        driverCodes: ['VER'],
        active: true,
        feedSelected: true,
        writeUpSelected: true,
        gridRows: 0,
      }),
    ]);
    expect(list?.items[0]).not.toHaveProperty('body');

    const one = await t.query(internal.ops.newsList, {
      raceSlug: 'test-2026',
      key: 'ver-penalty',
    });
    expect(one?.item).toMatchObject({ key: 'ver-penalty', body: 'Body.' });
  });
});
