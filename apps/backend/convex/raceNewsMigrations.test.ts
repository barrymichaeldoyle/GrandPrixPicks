/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { internal } from './_generated/api';
import {
  ARON_MONZA_FP1_BODY,
  HADJAR_DUTCH_GP_LINEUP_NOTE,
  HERTA_MONZA_FP1_BODY,
} from './lib/italy2026MonzaNewsCopy';
import { BROWNING_WILLIAMS_FP1_WRITEUP_IMAGE } from './lib/raceNewsWriteUpImage';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

const BROWNING_HEADLINE = 'Luke Browning replaces Alex Albon in FP1';
const BROWNING_BODY =
  'Albon races, so Friday morning is not a read on Williams pace.';

describe('publishItaly2026HadjarUpdate', () => {
  it('publishes separate race-line-up and FP1 items idempotently', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const now = 100;
      await ctx.db.insert('races', {
        season: 2026,
        round: 12,
        name: 'Dutch Grand Prix',
        slug: 'netherlands-2026',
        raceStartAt: 1_000,
        predictionLockAt: 900,
        status: 'finished',
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert('races', {
        season: 2026,
        round: 13,
        name: 'Italian Grand Prix',
        slug: 'italy-2026',
        raceStartAt: 2_000,
        predictionLockAt: 1_900,
        status: 'upcoming',
        createdAt: now,
        updatedAt: now,
      });
      for (const driver of [
        ['HAD', 'Isack Hadjar', 'Red Bull Racing'],
        ['LAW', 'Liam Lawson', 'Red Bull Racing'],
        ['TSU', 'Yuki Tsunoda', 'Racing Bulls'],
        ['VER', 'Max Verstappen', 'Red Bull Racing'],
      ] as const) {
        await ctx.db.insert('drivers', {
          code: driver[0],
          displayName: driver[1],
          team: driver[2],
          createdAt: now,
          updatedAt: now,
        });
      }
    });

    await t.mutation(
      internal.raceNewsMigrations.publishItaly2026HadjarUpdate,
      {},
    );
    await t.mutation(
      internal.raceNewsMigrations.publishItaly2026HadjarUpdate,
      {},
    );

    const state = await t.run(async (ctx) => {
      const race = await ctx.db
        .query('races')
        .withIndex('by_slug', (q) => q.eq('slug', 'italy-2026'))
        .unique();
      if (!race) {
        throw new Error('missing italy-2026 race');
      }
      const news = await ctx.db
        .query('raceNews')
        .withIndex('by_race', (q) => q.eq('raceId', race._id))
        .collect();
      const lineupEvent = await ctx.db
        .query('feedEvents')
        .withIndex('by_type_season_round', (q) =>
          q.eq('type', 'lineup_change').eq('season', 2026).eq('round', 12),
        )
        .unique();
      return { news, lineupEvent };
    });

    expect(state.news).toHaveLength(2);
    expect(state.news).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'hadjar-misses-monza',
          headline: 'Hadjar misses Monza; Lawson and Tsunoda stay in',
          driverCodes: ['HAD', 'LAW', 'TSU'],
        }),
        expect.objectContaining({
          key: 'iwasa-red-bull-fp1',
          headline: 'Iwasa replaces Verstappen for Monza FP1',
          driverCodes: ['VER'],
        }),
      ]),
    );
    expect(state.lineupEvent?.lineupNote).toBe(HADJAR_DUTCH_GP_LINEUP_NOTE);
  });
});

describe('addItaly2026BrowningWriteUpPhoto', () => {
  it('attaches the write-up photo without changing headline or body', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert('races', {
        season: 2026,
        round: 13,
        name: 'Italian Grand Prix',
        slug: 'italy-2026',
        raceStartAt: 2_000,
        predictionLockAt: 1_000,
        status: 'upcoming',
        createdAt: 100,
        updatedAt: 100,
      });
    });

    await t.mutation(internal.raceNews.publish, {
      raceSlug: 'italy-2026',
      key: 'browning-williams-fp1',
      headline: BROWNING_HEADLINE,
      body: BROWNING_BODY,
      affectsSessions: ['quali'],
      sourceName: 'Williams',
      sourceUrl: 'https://www.williamsf1.com/example',
    });

    const first = await t.mutation(
      internal.raceNewsMigrations.addItaly2026BrowningWriteUpPhoto,
      {},
    );
    expect(first).toEqual({
      action: 'updated',
      key: 'browning-williams-fp1',
    });

    const second = await t.mutation(
      internal.raceNewsMigrations.addItaly2026BrowningWriteUpPhoto,
      {},
    );
    expect(second).toEqual({
      action: 'unchanged',
      key: 'browning-williams-fp1',
    });

    const row = await t.run(async (ctx) => {
      const race = await ctx.db
        .query('races')
        .withIndex('by_slug', (q) => q.eq('slug', 'italy-2026'))
        .unique();
      if (!race) {
        throw new Error('missing italy-2026 race');
      }
      return await ctx.db
        .query('raceNews')
        .withIndex('by_race_key', (q) =>
          q.eq('raceId', race._id).eq('key', 'browning-williams-fp1'),
        )
        .unique();
    });

    expect(row).toMatchObject({
      headline: BROWNING_HEADLINE,
      body: BROWNING_BODY,
      writeUpImage: BROWNING_WILLIAMS_FP1_WRITEUP_IMAGE,
    });
  });

  it('fails loudly when the news item it patches is missing', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert('races', {
        season: 2026,
        round: 13,
        name: 'Italian Grand Prix',
        slug: 'italy-2026',
        raceStartAt: 2_000,
        predictionLockAt: 1_000,
        status: 'upcoming',
        createdAt: 100,
        updatedAt: 100,
      });
    });

    // The deploy runner only fails on a non-zero exit, so a returned
    // `not_found` would go green with the photo silently unattached.
    await expect(
      t.mutation(
        internal.raceNewsMigrations.addItaly2026BrowningWriteUpPhoto,
        {},
      ),
    ).rejects.toThrow('browning-williams-fp1');
  });

  it('fails loudly when the race is missing', async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.mutation(
        internal.raceNewsMigrations.addItaly2026BrowningWriteUpPhoto,
        {},
      ),
    ).rejects.toThrow('italy-2026');
  });
});

describe('publishItaly2026MonzaFp1Seats', () => {
  it('publishes both FP1 seats idempotently and badges the race driver', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const now = 100;
      await ctx.db.insert('races', {
        season: 2026,
        round: 13,
        name: 'Italian Grand Prix',
        slug: 'italy-2026',
        raceStartAt: 2_000,
        predictionLockAt: 1_900,
        status: 'upcoming',
        createdAt: now,
        updatedAt: now,
      });
      for (const driver of [
        ['PER', 'Sergio Perez', 'Cadillac'],
        ['GAS', 'Pierre Gasly', 'Alpine'],
      ] as const) {
        await ctx.db.insert('drivers', {
          code: driver[0],
          displayName: driver[1],
          team: driver[2],
          createdAt: now,
          updatedAt: now,
        });
      }
    });

    // Twice, because this runs on every deploy.
    await t.mutation(
      internal.raceNewsMigrations.publishItaly2026MonzaFp1Seats,
      {},
    );
    await t.mutation(
      internal.raceNewsMigrations.publishItaly2026MonzaFp1Seats,
      {},
    );

    const news = await t.run(async (ctx) => {
      const race = await ctx.db
        .query('races')
        .withIndex('by_slug', (q) => q.eq('slug', 'italy-2026'))
        .unique();
      if (!race) {
        throw new Error('missing italy-2026 race');
      }
      return await ctx.db
        .query('raceNews')
        .withIndex('by_race', (q) => q.eq('raceId', race._id))
        .collect();
    });

    expect(news).toHaveLength(2);
    expect(news).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'herta-cadillac-fp1',
          headline: 'Herta drives Perez’s Cadillac in FP1',
          body: HERTA_MONZA_FP1_BODY,
          // Perez, not Herta: Herta cannot be picked.
          driverCodes: ['PER'],
          affectsSessions: ['quali', 'race'],
        }),
        expect.objectContaining({
          key: 'aron-alpine-fp1',
          headline: 'Aron drives Gasly’s Alpine in FP1',
          body: ARON_MONZA_FP1_BODY,
          driverCodes: ['GAS'],
          affectsSessions: ['quali', 'race'],
        }),
      ]),
    );
  });

  it('leaves the other Monza items alone', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const now = 100;
      await ctx.db.insert('races', {
        season: 2026,
        round: 13,
        name: 'Italian Grand Prix',
        slug: 'italy-2026',
        raceStartAt: 2_000,
        predictionLockAt: 1_900,
        status: 'upcoming',
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert('drivers', {
        code: 'PER',
        displayName: 'Sergio Perez',
        team: 'Cadillac',
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert('drivers', {
        code: 'GAS',
        displayName: 'Pierre Gasly',
        team: 'Alpine',
        createdAt: now,
        updatedAt: now,
      });
    });

    // The claim this migration was written on: a deploy replays it without
    // touching a row published by hand under a different key.
    await t.mutation(internal.raceNews.publish, {
      raceSlug: 'italy-2026',
      key: 'published-by-hand',
      headline: BROWNING_HEADLINE,
      body: BROWNING_BODY,
      affectsSessions: ['race'],
      sourceName: 'Williams',
      sourceUrl: 'https://www.williamsf1.com/example',
    });

    await t.mutation(
      internal.raceNewsMigrations.publishItaly2026MonzaFp1Seats,
      {},
    );

    const untouched = await t.run(async (ctx) => {
      const race = await ctx.db
        .query('races')
        .withIndex('by_slug', (q) => q.eq('slug', 'italy-2026'))
        .unique();
      if (!race) {
        throw new Error('missing italy-2026 race');
      }
      return await ctx.db
        .query('raceNews')
        .withIndex('by_race_key', (q) =>
          q.eq('raceId', race._id).eq('key', 'published-by-hand'),
        )
        .unique();
    });

    expect(untouched).toMatchObject({
      headline: BROWNING_HEADLINE,
      body: BROWNING_BODY,
      active: true,
    });
  });
});
