/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import rateLimiter from '@convex-dev/rate-limiter/test';
import { describe, expect, it } from 'vitest';
import { internal } from './_generated/api';
import schema from './schema';
const modules = import.meta.glob('./**/*.ts');
async function setup() {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  const raceId = await t.run(async (ctx) => {
    const now = Date.now();
    const id = await ctx.db.insert('races', {
      season: 2026,
      round: 1,
      name: 'Test',
      slug: 'test-2026',
      status: 'upcoming',
      raceStartAt: now + 172800000,
      predictionLockAt: now + 172800000,
      createdAt: now,
      updatedAt: now,
    });
    for (const enabled of [undefined, false, true]) {
      const userId = await ctx.db.insert('users', {
        clerkUserId: `u${enabled}`,
        pushNews: enabled,
        timezone: 'UTC',
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.insert('expoPushTokens', {
        userId,
        token: `ExponentPushToken[${enabled}]`,
        createdAt: now,
      });
    }
    return id;
  });
  await t.mutation(internal.raceNews.publish, {
    raceSlug: 'test-2026',
    key: 'driver-change',
    headline: 'Driver change',
    body: 'A replacement driver joins the grid.',
    affectsSessions: ['race'],
    sourceName: 'Team',
    sourceUrl: 'https://example.com/news',
  });
  const news = (await t.run((ctx) => ctx.db.query('raceNews').collect()))[0];
  return { t, raceId, news };
}
describe('editorial news push', () => {
  it('never pushes automatically and previews selection by default', async () => {
    const { t, news } = await setup();
    expect(
      await t.run((ctx) => ctx.db.query('notificationDeliveries').collect()),
    ).toHaveLength(0);
    const preview = await t.mutation(internal.newsNotifications.select, {
      raceSlug: 'test-2026',
      key: news.key,
      storyKey: 'driver-change',
      spoilerFree: true,
    });
    expect(preview.queued).toBe(false);
    expect(preview.url).toContain('/feed/');
    expect(
      await t.run((ctx) => ctx.db.query('notificationCampaigns').collect()),
    ).toHaveLength(0);
  });
  it('honors opt-in, story deduplication and the daily limit', async () => {
    const { t, news } = await setup();
    const args = {
      raceSlug: 'test-2026',
      key: news.key,
      storyKey: 'driver-change',
      spoilerFree: true as const,
      preview: false,
    };
    expect(
      (await t.mutation(internal.newsNotifications.select, args)).queued,
    ).toBe(true);
    expect(
      (await t.mutation(internal.newsNotifications.select, args)).queued,
    ).toBe(false);
    await t.mutation(internal.newsNotifications.fanout, {
      newsId: news._id,
      storyKey: args.storyKey,
      expiresAt: Date.now() + 86400000,
    });
    const rows = await t.run((ctx) =>
      ctx.db.query('notificationDeliveries').collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].category).toBe('news');
    await t.mutation(internal.newsNotifications.select, {
      ...args,
      storyKey: 'another-story',
    });
    await t.mutation(internal.newsNotifications.fanout, {
      newsId: news._id,
      storyKey: 'another-story',
      expiresAt: Date.now() + 86400000,
    });
    expect(
      await t.run((ctx) => ctx.db.query('notificationDeliveries').collect()),
    ).toHaveLength(1);
  });
  it('rejects retracted or embargoed items and cancels already queued news', async () => {
    const { t, news } = await setup();
    await t.run((ctx) =>
      ctx.db.patch(news._id, { feedVisibleAt: Date.now() + 3600000 }),
    );
    await expect(
      t.mutation(internal.newsNotifications.select, {
        raceSlug: 'test-2026',
        key: news.key,
        storyKey: 'driver-change',
        spoilerFree: true,
        preview: false,
      }),
    ).rejects.toThrow('released');
    await t.run((ctx) => ctx.db.patch(news._id, { feedVisibleAt: undefined }));
    await t.mutation(internal.newsNotifications.select, {
      raceSlug: 'test-2026',
      key: news.key,
      storyKey: 'driver-change',
      spoilerFree: true,
      preview: false,
    });
    await t.mutation(internal.newsNotifications.fanout, {
      newsId: news._id,
      storyKey: 'driver-change',
      expiresAt: Date.now() + 86400000,
    });
    const [row] = await t.run((ctx) =>
      ctx.db.query('notificationDeliveries').collect(),
    );
    await t.mutation(internal.newsNotifications.cancel, {
      storyKey: 'driver-change',
    });
    await t.run((ctx) => ctx.db.patch(row._id, { status: 'sending' }));
    expect(
      await t.mutation(internal.notificationDelivery.prepare, {
        deliveryId: row._id,
      }),
    ).toBeNull();
  });
});
