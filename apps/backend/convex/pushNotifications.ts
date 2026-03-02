'use node';

import { v } from 'convex/values';
import webPush from 'web-push';

import { internal } from './_generated/api';
import { internalAction } from './_generated/server';

function getVapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject =
    process.env.VAPID_SUBJECT ?? 'mailto:hello@grandprixpicks.com';

  if (!publicKey || !privateKey) {
    throw new Error('VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY must be set');
  }

  return { publicKey, privateKey, subject };
}

/**
 * Internal action: send a push notification to a batch of subscriptions.
 * Removes stale subscriptions on 410 responses.
 */
export const sendPushBatch = internalAction({
  args: {
    subscriptions: v.array(
      v.object({
        endpoint: v.string(),
        p256dh: v.string(),
        auth: v.string(),
      }),
    ),
    title: v.string(),
    body: v.string(),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const { publicKey, privateKey, subject } = getVapidConfig();

    webPush.setVapidDetails(subject, publicKey, privateKey);

    const payload = JSON.stringify({
      title: args.title,
      body: args.body,
      url: args.url,
    });

    const results = await Promise.allSettled(
      args.subscriptions.map(async (sub) => {
        try {
          await webPush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            payload,
          );
        } catch (err: unknown) {
          const statusCode = (err as { statusCode?: number }).statusCode;
          if (statusCode === 410 || statusCode === 404) {
            // Subscription expired — remove it
            await ctx.runMutation(internal.push.deleteStaleSubscription, {
              endpoint: sub.endpoint,
            });
          }
          // Don't rethrow — one failed push shouldn't abort the rest
        }
      }),
    );

    const failed = results.filter((r) => r.status === 'rejected').length;
    return { sent: args.subscriptions.length - failed, failed };
  },
});
