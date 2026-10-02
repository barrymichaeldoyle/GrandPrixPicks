/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api, internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

const item = {
  raceSlug: 'bahrain-2026',
  key: 'colapinto-sepang-grid-penalty',
  headline: 'Colapinto takes a five-place grid penalty at Sepang',
  body: 'For the Baku restart collision.',
  affectsSessions: ['race' as const],
  sourceName: 'Example',
  sourceUrl: 'https://example.com/colapinto',
};

async function listed(t: ReturnType<typeof convexTest>) {
  const { items } = await t.query(api.raceNews.list, {
    raceSlug: 'bahrain-2026',
  });
  return items[0];
}

describe('raceNews.publish headlineUpdatedAt', () => {
  it('moves only when a republish changes the headline', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert('races', {
        season: 2026,
        round: 16,
        name: 'Bahrain Grand Prix',
        slug: 'bahrain-2026',
        raceStartAt: 2_000,
        predictionLockAt: 1_900,
        status: 'upcoming',
        createdAt: 100,
        updatedAt: 100,
      });
    });

    await t.mutation(internal.raceNews.publish, item);
    expect((await listed(t))?.headlineUpdatedAt).toBeUndefined();

    // A body correction is not new news.
    await t.mutation(internal.raceNews.publish, {
      ...item,
      body: 'For the Baku restart collision with Gasly and Norris.',
    });
    expect((await listed(t))?.headlineUpdatedAt).toBeUndefined();

    // The story moved on.
    await t.mutation(internal.raceNews.publish, {
      ...item,
      headline: 'Colapinto drops 15 places on the Sepang grid',
    });
    const updated = await listed(t);
    expect(updated?.headlineUpdatedAt).toBeGreaterThanOrEqual(
      updated?.publishedAt ?? Infinity,
    );
  });
});
