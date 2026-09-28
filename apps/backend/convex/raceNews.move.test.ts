/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api, internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

const item = {
  raceSlug: 'bahrain-2026',
  key: 'piastri-baku-lockup',
  headline: 'Piastri lost a likely Baku podium',
  body: 'He locked up into Turn 1.',
  category: 'general' as const,
  affectsSessions: [],
  sourceName: 'Example',
  sourceUrl: 'https://example.com/piastri',
};

async function seedRaces(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert('races', {
      season: 2026,
      round: 15,
      name: 'Azerbaijan Grand Prix',
      slug: 'azerbaijan-2026',
      raceStartAt: 1_000,
      predictionLockAt: 900,
      status: 'finished',
      createdAt: 100,
      updatedAt: 100,
    });
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
}

async function newsEvents(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) =>
    (await ctx.db.query('feedEvents').collect()).filter(
      (event) => event.type === 'race_news',
    ),
  );
}

async function discordPostJobs(t: ReturnType<typeof convexTest>) {
  const jobs = await t.run(async (ctx) =>
    ctx.db.system.query('_scheduled_functions').collect(),
  );
  return jobs.filter((job) => job.name.includes('discord'));
}

const moveArgs = {
  fromRaceSlug: 'bahrain-2026',
  toRaceSlug: 'azerbaijan-2026',
  keys: ['piastri-baku-lockup'],
};

describe('raceNews.move', () => {
  it('moves the item and its feed card without posting again', async () => {
    const t = convexTest(schema, modules);
    await seedRaces(t);
    await t.mutation(internal.raceNews.publish, item);
    const [before] = await newsEvents(t);
    expect(await discordPostJobs(t)).toHaveLength(1);

    const result = await t.mutation(internal.raceNews.move, moveArgs);
    expect(result).toMatchObject({
      action: 'moved',
      items: [{ key: 'piastri-baku-lockup', active: true, feedEvent: true }],
    });

    const bahrain = await t.query(api.raceNews.list, {
      raceSlug: 'bahrain-2026',
    });
    const baku = await t.query(api.raceNews.list, {
      raceSlug: 'azerbaijan-2026',
    });
    expect(bahrain.items).toEqual([]);
    expect(baku.items).toMatchObject([{ key: 'piastri-baku-lockup' }]);

    const [after] = await newsEvents(t);
    // The same card, re-labelled, sorted into its own weekend, same time.
    expect(after._id).toBe(before._id);
    expect(after).toMatchObject({
      raceSlug: 'azerbaijan-2026',
      raceName: 'Azerbaijan Grand Prix',
      createdAt: before.createdAt,
    });
    expect(after.feedSort).toMatch(/^2026-15:/);
    expect(await discordPostJobs(t)).toHaveLength(1);
  });

  it('writes nothing on a dry run', async () => {
    const t = convexTest(schema, modules);
    await seedRaces(t);
    await t.mutation(internal.raceNews.publish, item);

    const result = await t.mutation(internal.raceNews.move, {
      ...moveArgs,
      dryRun: true,
    });
    expect(result.action).toBe('dry_run');
    const [event] = await newsEvents(t);
    expect(event.raceSlug).toBe('bahrain-2026');
  });

  it('moves a retracted item so the trail sits on the right race', async () => {
    const t = convexTest(schema, modules);
    await seedRaces(t);
    await t.mutation(internal.raceNews.publish, item);
    await t.mutation(internal.raceNews.retract, {
      raceSlug: 'bahrain-2026',
      key: item.key,
    });

    const result = await t.mutation(internal.raceNews.move, moveArgs);
    expect(result.items).toEqual([
      {
        key: item.key,
        headline: item.headline,
        active: false,
        feedEvent: false,
      },
    ]);
    const trail = await t.query(internal.raceNews.listForOperators, {
      raceSlug: 'azerbaijan-2026',
    });
    expect(trail.items).toMatchObject([{ key: item.key, active: false }]);
  });

  it('refuses the whole call when the target already has a key', async () => {
    const t = convexTest(schema, modules);
    await seedRaces(t);
    await t.mutation(internal.raceNews.publish, item);
    await t.mutation(internal.raceNews.publish, {
      ...item,
      key: 'second',
    });
    await t.mutation(internal.raceNews.publish, {
      ...item,
      raceSlug: 'azerbaijan-2026',
      key: 'second',
    });

    await expect(
      t.mutation(internal.raceNews.move, {
        ...moveArgs,
        keys: ['piastri-baku-lockup', 'second'],
      }),
    ).rejects.toThrow(/already has a news item with key "second"/);
    const bahrain = await t.query(api.raceNews.list, {
      raceSlug: 'bahrain-2026',
    });
    expect(bahrain.items).toHaveLength(2);
  });

  it('refuses a key the source race does not have', async () => {
    const t = convexTest(schema, modules);
    await seedRaces(t);
    await expect(t.mutation(internal.raceNews.move, moveArgs)).rejects.toThrow(
      /has no news item with key/,
    );
  });
});
