import { ConvexError, v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { getOrCreateViewer, getViewer, requireViewer } from './lib/auth';
import { newsApiPlanValidator } from './lib/newsApiValidators';
import { issueKey, planOf } from './newsApi';

/**
 * Self-serve news API keys: any signed-in account can create its own key on
 * the free plan, from `/f1-news-api/keys`. Contract: `docs/news-api.md`.
 *
 * A key made here is the same row `newsApi:createKey` makes, with `userId`
 * set, so the API, metering and the operator commands (`listKeys`,
 * `setKeyPlan`, `revokeKey`) treat it like any other. Paid plans are still
 * issued by the operator: `setKeyPlan` can move an account's key to one, and
 * `myKeys` then shows that plan.
 */

/** Active keys one account may hold at once. */
const MAX_ACTIVE_KEYS = 2;

const MAX_LABEL_LENGTH = 60;

/** Keys `myKeys` returns, newest first. Revoked ones are included. */
const LISTED_KEYS = 20;

/**
 * The viewer's keys, newest first, revoked ones included. Never a key or its
 * hash: only the prefix, which tells two keys apart.
 *
 * `usage` is the key's latest day of requests (`YYYY-MM-DD`, UTC) from
 * `newsApiUsage`, or null if it has served none. A query must not read the
 * clock, so the page compares `day` with today to show requests today.
 *
 * Signed out, or an account not yet created, gets an empty list.
 */
export const myKeys = query({
  args: {},
  returns: v.array(
    v.object({
      id: v.id('newsApiKeys'),
      label: v.string(),
      prefix: v.string(),
      plan: newsApiPlanValidator,
      createdAt: v.number(),
      revokedAt: v.union(v.number(), v.null()),
      usage: v.union(
        v.object({ day: v.string(), requests: v.number() }),
        v.null(),
      ),
    }),
  ),
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return [];
    }
    const rows = await ctx.db
      .query('newsApiKeys')
      .withIndex('by_userId', (q) => q.eq('userId', viewer._id))
      .order('desc')
      .take(LISTED_KEYS);
    const keys = [];
    for (const row of rows) {
      const latest = await ctx.db
        .query('newsApiUsage')
        .withIndex('by_key_day', (q) => q.eq('keyId', row._id))
        .order('desc')
        .first();
      keys.push({
        id: row._id,
        label: row.label,
        prefix: row.prefix,
        plan: planOf(row),
        createdAt: row.createdAt,
        revokedAt: row.revokedAt ?? null,
        usage: latest ? { day: latest.day, requests: latest.requests } : null,
      });
    }
    return keys;
  },
});

/**
 * Create a free key for the viewer. The key is in the return value and
 * nowhere else: only its hash is stored, exactly as `newsApi:createKey`
 * stores it.
 */
export const createMyKey = mutation({
  args: { label: v.string() },
  returns: v.object({
    id: v.id('newsApiKeys'),
    key: v.string(),
    label: v.string(),
    prefix: v.string(),
    plan: newsApiPlanValidator,
  }),
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));
    const label = args.label.trim();
    if (label.length < 1 || label.length > MAX_LABEL_LENGTH) {
      throw new ConvexError(
        `Give the key a name of 1 to ${MAX_LABEL_LENGTH} characters.`,
      );
    }
    let active = 0;
    for await (const row of ctx.db
      .query('newsApiKeys')
      .withIndex('by_userId', (q) => q.eq('userId', viewer._id))) {
      if (row.revokedAt === undefined) {
        active += 1;
      }
    }
    if (active >= MAX_ACTIVE_KEYS) {
      throw new ConvexError(
        `You have ${MAX_ACTIVE_KEYS} active keys. Revoke one to create another.`,
      );
    }
    const { id, key, prefix } = await issueKey(ctx, {
      label,
      plan: 'free',
      userId: viewer._id,
    });
    return { id, key, label, prefix, plan: 'free' as const };
  },
});

/**
 * Revoke one of the viewer's keys. It stops working on its next request and
 * cannot be restored. Someone else's key answers as if it did not exist.
 */
export const revokeMyKey = mutation({
  args: { id: v.id('newsApiKeys') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getViewer(ctx));
    const row = await ctx.db.get(args.id);
    if (!row || row.userId !== viewer._id) {
      throw new ConvexError('No key with that id.');
    }
    if (row.revokedAt === undefined) {
      await ctx.db.patch(row._id, { revokedAt: Date.now() });
    }
    return null;
  },
});
