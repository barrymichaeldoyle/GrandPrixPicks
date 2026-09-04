/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api, internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

describe('race news access boundary', () => {
  it('removes retracted news from the public API but preserves the operator audit trail', async () => {
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
      key: 'withdrawn-item',
      headline: 'Withdrawn headline',
      body: 'Withdrawn pick advice.',
      affectsSessions: ['race'],
      sourceName: 'Example',
      sourceUrl: 'https://example.com/withdrawn',
    });

    expect(
      (await t.query(api.raceNews.list, { raceSlug: 'italy-2026' })).items,
    ).toHaveLength(1);

    await t.mutation(internal.raceNews.retract, {
      raceSlug: 'italy-2026',
      key: 'withdrawn-item',
    });

    const publicResult = await t.query(api.raceNews.list, {
      raceSlug: 'italy-2026',
    });
    expect(publicResult.items).toEqual([]);

    const operatorResult = await t.query(internal.raceNews.listForOperators, {
      raceSlug: 'italy-2026',
    });
    expect(operatorResult.items).toMatchObject([
      { key: 'withdrawn-item', active: false },
    ]);
  });

  it('reads the operator audit trail by race id as well as by slug', async () => {
    const t = convexTest(schema, modules);
    const raceId = await t.run(async (ctx) => {
      return await ctx.db.insert('races', {
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
      key: 'grid-penalty',
      headline: 'A headline',
      body: 'Pick advice.',
      affectsSessions: ['race'],
      sourceName: 'Example',
      sourceUrl: 'https://example.com/penalty',
    });

    const byId = await t.query(internal.raceNews.listForOperators, { raceId });
    expect(byId.race).toMatchObject({ slug: 'italy-2026' });
    expect(byId.items).toMatchObject([{ key: 'grid-penalty' }]);
    expect(byId).toEqual(
      await t.query(internal.raceNews.listForOperators, {
        raceSlug: 'italy-2026',
      }),
    );
  });

  it('says which identifier to pass when the operator names no race', async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.query(internal.raceNews.listForOperators, {}),
    ).rejects.toThrow(/raceSlug/);
  });

  it('rejects the removed includeRetracted argument on the public query', async () => {
    const t = convexTest(schema, modules);

    await expect(
      t.query(api.raceNews.list, {
        raceSlug: 'italy-2026',
        includeRetracted: true,
      } as never),
    ).rejects.toThrow(/includeRetracted/);
  });
});
