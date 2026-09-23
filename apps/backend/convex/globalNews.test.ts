/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import rateLimiter from '@convex-dev/rate-limiter/test';
import { describe, expect, it } from 'vitest';
import { api, internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

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
    const first = await t.run((ctx) => ctx.db.get(id));
    expect(first).toBeTruthy();
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
    await t.mutation(internal.globalNews.retract, { key: input.key });
    expect(
      await t.run((ctx) => ctx.db.query('feedEvents').collect()),
    ).toHaveLength(0);
    await t.run((ctx) =>
      ctx.db.patch(deliveries[0]._id, { status: 'sending' }),
    );
    expect(
      await t.mutation(internal.notificationDelivery.prepare, {
        deliveryId: deliveries[0]._id,
      }),
    ).toBeNull();
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
});
