/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { internal } from './_generated/api';
import { BROWNING_WILLIAMS_FP1_WRITEUP_IMAGE } from './lib/raceNewsWriteUpImage';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

const BROWNING_HEADLINE = 'Luke Browning replaces Alex Albon in FP1';
const BROWNING_BODY =
  'Albon races, so Friday morning is not a read on Williams pace.';

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
});
