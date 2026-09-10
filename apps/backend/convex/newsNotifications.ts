import { v } from 'convex/values';
import { RateLimiter } from '@convex-dev/rate-limiter';
import { components, internal } from './_generated/api';
import { internalMutation } from './_generated/server';
import { dispatchPushTargets, getExpoTokensForUser } from './push';
import { wantsPushNews } from './lib/notificationChannels';
const limiter = new RateLimiter(components.rateLimiter, {
  news: { kind: 'token bucket', rate: 1, period: 86400000, capacity: 1 },
});
/** Editorial selection is separate from publication. Reuse storyKey across
 * articles covering the same story. Preview first; exclude result spoilers. */
export const select = internalMutation({
  args: {
    raceSlug: v.string(),
    key: v.string(),
    storyKey: v.string(),
    spoilerFree: v.literal(true),
    preview: v.optional(v.boolean()),
  },
  returns: v.object({
    queued: v.boolean(),
    title: v.string(),
    url: v.string(),
  }),
  handler: async (ctx, args) => {
    if (!/^[a-z0-9][a-z0-9-]{2,100}$/.test(args.storyKey)) {
      throw new Error('Use a stable story slug.');
    }
    const race = await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', args.raceSlug))
      .unique();
    if (!race) {
      throw new Error('Race not found.');
    }
    const item = await ctx.db
      .query('raceNews')
      .withIndex('by_race_key', (q) =>
        q.eq('raceId', race._id).eq('key', args.key),
      )
      .unique();
    if (
      !item?.active ||
      (item.feedVisibleAt !== undefined && item.feedVisibleAt > Date.now())
    ) {
      throw new Error('News must be active and released to the feed.');
    }
    const feed = await ctx.db
      .query('feedEvents')
      .withIndex('by_race_news_key', (q) =>
        q.eq('raceId', item.raceId).eq('newsKey', item.key),
      )
      .unique();
    if (!feed) {
      throw new Error('News must be visible in the feed.');
    }
    const key = `news:${args.storyKey}`;
    const existing = await ctx.db
      .query('notificationCampaigns')
      .withIndex('by_key', (q) => q.eq('key', key))
      .unique();
    const url = `/feed/${feed._id}?utm_source=push&utm_campaign=news`;
    if (args.preview !== false || existing) {
      return { queued: false, title: item.headline, url };
    }
    await ctx.db.insert('notificationCampaigns', {
      key,
      cancelled: false,
      createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(0, internal.newsNotifications.fanout, {
      newsId: item._id,
      storyKey: args.storyKey,
      expiresAt: Date.now() + 86400000,
    });
    return { queued: true, title: item.headline, url };
  },
});
export const fanout = internalMutation({
  args: {
    newsId: v.id('raceNews'),
    storyKey: v.string(),
    expiresAt: v.number(),
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const item = await ctx.db.get(args.newsId);
    if (!item?.active || args.expiresAt <= Date.now()) {
      return null;
    }
    const campaign = await ctx.db
      .query('notificationCampaigns')
      .withIndex('by_key', (q) => q.eq('key', `news:${args.storyKey}`))
      .unique();
    if (!campaign || campaign.cancelled) {
      return null;
    }
    const feed = await ctx.db
      .query('feedEvents')
      .withIndex('by_race_news_key', (q) =>
        q.eq('raceId', item.raceId).eq('newsKey', item.key),
      )
      .unique();
    if (!feed) {
      return null;
    }
    const page = await ctx.db
      .query('users')
      .paginate({ cursor: args.cursor ?? null, numItems: 100 });
    for (const user of page.page) {
      if (!wantsPushNews(user) || user.deletingAt) {
        continue;
      }
      const subscriptions = await ctx.db
        .query('pushSubscriptions')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .take(20);
      const tokens = await getExpoTokensForUser(ctx, user._id);
      if (!subscriptions.length && !tokens.length) {
        continue;
      }
      const quota = await limiter.limit(ctx, 'news', { key: String(user._id) });
      if (!quota.ok) {
        continue;
      }
      await dispatchPushTargets(
        ctx,
        {
          subscriptions: subscriptions.map((s) => ({
            endpoint: s.endpoint,
            p256dh: s.p256dh,
            auth: s.auth,
          })),
          tokens,
        },
        {
          title: item.headline,
          body: item.sourceName,
          url: `/feed/${feed._id}?utm_source=push&utm_campaign=news`,
          eventKey: `news:${args.storyKey}`,
          category: 'news',
          expiresAt: args.expiresAt,
          raceId: item.raceId,
        },
      );
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.newsNotifications.fanout, {
        ...args,
        cursor: page.continueCursor,
      });
    }
    return null;
  },
});
export const cancel = internalMutation({
  args: { storyKey: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const campaign = await ctx.db
      .query('notificationCampaigns')
      .withIndex('by_key', (q) => q.eq('key', `news:${args.storyKey}`))
      .unique();
    if (campaign) {
      await ctx.db.patch(campaign._id, { cancelled: true });
    }
    return null;
  },
});
