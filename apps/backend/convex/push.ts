import { SESSION_LABELS_FULL } from '@grandprixpicks/shared/sessions';
import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { internalMutation, internalQuery, mutation } from './_generated/server';
import { getViewer, requireViewer } from './lib/auth';
import {
  getPredictionReminderChannel,
  getResultsNotificationChannel,
  includesPush,
} from './lib/notificationChannels';

const sessionTypeValidator = v.union(
  v.literal('quali'),
  v.literal('sprint_quali'),
  v.literal('sprint'),
  v.literal('race'),
);

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
      const subs = await ctx.db
        .query('pushSubscriptions')
        .withIndex('by_user', (q) => q.eq('userId', userId))
        .collect();
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

    const allSubs = await ctx.db.query('pushSubscriptions').collect();
    if (allSubs.length === 0) {
      return { skipped: true, reason: 'No push subscriptions' };
    }

    const subscribedUserIds = [...new Set(allSubs.map((s) => s.userId))];
    const subscribedUsers = await Promise.all(
      subscribedUserIds.map((userId) => ctx.db.get(userId)),
    );
    const usersWithReminderPushEnabled = new Set(
      subscribedUsers
        .filter((u) => u && includesPush(getPredictionReminderChannel(u)))
        .map((u) => u!._id as string),
    );

    let targetUserIds: Set<string>;

    if (args.filterUnpredicted) {
      const predictions = await ctx.db
        .query('predictions')
        .withIndex('by_race_session', (q) => q.eq('raceId', args.raceId))
        .collect();
      const usersWithPredictions = new Set(
        predictions.map((p) => p.userId as string),
      );
      const allSubUserIds = new Set(
        allSubs
          .map((s) => s.userId as string)
          .filter((id) => usersWithReminderPushEnabled.has(id)),
      );
      targetUserIds = new Set(
        [...allSubUserIds].filter((id) => !usersWithPredictions.has(id)),
      );
    } else {
      targetUserIds = new Set(
        allSubs
          .map((s) => s.userId as string)
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

    const subscriptionsToNotify = allSubs
      .filter((s) => targetUserIds.has(s.userId as string))
      .map((s) => ({ endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth }));

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

    const allSubs = await ctx.db.query('pushSubscriptions').collect();
    if (allSubs.length === 0) {
      return { skipped: true, reason: 'No push subscriptions' };
    }

    const subscribedUserIds = [...new Set(allSubs.map((s) => s.userId))];
    const subscribedUsers = await Promise.all(
      subscribedUserIds.map((userId) => ctx.db.get(userId)),
    );
    const usersWithResultPushEnabled = new Set(
      subscribedUsers
        .filter((u) => u && includesPush(getResultsNotificationChannel(u)))
        .map((u) => u!._id as string),
    );

    const sessionLabel = SESSION_LABELS_FULL[args.sessionType];
    const title = `🏁 ${race.name} — ${sessionLabel} results`;
    const body = `Session results are in. See how you scored!`;
    const url = `/races/${race.slug}?utm_source=push&utm_medium=push&utm_campaign=results`;

    const subscriptions = allSubs
      .filter((s) => usersWithResultPushEnabled.has(s.userId as string))
      .map((s) => ({
        endpoint: s.endpoint,
        p256dh: s.p256dh,
        auth: s.auth,
      }));

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
