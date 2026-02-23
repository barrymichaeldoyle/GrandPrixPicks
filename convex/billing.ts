import { v } from 'convex/values';

import { mutation } from './_generated/server';

/**
 * Idempotently grants a season pass for a Clerk user when Paddle confirms payment.
 */
export const grantSeasonPassFromPaddle = mutation({
  args: {
    clerkUserId: v.string(),
    season: v.number(),
    webhookKey: v.string(),
    paddleCheckoutId: v.optional(v.string()),
    paddleProductId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.webhookKey !== process.env.PADDLE_CONVEX_WEBHOOK_KEY) {
      throw new Error('Unauthorized webhook caller');
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', args.clerkUserId))
      .unique();

    if (!user) {
      return { granted: false, reason: 'user_not_found' as const };
    }

    const existingPass = await ctx.db
      .query('userSeasonPasses')
      .withIndex('by_user_season', (q) =>
        q.eq('userId', user._id).eq('season', args.season),
      )
      .unique();

    if (existingPass) {
      const patch: {
        paddleCheckoutId?: string;
        paddleProductId?: string;
      } = {};

      if (args.paddleCheckoutId && !existingPass.paddleCheckoutId) {
        patch.paddleCheckoutId = args.paddleCheckoutId;
      }
      if (args.paddleProductId && !existingPass.paddleProductId) {
        patch.paddleProductId = args.paddleProductId;
      }

      if (Object.keys(patch).length > 0) {
        await ctx.db.patch(existingPass._id, patch);
      }

      return { granted: true, created: false };
    }

    await ctx.db.insert('userSeasonPasses', {
      userId: user._id,
      season: args.season,
      paddleCheckoutId: args.paddleCheckoutId,
      paddleProductId: args.paddleProductId,
      createdAt: Date.now(),
    });

    return { granted: true, created: true };
  },
});
