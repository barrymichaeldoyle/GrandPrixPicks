/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import rateLimiter from '@convex-dev/rate-limiter/test';
import { describe, expect, it } from 'vitest';
import { api, internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

async function discordPostJobs(t: ReturnType<typeof convexTest>) {
  const jobs = await t.run((ctx) =>
    ctx.db.system.query('_scheduled_functions').collect(),
  );
  return jobs.filter((job) => job.name.includes('discord'));
}

describe('race-independent news', () => {
  it('publishes, corrects, selects and retracts one global feed card', async () => {
    const t = convexTest(schema, modules);
    rateLimiter.register(t);
    const now = Date.now();
    await t.run(async (ctx) => {
      for (const preference of ['off', 'pick_related', 'all'] as const) {
        const userId = await ctx.db.insert('users', {
          clerkUserId: preference,
          newsPushPreference: preference,
          timezone: 'UTC',
          createdAt: now,
          updatedAt: now,
        });
        await ctx.db.insert('expoPushTokens', {
          userId,
          token: `ExponentPushToken[${preference}]`,
          createdAt: now,
        });
      }
    });
    const input = {
      key: 'general-story',
      headline: 'A Formula 1 announcement',
      body: 'The organizer announced a new initiative.',
      sourceName: 'Organizer',
      sourceUrl: 'https://example.com/story',
    };
    const id = await t.mutation(internal.globalNews.publish, input);
    if (typeof id !== 'string') {
      throw new Error('Expected a write, not a dry run.');
    }
    const first = await t.run((ctx) => ctx.db.get(id));
    expect(first).toBeTruthy();
    expect(await discordPostJobs(t)).toHaveLength(1);
    await t.mutation(internal.globalNews.publish, {
      ...input,
      headline: 'An updated announcement',
    });
    const events = await t.run((ctx) => ctx.db.query('feedEvents').collect());
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      newsCategory: 'general',
      newsAffectsSessions: [],
      newsHeadline: 'An updated announcement',
    });
    expect(events[0]._id).toBe(first?.feedEventId);
    // The correction patched the existing card, so it must not schedule a
    // second Discord post.
    expect(await discordPostJobs(t)).toHaveLength(1);
    const selection = await t.mutation(internal.newsNotifications.select, {
      key: input.key,
      storyKey: input.key,
      spoilerFree: true,
      preview: false,
    });
    expect(selection.queued).toBe(true);
    await t.mutation(internal.newsNotifications.fanout, {
      globalNewsId: id,
      storyKey: input.key,
      expiresAt: now + 86_400_000,
    });
    const deliveries = await t.run((ctx) =>
      ctx.db.query('notificationDeliveries').collect(),
    );
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].newsCategory).toBe('general');
    const listedActive = await t.query(
      internal.globalNews.listForOperators,
      {},
    );
    expect(listedActive.items).toHaveLength(1);
    expect(listedActive.items[0]).toMatchObject({
      key: input.key,
      headline: 'An updated announcement',
      active: true,
    });
    await t.mutation(internal.globalNews.retract, { key: input.key });
    expect(
      await t.run((ctx) => ctx.db.query('feedEvents').collect()),
    ).toHaveLength(0);
    const listedAfterRetract = await t.query(
      internal.globalNews.listForOperators,
      {},
    );
    expect(listedAfterRetract.items).toHaveLength(1);
    expect(listedAfterRetract.items[0].active).toBe(false);
    await t.run((ctx) =>
      ctx.db.patch(deliveries[0]._id, { status: 'sending' }),
    );
    expect(
      await t.mutation(internal.notificationDelivery.prepare, {
        deliveryId: deliveries[0]._id,
      }),
    ).toBeNull();
  });

  it('rehearses a publish with dryRun and writes nothing', async () => {
    const t = convexTest(schema, modules);
    rateLimiter.register(t);
    const input = {
      key: 'dry-run-story',
      headline: 'A Formula 1 announcement',
      body: 'The organizer announced a new initiative.',
      sourceName: 'Organizer',
      sourceUrl: 'https://example.com/story',
    };
    expect(
      await t.mutation(internal.globalNews.publish, {
        ...input,
        dryRun: true,
      }),
    ).toEqual({ dryRun: true, valid: true, action: 'created', key: input.key });
    expect(
      await t.mutation(internal.globalNews.publish, {
        ...input,
        headline: '<b>',
        dryRun: true,
      }),
    ).toMatchObject({ valid: false });
    expect(
      await t.run((ctx) => ctx.db.query('globalNews').collect()),
    ).toHaveLength(0);
    expect(
      await t.run((ctx) => ctx.db.query('feedEvents').collect()),
    ).toHaveLength(0);
    expect(await discordPostJobs(t)).toHaveLength(0);

    await t.mutation(internal.globalNews.publish, {
      ...input,
      team: 'Williams',
      dryRun: false,
    });
    const snapshot = await t.run(async (ctx) => ({
      rows: await ctx.db.query('globalNews').collect(),
      events: await ctx.db.query('feedEvents').collect(),
      jobs: await ctx.db.system.query('_scheduled_functions').collect(),
    }));
    expect(
      await t.mutation(internal.globalNews.publish, {
        ...input,
        headline: 'An updated announcement',
        dryRun: true,
      }),
    ).toMatchObject({ action: 'updated', team: 'Williams' });
    expect(
      await t.run(async (ctx) => ({
        rows: await ctx.db.query('globalNews').collect(),
        events: await ctx.db.query('feedEvents').collect(),
        jobs: await ctx.db.system.query('_scheduled_functions').collect(),
      })),
    ).toEqual(snapshot);
    const [row] = await t.run((ctx) => ctx.db.query('globalNews').collect());
    expect(row.headline).toBe(input.headline);
    expect(row).not.toHaveProperty('dryRun');

    await t.mutation(internal.globalNews.retract, { key: input.key });
    expect(
      await t.mutation(internal.globalNews.publish, {
        ...input,
        dryRun: true,
      }),
    ).toMatchObject({ valid: true, action: 'republished', team: 'Williams' });
    expect(
      await t.run((ctx) => ctx.db.query('feedEvents').collect()),
    ).toHaveLength(0);
    const [retracted] = await t.run((ctx) =>
      ctx.db.query('globalNews').collect(),
    );
    expect(retracted.active).toBe(false);
    expect(await discordPostJobs(t)).toHaveLength(1);
  });

  it.each([
    { key: 'invalid key' },
    { sourceUrl: 'javascript:alert(1)' },
    { headline: '<b>Announcement</b>' },
    { headline: 'x'.repeat(181) },
    { body: 'Too short' },
    { body: 'x'.repeat(1001) },
    { team: 'Unknown team' },
  ])('previews invalid news but refuses to publish it: %j', async (invalid) => {
    const t = convexTest(schema, modules);
    const input = {
      key: 'invalid-story',
      headline: 'A Formula 1 announcement',
      body: 'The organizer announced a new initiative.',
      sourceName: 'Organizer',
      sourceUrl: 'https://example.com/story',
      ...invalid,
    };
    expect(
      await t.mutation(internal.globalNews.publish, { ...input, dryRun: true }),
    ).toMatchObject({ dryRun: true, valid: false });
    await expect(
      t.mutation(internal.globalNews.publish, input),
    ).rejects.toThrow('Invalid news.');
    expect(await t.run((ctx) => ctx.db.query('globalNews').collect())).toEqual(
      [],
    );
    expect(await t.run((ctx) => ctx.db.query('feedEvents').collect())).toEqual(
      [],
    );
    expect(await discordPostJobs(t)).toHaveLength(0);
  });

  it('lists live news newest first, without retracted items', async () => {
    const t = convexTest(schema, modules);
    rateLimiter.register(t);
    for (const key of ['first-story', 'second-story', 'third-story']) {
      await t.mutation(internal.globalNews.publish, {
        key,
        headline: `Headline ${key}`,
        body: 'The organizer announced a new initiative.',
        sourceName: 'Organizer',
        sourceUrl: 'https://example.com/story',
      });
    }
    await t.mutation(internal.globalNews.retract, { key: 'second-story' });

    const items = await t.query(api.globalNews.listRecent, {});
    expect(items.map((item) => item.headline)).toEqual([
      'Headline third-story',
      'Headline first-story',
    ]);
    expect(await t.query(api.globalNews.listRecent, { limit: 1 })).toHaveLength(
      1,
    );
  });

  it('keeps a reviewed team colour on correction without duplicating the feed card', async () => {
    const t = convexTest(schema, modules);
    rateLimiter.register(t);
    const input = {
      key: 'williams-test',
      headline: 'Williams completes a test',
      body: 'The team completed a test session.',
      team: 'Williams',
      sourceName: 'Formula 1',
      sourceUrl: 'https://example.com/williams',
    };
    await expect(
      t.mutation(internal.globalNews.publish, {
        ...input,
        team: 'Unknown team',
      }),
    ).rejects.toThrow(/Invalid news/);

    await t.mutation(internal.globalNews.publish, input);
    await t.mutation(internal.globalNews.publish, {
      key: input.key,
      headline: 'Williams completes its test',
      body: input.body,
      sourceName: input.sourceName,
      sourceUrl: input.sourceUrl,
    });
    const records = await t.query(internal.globalNews.listForOperators, {});
    expect(records.items[0]).toMatchObject({
      key: input.key,
      team: 'Williams',
    });
    const events = await t.run((ctx) => ctx.db.query('feedEvents').collect());
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      newsHeadline: 'Williams completes its test',
      newsTeam: 'Williams',
    });
  });
});
