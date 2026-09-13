import { v } from 'convex/values';
import { internalMutation } from './_generated/server';
import { safeHttpUrl } from './lib/newsRss';

/** Race-independent, reviewed news. Its feed card keeps arrival-time order on correction. */
export const publish = internalMutation({
  args: {
    key: v.string(),
    headline: v.string(),
    body: v.string(),
    sourceName: v.string(),
    sourceUrl: v.string(),
    sourcePublishedAt: v.optional(v.number()),
  },
  returns: v.id('globalNews'),
  handler: async (ctx, args) => {
    if (
      !/^[A-Za-z0-9-]{3,150}$/.test(args.key) ||
      !safeHttpUrl(args.sourceUrl) ||
      args.headline.length < 3 ||
      args.headline.length > 180 ||
      args.body.length < 10 ||
      args.body.length > 1000 ||
      /<[^>]*>|&lt;|&#\d+;/i.test(`${args.headline} ${args.body}`)
    ) {
      throw new Error('Invalid news.');
    }
    const now = Date.now();
    const existing = await ctx.db
      .query('globalNews')
      .withIndex('by_key', (q) => q.eq('key', args.key))
      .unique();
    const card = {
      type: 'race_news' as const,
      newsKey: args.key,
      newsCategory: 'general' as const,
      newsHeadline: args.headline,
      newsBody: args.body,
      newsAffectsSessions: [],
      newsSourceName: args.sourceName,
      newsSourceUrl: args.sourceUrl,
    };
    let feedEventId = existing?.feedEventId;
    const feed = feedEventId ? await ctx.db.get(feedEventId) : null;
    if (feed) {
      await ctx.db.patch(feed._id, card);
    } else {
      feedEventId = await ctx.db.insert('feedEvents', {
        ...card,
        createdAt: now,
      });
    }
    if (!feedEventId) {
      throw new Error('Feed event missing.');
    }
    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        feedEventId,
        active: true,
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert('globalNews', {
      ...args,
      feedEventId,
      active: true,
      publishedAt: now,
      updatedAt: now,
    });
  },
});

export const retract = internalMutation({
  args: { key: v.string() },
  returns: v.null(),
  handler: async (ctx, { key }) => {
    const row = await ctx.db
      .query('globalNews')
      .withIndex('by_key', (q) => q.eq('key', key))
      .unique();
    if (!row || !row.active) {
      return null;
    }
    const feed = await ctx.db.get(row.feedEventId);
    if (feed) {
      await ctx.db.delete(feed._id);
    }
    await ctx.db.patch(row._id, { active: false, updatedAt: Date.now() });
    return null;
  },
});
