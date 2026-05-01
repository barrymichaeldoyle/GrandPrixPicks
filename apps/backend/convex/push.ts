import { SESSION_LABELS_FULL } from '@grandprixpicks/shared/sessions';
import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { internalMutation, internalQuery, mutation } from './_generated/server';
import { getViewer, requireViewer } from './lib/auth';
import {
  wantsPushPredictionReminders,
  wantsPushResults,
  wantsPushRevReceived,
  wantsPushSessionLocked,
} from './lib/notificationChannels';

const sessionTypeValidator = v.union(
  v.literal('quali'),
  v.literal('sprint_quali'),
  v.literal('sprint'),
  v.literal('race'),
);

type PushSubscriptionPayload = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

async function getSubscriptionsForUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>,
): Promise<Array<PushSubscriptionPayload>> {
  const subscriptions: Array<PushSubscriptionPayload> = [];
  for await (const sub of ctx.db
    .query('pushSubscriptions')
    .withIndex('by_user', (q) => q.eq('userId', userId))) {
    subscriptions.push({
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
    });
  }
  return subscriptions;
}

async function getSubscriptionsByUser(
  ctx: MutationCtx,
): Promise<Map<Id<'users'>, Array<PushSubscriptionPayload>>> {
  const subscriptionsByUser = new Map<Id<'users'>, Array<PushSubscriptionPayload>>();
  for await (const sub of ctx.db.query('pushSubscriptions')) {
    const existing = subscriptionsByUser.get(sub.userId) ?? [];
    existing.push({
      endpoint: sub.endpoint,
      p256dh: sub.p256dh,
      auth: sub.auth,
    });
    subscriptionsByUser.set(sub.userId, existing);
  }
  return subscriptionsByUser;
}

export const saveSubscription = mutation({
  args: {
    endpoint: v.string(),
    p256dh: v.string(),
    auth: v.string(),
  },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getViewer(ctx));

    // Upsert by endpoint — one row per device
    const existing = await ctx.db
      .query('pushSubscriptions')
      .withIndex('by_endpoint', (q) => q.eq('endpoint', args.endpoint))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        p256dh: args.p256dh,
        auth: args.auth,
      });
    } else {
      await ctx.db.insert('pushSubscriptions', {
        userId: viewer._id,
        endpoint: args.endpoint,
        p256dh: args.p256dh,
        auth: args.auth,
        createdAt: Date.now(),
      });
    }
  },
});

export const deleteSubscription = mutation({
  args: {
    endpoint: v.string(),
  },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getViewer(ctx));

    const existing = await ctx.db
      .query('pushSubscriptions')
      .withIndex('by_endpoint', (q) => q.eq('endpoint', args.endpoint))
      .unique();

    if (existing && existing.userId === viewer._id) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const saveExpoPushToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getViewer(ctx));

    const existing = await ctx.db
      .query('expoPushTokens')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .unique();

    if (!existing) {
      await ctx.db.insert('expoPushTokens', {
        userId: viewer._id,
        token: args.token,
        createdAt: Date.now(),
      });
    }
  },
});

export const deleteExpoPushToken = mutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getViewer(ctx));

    const existing = await ctx.db
      .query('expoPushTokens')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .unique();

    if (existing && existing.userId === viewer._id) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const getSubscriptionsForUsers = internalQuery({
  args: {
    userIds: v.array(v.id('users')),
  },
  handler: async (ctx, args) => {
    const results: Array<{
      userId: Id<'users'>;
      endpoint: string;
      p256dh: string;
      auth: string;
    }> = [];

    for (const userId of args.userIds) {
      const subs = await getSubscriptionsForUser(ctx, userId);
      for (const sub of subs) {
        results.push({
          userId,
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
        });
      }
    }

    return results;
  },
});

/**
 * Internal mutation: finds subscribed users (optionally filtering to those
 * without predictions), then fans out sendPushBatch.
 */
export const sendPushRemindersForRace = internalMutation({
  args: {
    raceId: v.id('races'),
    filterUnpredicted: v.boolean(),
  },
  handler: async (ctx, args) => {
    const race = await ctx.db.get(args.raceId);
    if (!race || race.status !== 'upcoming') {
      return { skipped: true, reason: 'Race not upcoming' };
    }

    const subscriptionsByUser = await getSubscriptionsByUser(ctx);
    if (subscriptionsByUser.size === 0) {
      return { skipped: true, reason: 'No push subscriptions' };
    }

    const subscribedUserIds = [...subscriptionsByUser.keys()];
    const subscribedUsers = await Promise.all(
      subscribedUserIds.map((userId) => ctx.db.get(userId)),
    );
    const usersWithReminderPushEnabled = new Set(
      subscribedUsers
        .filter((u) => u && wantsPushPredictionReminders(u))
        .map((u) => u!._id as string),
    );

    let targetUserIds: Set<string>;

    if (args.filterUnpredicted) {
      const usersWithPredictions = new Set<string>();
      for await (const prediction of ctx.db
        .query('predictions')
        .withIndex('by_race_session', (q) => q.eq('raceId', args.raceId))) {
        usersWithPredictions.add(prediction.userId as string);
      }
      const allSubUserIds = new Set(
        subscribedUserIds
          .map((id) => id as string)
          .filter((id) => usersWithReminderPushEnabled.has(id)),
      );
      targetUserIds = new Set(
        [...allSubUserIds].filter((id) => !usersWithPredictions.has(id)),
      );
    } else {
      targetUserIds = new Set(
        subscribedUserIds
          .map((id) => id as string)
          .filter((id) => usersWithReminderPushEnabled.has(id)),
      );
    }

    if (targetUserIds.size === 0) {
      return { skipped: true, reason: 'No target users' };
    }

    const title = args.filterUnpredicted
      ? `⏰ ${race.name}`
      : `🏎️ ${race.name}`;
    const body = args.filterUnpredicted
      ? `Picks close in 2 hours — you haven't made your predictions yet!`
      : `Picks open — you have 24 hours to make your predictions`;
    const utmCampaign = args.filterUnpredicted
      ? 'last_chance'
      : 'prediction_reminder';
    const url = `/races/${race.slug}?utm_source=push&utm_medium=push&utm_campaign=${utmCampaign}`;

    const subscriptionsToNotify = [...subscriptionsByUser.entries()]
      .filter(([userId]) => targetUserIds.has(userId as string))
      .flatMap(([, subscriptions]) => subscriptions);

    const BATCH_SIZE = 100;
    for (let i = 0; i < subscriptionsToNotify.length; i += BATCH_SIZE) {
      await ctx.scheduler.runAfter(
        0,
        internal.pushNotifications.sendPushBatch,
        {
          subscriptions: subscriptionsToNotify.slice(i, i + BATCH_SIZE),
          title,
          body,
          url,
        },
      );
    }

    return { queued: subscriptionsToNotify.length };
  },
});

/**
 * Internal mutation: fans out push notifications to all subscribed users
 * when session results are published.
 */
export const sendPushResultsForSession = internalMutation({
  args: {
    raceId: v.id('races'),
    sessionType: sessionTypeValidator,
  },
  handler: async (ctx, args) => {
    const race = await ctx.db.get(args.raceId);
    if (!race) {
      return { skipped: true, reason: 'Race not found' };
    }

    const subscriptionsByUser = await getSubscriptionsByUser(ctx);
    if (subscriptionsByUser.size === 0) {
      return { skipped: true, reason: 'No push subscriptions' };
    }

    const subscribedUserIds = [...subscriptionsByUser.keys()];
    const subscribedUsers = await Promise.all(
      subscribedUserIds.map((userId) => ctx.db.get(userId)),
    );
    const usersWithResultPushEnabled = new Set(
      subscribedUsers
        .filter((u) => u && wantsPushResults(u))
        .map((u) => u!._id as string),
    );

    const sessionLabel = SESSION_LABELS_FULL[args.sessionType];
    const title = `🏁 ${race.name} — ${sessionLabel} results`;
    const body = `Session results are in. See how you scored!`;
    const url = `/races/${race.slug}?utm_source=push&utm_medium=push&utm_campaign=results`;

    const subscriptions = [...subscriptionsByUser.entries()]
      .filter(([userId]) => usersWithResultPushEnabled.has(userId as string))
      .flatMap(([, userSubscriptions]) => userSubscriptions);

    if (subscriptions.length === 0) {
      return { skipped: true, reason: 'No eligible subscriptions' };
    }

    const BATCH_SIZE = 100;
    for (let i = 0; i < subscriptions.length; i += BATCH_SIZE) {
      await ctx.scheduler.runAfter(
        0,
        internal.pushNotifications.sendPushBatch,
        {
          subscriptions: subscriptions.slice(i, i + BATCH_SIZE),
          title,
          body,
          url,
        },
      );
    }

    return { queued: subscriptions.length };
  },
});

/**
 * Internal mutation: send push notifications to users whose session just locked.
 * Called from inAppNotifications.notifyUsersSessionLocked.
 */
export const sendPushForSessionLocked = internalMutation({
  args: {
    raceId: v.id('races'),
    sessionType: sessionTypeValidator,
    userIds: v.array(v.id('users')),
  },
  handler: async (ctx, args) => {
    const race = await ctx.db.get(args.raceId);
    if (!race) {
      return { skipped: true, reason: 'Race not found' };
    }

    const sessionLabel = SESSION_LABELS_FULL[args.sessionType];
    const subscriptions: Array<{
      endpoint: string;
      p256dh: string;
      auth: string;
    }> = [];

    for (const userId of args.userIds) {
      const user = await ctx.db.get(userId);
      if (!user || !wantsPushSessionLocked(user)) {
        continue;
      }
      const subs = await getSubscriptionsForUser(ctx, userId);
      for (const sub of subs) {
        subscriptions.push({
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
        });
      }
    }

    if (subscriptions.length === 0) {
      return { skipped: true, reason: 'No eligible subscriptions' };
    }

    const BATCH_SIZE = 100;
    for (let i = 0; i < subscriptions.length; i += BATCH_SIZE) {
      await ctx.scheduler.runAfter(
        0,
        internal.pushNotifications.sendPushBatch,
        {
          subscriptions: subscriptions.slice(i, i + BATCH_SIZE),
          title: `🔒 ${race.name} — ${sessionLabel}`,
          body: "See everyone's picks.",
          url: `/feed?utm_source=push&utm_medium=push&utm_campaign=session_locked`,
        },
      );
    }

    return { queued: subscriptions.length };
  },
});

/**
 * Internal mutation: send a push notification when someone revs a post.
 * Called from inAppNotifications.createRevNotification.
 */
export const sendPushForRevReceived = internalMutation({
  args: {
    recipientUserId: v.id('users'),
    actorDisplayName: v.optional(v.string()),
    feedEventId: v.id('feedEvents'),
  },
  handler: async (ctx, args) => {
    const recipient = await ctx.db.get(args.recipientUserId);
    if (!recipient || !wantsPushRevReceived(recipient)) {
      return { skipped: true, reason: 'User not found or push disabled' };
    }

    const subs = await getSubscriptionsForUser(ctx, args.recipientUserId);

    if (subs.length === 0) {
      return { skipped: true, reason: 'No subscriptions' };
    }

    const actorName = args.actorDisplayName ?? 'Someone';
    const url = `/feed/${args.feedEventId}?utm_source=push&utm_medium=push&utm_campaign=rev_received`;

    await ctx.scheduler.runAfter(0, internal.pushNotifications.sendPushBatch, {
      subscriptions: subs.map((s) => ({
        endpoint: s.endpoint,
        p256dh: s.p256dh,
        auth: s.auth,
      })),
      title: '⭐ New rev',
      body: `${actorName} reved your prediction`,
      url,
    });

    return { queued: subs.length };
  },
});

/** Internal: delete a stale subscription by endpoint (called after 410 response). */
export const deleteStaleSubscription = internalMutation({
  args: { endpoint: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('pushSubscriptions')
      .withIndex('by_endpoint', (q) => q.eq('endpoint', args.endpoint))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});
