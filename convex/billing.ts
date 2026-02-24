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
    paddleEventId: v.optional(v.string()),
    paddleNotificationId: v.optional(v.string()),
    paddleCheckoutId: v.optional(v.string()),
    paddleProductId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.webhookKey !== process.env.PADDLE_CONVEX_WEBHOOK_KEY) {
      throw new Error('Unauthorized webhook caller');
    }

    if (args.paddleEventId) {
      const existingEvent = await ctx.db
        .query('processedPaddleWebhookEvents')
        .withIndex('by_eventId', (q) => q.eq('eventId', args.paddleEventId!))
        .unique();

      if (existingEvent) {
        return {
          granted: existingEvent.status === 'processed',
          created: false,
          duplicate: true,
          reason:
            existingEvent.status === 'ignored_user_not_found'
              ? ('user_not_found' as const)
              : undefined,
        };
      }
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', args.clerkUserId))
      .unique();

    if (!user) {
      if (args.paddleEventId) {
        await ctx.db.insert('processedPaddleWebhookEvents', {
          eventId: args.paddleEventId,
          eventType: 'transaction.completed',
          notificationId: args.paddleNotificationId,
          checkoutId: args.paddleCheckoutId,
          clerkUserId: args.clerkUserId,
          season: args.season,
          status: 'ignored_user_not_found',
          createdAt: Date.now(),
        });
      }
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

      if (args.paddleEventId) {
        await ctx.db.insert('processedPaddleWebhookEvents', {
          eventId: args.paddleEventId,
          eventType: 'transaction.completed',
          notificationId: args.paddleNotificationId,
          checkoutId: args.paddleCheckoutId,
          clerkUserId: args.clerkUserId,
          season: args.season,
          status: 'processed',
          createdAt: Date.now(),
        });
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

    if (args.paddleEventId) {
      await ctx.db.insert('processedPaddleWebhookEvents', {
        eventId: args.paddleEventId,
        eventType: 'transaction.completed',
        notificationId: args.paddleNotificationId,
        checkoutId: args.paddleCheckoutId,
        clerkUserId: args.clerkUserId,
        season: args.season,
        status: 'processed',
        createdAt: Date.now(),
      });
    }

    return { granted: true, created: true };
  },
});
