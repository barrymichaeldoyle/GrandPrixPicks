import { v } from 'convex/values';
import { internalMutation, internalQuery } from './_generated/server';
import { safeHttpUrl } from './lib/newsRss';

/**
 * A read bound rather than an editorial one. Race-independent stories are rare,
 * but a read still has to be bounded, and fifty is far above any run of them the
 * site has ever carried.
 */
const MAX_GLOBAL_NEWS = 50;

const globalNewsListResultValidator = v.object({
  items: v.array(
    v.object({
      key: v.string(),
      headline: v.string(),
      body: v.string(),
      sourceName: v.string(),
      sourceUrl: v.string(),
      active: v.boolean(),
      publishedAt: v.number(),
      updatedAt: v.number(),
      sourcePublishedAt: v.optional(v.number()),
    }),
  ),
});

/**
 * Active and retracted race-independent news for the operator audit trail.
 *
 * The feed reads `feedEvents`, so nothing in the app reads this table. This is
 * the one way to list what the pipeline published and confirm it before a
 * `retract`, the same job `raceNews:listForOperators` does for weekend news.
 *
 * Run via:
 *   npx convex run --prod globalNews:listForOperators '{}'
 */
export const listForOperators = internalQuery({
  args: {},
  returns: globalNewsListResultValidator,
  handler: async (ctx) => {
    const rows = await ctx.db.query('globalNews').take(MAX_GLOBAL_NEWS);
    const items = rows
      .sort((a, b) => b.publishedAt - a.publishedAt)
      .map((row) => ({
        key: row.key,
        headline: row.headline,
        body: row.body,
        sourceName: row.sourceName,
        sourceUrl: row.sourceUrl,
        active: row.active,
        publishedAt: row.publishedAt,
        updatedAt: row.updatedAt,
        sourcePublishedAt: row.sourcePublishedAt,
      }));
    return { items };
  },
});

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
