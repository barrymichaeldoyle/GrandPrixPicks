/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { internal } from './_generated/api';
import {
  ARON_ALPINE_FP1_BODY,
  ARON_ALPINE_FP1_HEADLINE,
} from './lib/italy2026MonzaNewsCopy';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

describe('publishItaly2026AronAlpineFp1', () => {
  it('publishes the Aron FP1 news item idempotently', async () => {
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
      await ctx.db.insert('drivers', {
        code: 'GAS',
        displayName: 'Pierre Gasly',
        team: 'Alpine',
        number: 10,
        nationality: 'FR',
        createdAt: 100,
        updatedAt: 100,
      });
    });

    const first = await t.mutation(
      internal.raceNewsMigrations.publishItaly2026AronAlpineFp1,
      {},
    );
    expect(first.aron).toMatchObject({ action: 'created' });

    const second = await t.mutation(
      internal.raceNewsMigrations.publishItaly2026AronAlpineFp1,
      {},
    );
    expect(second.aron).toMatchObject({ action: 'updated' });

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
          q.eq('raceId', race._id).eq('key', 'aron-alpine-fp1'),
        )
        .unique();
    });

    expect(row).toMatchObject({
      headline: ARON_ALPINE_FP1_HEADLINE,
      body: ARON_ALPINE_FP1_BODY,
      affectsSessions: ['quali'],
      driverCodes: ['GAS'],
      sourceName: 'Formula 1',
      active: true,
    });
  });
});
