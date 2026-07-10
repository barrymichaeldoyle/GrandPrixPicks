import { SESSION_LABELS_FULL } from '@grandprixpicks/shared/sessions';
import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { internalMutation, internalQuery, mutation } from './_generated/server';
import { getViewer, requireViewer } from './lib/auth';
import {
  wantsPushPredictionLockReminders,
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

/**
 * Allowlist of known web-push provider hosts. `saveSubscription` accepts an
 * arbitrary endpoint string from the client; without this check an
 * authenticated user could register an endpoint pointing at internal/metadata
 * infrastructure and have Convex POST to it from server infra (SSRF) whenever
 * a push event fires. Real browser Push services only ever live on these hosts.
 */
const ALLOWED_PUSH_HOST_SUFFIXES = [
  'fcm.googleapis.com', // Chrome / Chromium / Android
  'updates.push.services.mozilla.com', // Firefox
  'web.push.apple.com', // Safari / iOS web push
  '.notify.windows.com', // Edge / WNS
] as const;

function isAllowedPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') {
    return false;
  }
  const host = url.hostname.toLowerCase();
  return ALLOWED_PUSH_HOST_SUFFIXES.some((suffix) =>
    suffix.startsWith('.')
      ? host.endsWith(suffix)
      : host === suffix || host.endsWith(`.${suffix}`),
  );
}

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

export async function getExpoTokensForUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>,
): Promise<Array<string>> {
  const tokens: Array<string> = [];
  for await (const row of ctx.db
    .query('expoPushTokens')
    .withIndex('by_user', (q) => q.eq('userId', userId))) {
    tokens.push(row.token);
  }
  return tokens;
}

async function getExpoTokensByUser(
  ctx: MutationCtx,
): Promise<Map<Id<'users'>, Array<string>>> {
  const tokensByUser = new Map<Id<'users'>, Array<string>>();
  for await (const row of ctx.db.query('expoPushTokens')) {
    const existing = tokensByUser.get(row.userId) ?? [];
    existing.push(row.token);
    tokensByUser.set(row.userId, existing);
  }
  return tokensByUser;
}

async function getSubscriptionsByUser(
  ctx: MutationCtx,
): Promise<Map<Id<'users'>, Array<PushSubscriptionPayload>>> {
  const subscriptionsByUser = new Map<
    Id<'users'>,
    Array<PushSubscriptionPayload>
  >();
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

    if (!isAllowedPushEndpoint(args.endpoint)) {
      throw new Error('Invalid push subscription endpoint');
    }

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
    const expoTokensByUser = await getExpoTokensByUser(ctx);
    if (subscriptionsByUser.size === 0 && expoTokensByUser.size === 0) {
      return { skipped: true, reason: 'No push subscriptions' };
    }

    const subscribedUserIds = [
      ...new Set([...subscriptionsByUser.keys(), ...expoTokensByUser.keys()]),
    ];
    const subscribedUsers = await Promise.all(
      subscribedUserIds.map((userId) => ctx.db.get(userId)),
    );
    const userById = new Map(
      subscribedUsers
        .filter((u): u is NonNullable<typeof u> => u !== null)
        .map((u) => [u._id as string, u]),
    );

    const usersWithPredictions = new Set<string>();
    for await (const prediction of ctx.db
      .query('predictions')
      .withIndex('by_race_session', (q) => q.eq('raceId', args.raceId))) {
      usersWithPredictions.add(prediction.userId as string);
    }

    async function sendToUsers(
      userIds: Array<string>,
      message: { title: string; body: string; url: string },
    ): Promise<number> {
      const subs = userIds.flatMap(
        (id) => subscriptionsByUser.get(id as Id<'users'>) ?? [],
      );
      const tokens = userIds.flatMap(
        (id) => expoTokensByUser.get(id as Id<'users'>) ?? [],
      );
      if (subs.length > 0) {
        await scheduleSendPushBatches(ctx, {
          subscriptions: subs,
          ...message,
        });
      }
      if (tokens.length > 0) {
        await scheduleSendExpoPushBatches(ctx, { tokens, ...message });
      }
      return subs.length + tokens.length;
    }

    // 2h "last chance" path: only unpredicted users who opted in to reminders.
    if (args.filterUnpredicted) {
      const targetUserIds = subscribedUserIds
        .map((id) => id as string)
        .filter(
          (id) =>
            !usersWithPredictions.has(id) &&
            (() => {
              const u = userById.get(id);
              return u ? wantsPushPredictionReminders(u) : false;
            })(),
        );

      if (targetUserIds.length === 0) {
        return { skipped: true, reason: 'No target users' };
      }

      const queued = await sendToUsers(targetUserIds, {
        title: `⏰ ${race.name}`,
        body: `Picks close in 2 hours. You haven't made your predictions yet!`,
        url: `/races/${race.slug}?utm_source=push&utm_medium=push&utm_campaign=last_chance`,
      });
      return { queued };
    }

    // 24h path: split into unpredicted (existing reminder) + predicted (new
    // "lock approaching" reminder, separate opt-out).
    const unpredictedTargets: Array<string> = [];
    const predictedTargets: Array<string> = [];
    for (const id of subscribedUserIds.map((x) => x as string)) {
      const user = userById.get(id);
      if (!user) {
        continue;
      }
      if (usersWithPredictions.has(id)) {
        if (wantsPushPredictionLockReminders(user)) {
          predictedTargets.push(id);
        }
      } else if (wantsPushPredictionReminders(user)) {
        unpredictedTargets.push(id);
      }
    }

    let queued = 0;

    if (unpredictedTargets.length > 0) {
      queued += await sendToUsers(unpredictedTargets, {
        title: `🏎️ ${race.name}`,
        body: `Picks are open. You have 24 hours to make your predictions`,
        url: `/races/${race.slug}?utm_source=push&utm_medium=push&utm_campaign=prediction_reminder`,
      });
    }

    if (predictedTargets.length > 0) {
      queued += await sendToUsers(predictedTargets, {
        title: `🔒 ${race.name}`,
        body: `Your picks are in. Picks lock in 24 hours, so edit before then.`,
        url: `/races/${race.slug}?utm_source=push&utm_medium=push&utm_campaign=lock_approaching`,
      });
    }

    if (queued === 0) {
      return { skipped: true, reason: 'No target users' };
    }
    return { queued };
  },
});

async function scheduleSendPushBatches(
  ctx: MutationCtx,
  args: {
    subscriptions: Array<PushSubscriptionPayload>;
    title: string;
    body: string;
    url: string;
  },
): Promise<void> {
  const BATCH_SIZE = 100;
  for (let i = 0; i < args.subscriptions.length; i += BATCH_SIZE) {
    await ctx.scheduler.runAfter(0, internal.pushNotifications.sendPushBatch, {
      subscriptions: args.subscriptions.slice(i, i + BATCH_SIZE),
      title: args.title,
      body: args.body,
      url: args.url,
    });
  }
}

export async function scheduleSendExpoPushBatches(
  ctx: MutationCtx,
  args: {
    tokens: Array<string>;
    title: string;
    body: string;
    url: string;
  },
): Promise<void> {
  const BATCH_SIZE = 100;
  for (let i = 0; i < args.tokens.length; i += BATCH_SIZE) {
    await ctx.scheduler.runAfter(
      0,
      internal.pushNotifications.sendExpoPushBatch,
      {
        tokens: args.tokens.slice(i, i + BATCH_SIZE),
        title: args.title,
        body: args.body,
        url: args.url,
      },
    );
  }
}

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
    const expoTokensByUser = await getExpoTokensByUser(ctx);
    if (subscriptionsByUser.size === 0 && expoTokensByUser.size === 0) {
      return { skipped: true, reason: 'No push subscriptions' };
    }

    const subscribedUserIds = [
      ...new Set([...subscriptionsByUser.keys(), ...expoTokensByUser.keys()]),
    ];
    const subscribedUsers = await Promise.all(
      subscribedUserIds.map((userId) => ctx.db.get(userId)),
    );
    const usersWithResultPushEnabled = new Set(
      subscribedUsers
        .filter((u) => u && wantsPushResults(u))
        .map((u) => u!._id as string),
    );

    const sessionLabel = SESSION_LABELS_FULL[args.sessionType];
    const title = `🏁 ${race.name}: ${sessionLabel} results`;
    const body = `Session results are in. See how you scored!`;
    const url = `/races/${race.slug}?utm_source=push&utm_medium=push&utm_campaign=results`;

    const subscriptions = [...subscriptionsByUser.entries()]
      .filter(([userId]) => usersWithResultPushEnabled.has(userId as string))
      .flatMap(([, userSubscriptions]) => userSubscriptions);
    const tokens = [...expoTokensByUser.entries()]
      .filter(([userId]) => usersWithResultPushEnabled.has(userId as string))
      .flatMap(([, userTokens]) => userTokens);

    if (subscriptions.length === 0 && tokens.length === 0) {
      return { skipped: true, reason: 'No eligible subscriptions' };
    }

    if (subscriptions.length > 0) {
      await scheduleSendPushBatches(ctx, { subscriptions, title, body, url });
    }
    if (tokens.length > 0) {
      await scheduleSendExpoPushBatches(ctx, { tokens, title, body, url });
    }

    return { queued: subscriptions.length + tokens.length };
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
    const tokens: Array<string> = [];

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
      tokens.push(...(await getExpoTokensForUser(ctx, userId)));
    }

    if (subscriptions.length === 0 && tokens.length === 0) {
      return { skipped: true, reason: 'No eligible subscriptions' };
    }

    const message = {
      title: `🔒 ${race.name}: ${sessionLabel}`,
      body: "See everyone's picks.",
      url: `/feed?utm_source=push&utm_medium=push&utm_campaign=session_locked`,
    };
    if (subscriptions.length > 0) {
      await scheduleSendPushBatches(ctx, { subscriptions, ...message });
    }
    if (tokens.length > 0) {
      await scheduleSendExpoPushBatches(ctx, { tokens, ...message });
    }

    return { queued: subscriptions.length + tokens.length };
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
    const tokens = await getExpoTokensForUser(ctx, args.recipientUserId);

    if (subs.length === 0 && tokens.length === 0) {
      return { skipped: true, reason: 'No subscriptions' };
    }

    const actorName = args.actorDisplayName ?? 'Someone';
    const message = {
      title: '⭐ New rev',
      body: `${actorName} reved your prediction`,
      url: `/feed/${args.feedEventId}?utm_source=push&utm_medium=push&utm_campaign=rev_received`,
    };

    if (subs.length > 0) {
      await scheduleSendPushBatches(ctx, {
        subscriptions: subs.map((s) => ({
          endpoint: s.endpoint,
          p256dh: s.p256dh,
          auth: s.auth,
        })),
        ...message,
      });
    }
    if (tokens.length > 0) {
      await scheduleSendExpoPushBatches(ctx, { tokens, ...message });
    }

    return { queued: subs.length + tokens.length };
  },
});

/** Internal: delete a stale Expo token (called after DeviceNotRegistered). */
export const deleteStaleExpoToken = internalMutation({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('expoPushTokens')
      .withIndex('by_token', (q) => q.eq('token', args.token))
      .unique();
    if (existing) {
      await ctx.db.delete(existing._id);
    }
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
