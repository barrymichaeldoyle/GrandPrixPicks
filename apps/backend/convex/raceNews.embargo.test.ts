/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api, internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

const item = {
  raceSlug: 'madrid-2026',
  key: 'held-item',
  headline: 'Held headline',
  body: 'Held body.',
  affectsSessions: ['race'] as const,
  sourceName: 'Example',
  sourceUrl: 'https://example.com/held',
};

async function seedRace(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert('races', {
      season: 2026,
      round: 14,
      name: 'Spanish Grand Prix',
      slug: 'madrid-2026',
      raceStartAt: 2_000,
      predictionLockAt: 1_000,
      status: 'upcoming',
      createdAt: 100,
      updatedAt: 100,
    });
  });
}

async function feedNews(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) =>
    (await ctx.db.query('feedEvents').collect()).filter(
      (event) => event.type === 'race_news',
    ),
  );
}

describe('embargoed race news', () => {
  it('shows on the write-up page while the feed card waits', async () => {
    // The whole point of the field: a later round earns its SEO the day the
    // news breaks, without putting a Madrid story above the weekend someone is
    // actually picking.
    const t = convexTest(schema, modules);
    await seedRace(t);

    await t.mutation(internal.raceNews.publish, {
      ...item,
      affectsSessions: ['race'],
      feedVisibleAt: Date.now() + 60_000,
    });

    const published = await t.query(api.raceNews.list, {
      raceSlug: 'madrid-2026',
    });
    expect(published.items).toMatchObject([{ key: 'held-item' }]);
    expect(await feedNews(t)).toEqual([]);
  });

  it('releases the card, once, when the embargo lifts', async () => {
    const t = convexTest(schema, modules);
    await seedRace(t);
    await t.mutation(internal.raceNews.publish, {
      ...item,
      affectsSessions: ['race'],
      feedVisibleAt: Date.now() + 60_000,
    });

    const raceId = await t.run(async (ctx) => {
      const race = await ctx.db
        .query('races')
        .withIndex('by_slug', (q) => q.eq('slug', 'madrid-2026'))
        .unique();
      return race!._id;
    });

    expect(
      await t.mutation(internal.raceNews.releaseToFeed, {
        raceId,
        key: 'held-item',
      }),
    ).toMatchObject({ action: 'released' });
    expect(await feedNews(t)).toHaveLength(1);

    // Idempotent: a missed release run by hand after the scheduled one must not
    // post the story twice.
    expect(
      await t.mutation(internal.raceNews.releaseToFeed, {
        raceId,
        key: 'held-item',
      }),
    ).toMatchObject({ action: 'already_in_feed' });
    expect(await feedNews(t)).toHaveLength(1);
  });

  it('never releases an item retracted during its embargo', async () => {
    const t = convexTest(schema, modules);
    await seedRace(t);
    await t.mutation(internal.raceNews.publish, {
      ...item,
      affectsSessions: ['race'],
      feedVisibleAt: Date.now() + 60_000,
    });
    await t.mutation(internal.raceNews.retract, {
      raceSlug: 'madrid-2026',
      key: 'held-item',
    });

    const raceId = await t.run(async (ctx) => {
      const race = await ctx.db
        .query('races')
        .withIndex('by_slug', (q) => q.eq('slug', 'madrid-2026'))
        .unique();
      return race!._id;
    });

    expect(
      await t.mutation(internal.raceNews.releaseToFeed, {
        raceId,
        key: 'held-item',
      }),
    ).toMatchObject({ action: 'retracted' });
    expect(await feedNews(t)).toEqual([]);
  });

  it('posts to the feed immediately without an embargo, as it always has', async () => {
    const t = convexTest(schema, modules);
    await seedRace(t);
    await t.mutation(internal.raceNews.publish, {
      ...item,
      affectsSessions: ['race'],
    });
    expect(await feedNews(t)).toHaveLength(1);
  });

  it('leaves a card that is already out alone when an edit carries an embargo', async () => {
    // An embargo cannot un-publish: correcting a live item must not silently
    // pull it from the feed. `retract` is the way to take something back.
    const t = convexTest(schema, modules);
    await seedRace(t);
    await t.mutation(internal.raceNews.publish, {
      ...item,
      affectsSessions: ['race'],
    });
    await t.mutation(internal.raceNews.publish, {
      ...item,
      affectsSessions: ['race'],
      headline: 'Corrected headline',
      feedVisibleAt: Date.now() + 60_000,
    });

    const events = await feedNews(t);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ newsHeadline: 'Corrected headline' });
  });
});
