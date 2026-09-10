import { missingPicks, sessionLocks } from './lib/notificationEligibility';
import type { Message } from './notificationDelivery';
import { REACTION_BY_TYPE } from '@grandprixpicks/shared/reactions';
import { SESSION_LABELS_FULL } from '@grandprixpicks/shared/sessions';
import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { internalMutation, internalQuery, mutation } from './_generated/server';
import { getViewer, requireViewer } from './lib/auth';
import { DEFAULT_REACTION_TYPE, reactionTypeValidator } from './lib/reactions';
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
  const subscriptions = await ctx.db
    .query('pushSubscriptions')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .order('desc')
    .take(20);
  return subscriptions.map((sub) => ({
    endpoint: sub.endpoint,
    p256dh: sub.p256dh,
    auth: sub.auth,
  }));
}

export async function getExpoTokensForUser(
  ctx: QueryCtx | MutationCtx,
  userId: Id<'users'>,
): Promise<Array<string>> {
  const tokens = await ctx.db
    .query('expoPushTokens')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .order('desc')
    .take(20);
  return tokens.map((row) => row.token);
}

/**
 * Fan-outs page the roster instead of loading it whole. Reading every push row
 * and every subscriber in one transaction has a ceiling, and the two sends that
 * would reach it first are the two that matter most: the pre-race reminder and
 * the results push. Past that ceiling the mutation throws rather than degrades,
 * so the symptom is a notification that simply never arrives. Each page
 * reschedules itself, the same shape as
 * `inAppNotifications.broadcastAnnouncement`.
 */
const PUSH_FANOUT_PAGE_SIZE = 100;

type PushTargets = {
  subscriptions: Array<PushSubscriptionPayload>;
  tokens: Array<string>;
};

type PushFanoutResult = {
  queued: number;
  done: boolean;
  /** Set on an early-out, so a skipped run reads as such in the logs. */
  reason?: string;
};

function emptyPushTargets(): PushTargets {
  return { subscriptions: [], tokens: [] };
}

function pushTargetCount(targets: PushTargets): number {
  return targets.subscriptions.length + targets.tokens.length;
}

/**
 * Append one user's devices to `targets`. Both lookups are by index, so this
 * stays cheap per recipient. Call it only after the user's channel opt-out has
 * passed: a roster full of people who never enabled push then costs one read
 * each rather than a walk of both device tables.
 */
async function addUserPushTargets(
  ctx: MutationCtx,
  targets: PushTargets,
  userId: Id<'users'>,
): Promise<void> {
  targets.subscriptions.push(...(await getSubscriptionsForUser(ctx, userId)));
  targets.tokens.push(...(await getExpoTokensForUser(ctx, userId)));
}

export async function dispatchPushTargets(
  ctx: MutationCtx,
  targets: PushTargets,
  message: Message,
): Promise<number> {
  if (targets.subscriptions.length > 0) {
    await scheduleSendPushBatches(ctx, {
      subscriptions: targets.subscriptions,
      ...message,
    });
  }
  if (targets.tokens.length > 0) {
    await scheduleSendExpoPushBatches(ctx, {
      tokens: targets.tokens,
      ...message,
    });
  }
  return pushTargetCount(targets);
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
        userId: viewer._id,
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

    if (
      !/^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]+\]$/.test(args.token)
    ) {
      throw new Error('Invalid Expo push token');
    }
    if (existing) {
      await ctx.db.patch(existing._id, {
        userId: viewer._id,
        refreshedAt: Date.now(),
      });
    } else {
      await ctx.db.insert('expoPushTokens', {
        userId: viewer._id,
        token: args.token,
        refreshedAt: Date.now(),
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
 * Internal mutation: reminds subscribed users about a race, one page of the
 * roster per transaction, rescheduling itself until the roster is exhausted.
 *
 * `filterUnpredicted` picks the send: the 2h "last chance" run reaches only
 * people with nothing submitted, the 24h run splits the roster into a reminder
 * for those and a lock warning for everyone who has already picked.
 */
export const sendPushRemindersForRace = internalMutation({
  args: {
    raceId: v.id('races'),
    filterUnpredicted: v.boolean(),
    cursor: v.optional(v.union(v.string(), v.null())),
    queued: v.optional(v.number()),
    sessionType: v.optional(sessionTypeValidator),
    expectedLockAt: v.optional(v.number()),
    version: v.optional(v.number()),
  },
  returns: v.object({
    queued: v.number(),
    done: v.boolean(),
    reason: v.optional(v.string()),
  }),
  handler: async (ctx, args): Promise<PushFanoutResult> => {
    const race = await ctx.db.get(args.raceId);
    const now = Date.now();
    let queued = args.queued ?? 0;
    if (
      !race ||
      race.status === 'cancelled' ||
      race.status === 'finished' ||
      (args.version !== undefined && args.version !== race.reminderVersion)
    ) {
      return { queued, done: true, reason: 'Inactive schedule' };
    }
    const lock = sessionLocks(race).find(
      (s) => !args.sessionType || s.sessionType === args.sessionType,
    );
    if (
      !lock ||
      lock.lockAt <= now ||
      (args.expectedLockAt !== undefined && lock.lockAt !== args.expectedLockAt)
    ) {
      return { queued, done: true, reason: 'Deadline changed or passed' };
    }
    const page = await ctx.db.query('users').paginate({
      numItems: PUSH_FANOUT_PAGE_SIZE,
      cursor: args.cursor ?? null,
    });
    const targets = emptyPushTargets();
    for (const user of page.page) {
      if (
        user.deletingAt ||
        !(args.filterUnpredicted
          ? wantsPushPredictionLockReminders(user)
          : wantsPushPredictionReminders(user))
      ) {
        continue;
      }
      if (
        !(await missingPicks(
          ctx,
          user._id,
          race,
          now,
          args.filterUnpredicted ? lock.sessionType : undefined,
        ))
      ) {
        continue;
      }
      await addUserPushTargets(ctx, targets, user._id);
    }
    queued += await dispatchPushTargets(ctx, targets, {
      title: race.name,
      body: args.filterUnpredicted
        ? `You have missing picks for ${SESSION_LABELS_FULL[lock.sessionType]}. Submit them before the session starts.`
        : 'You have missing picks for this weekend. Submit them before each session starts.',
      url: `/races/${race.slug}?utm_source=push&utm_campaign=${args.filterUnpredicted ? 'last_chance' : 'prediction_reminder'}`,
      eventKey: `reminder:${race._id}:${lock.sessionType}:${lock.lockAt}:${args.filterUnpredicted ? '2h' : '24h'}`,
      category: args.filterUnpredicted ? 'lock_reminder' : 'reminder',
      expiresAt: lock.lockAt,
      raceId: race._id,
      sessionType: lock.sessionType,
      expectedLockAt: lock.lockAt,
    });
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.push.sendPushRemindersForRace, {
        ...args,
        cursor: page.continueCursor,
        queued,
      });
    }
    return { queued, done: page.isDone };
  },
});

async function scheduleSendPushBatches(
  ctx: MutationCtx,
  args: {
    subscriptions: Array<PushSubscriptionPayload>;
    title: string;
    body: string;
    url: string;
  } & Message,
): Promise<void> {
  const BATCH_SIZE = 100;
  for (let i = 0; i < args.subscriptions.length; i += BATCH_SIZE) {
    await ctx.runMutation(internal.notificationDelivery.enqueueWeb, {
      ...args,
      subscriptions: args.subscriptions.slice(i, i + BATCH_SIZE),
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
  } & Message,
): Promise<void> {
  const BATCH_SIZE = 100;
  for (let i = 0; i < args.tokens.length; i += BATCH_SIZE) {
    await ctx.runMutation(internal.notificationDelivery.enqueueExpo, {
      ...args,
      tokens: args.tokens.slice(i, i + BATCH_SIZE),
    });
  }
}

/**
 * Internal mutation: tells subscribed users a session has been scored, one page
 * of the roster per transaction, rescheduling itself until it is exhausted.
 *
 * Continuation pages keep this function's name, so
 * `notifications.cancelQueuedResultNotifications` still cancels them: the
 * emergency stop can now halt a send part-way through the roster instead of
 * arriving after one transaction has already dispatched every batch.
 */
export const sendPushResultsForSession = internalMutation({
  args: {
    raceId: v.id('races'),
    sessionType: sessionTypeValidator,
    cursor: v.optional(v.union(v.string(), v.null())),
    queued: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<PushFanoutResult> => {
    const queuedSoFar = args.queued ?? 0;
    const race = await ctx.db.get(args.raceId);
    if (!race) {
      return { queued: queuedSoFar, done: true, reason: 'Race not found' };
    }

    const page = await ctx.db.query('users').paginate({
      numItems: PUSH_FANOUT_PAGE_SIZE,
      cursor: args.cursor ?? null,
    });

    const targets = emptyPushTargets();
    for (const user of page.page) {
      if (!wantsPushResults(user)) {
        continue;
      }
      const [top5, h2h] = await Promise.all([
        ctx.db
          .query('predictions')
          .withIndex('by_user_race_session', (q) =>
            q
              .eq('userId', user._id)
              .eq('raceId', race._id)
              .eq('sessionType', args.sessionType),
          )
          .first(),
        ctx.db
          .query('h2hPredictions')
          .withIndex('by_user_race_session', (q) =>
            q
              .eq('userId', user._id)
              .eq('raceId', race._id)
              .eq('sessionType', args.sessionType),
          )
          .first(),
      ]);
      if (!top5 && !h2h) {
        continue;
      }
      await addUserPushTargets(ctx, targets, user._id);
    }

    const sessionLabel = SESSION_LABELS_FULL[args.sessionType];
    const title = `🏁 ${race.name}: ${sessionLabel} results`;
    const body = `Your session score is ready.`;
    // Matches the results email: "See how you scored" is a standings question,
    // so it opens the weekend leaderboard for this round rather than the race
    // page. `time`/`raceId` scope it on web; mobile's push router maps the
    // path to the Leaderboard tab (see apps/mobile/src/lib/pushRouting.ts,
    // which must know any path we send here or the tap does nothing).
    const url = `/leaderboard?time=weekend&raceId=${race._id}&utm_source=push&utm_medium=push&utm_campaign=results`;

    let queued = queuedSoFar;
    if (pushTargetCount(targets) > 0) {
      queued += await dispatchPushTargets(ctx, targets, {
        title,
        body,
        url,
        category: 'results',
        eventKey: `results:${race._id}:${args.sessionType}`,
        raceId: race._id,
        sessionType: args.sessionType,
      });
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.push.sendPushResultsForSession, {
        raceId: args.raceId,
        sessionType: args.sessionType,
        cursor: page.continueCursor,
        queued,
      });
    }

    return { queued, done: page.isDone };
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
      // The dashboard, not `/feed`: that page has been removed and its activity
      // stream is the lower half of the dashboard now. Pushes already delivered
      // with the old URL still work — `/feed` redirects here.
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
 * Internal mutation: send a push notification for a feed reaction.
 * Called from inAppNotifications.createRevNotification.
 */
export const sendPushForRevReceived = internalMutation({
  args: {
    recipientUserId: v.id('users'),
    actorDisplayName: v.optional(v.string()),
    feedEventId: v.id('feedEvents'),
    reactionType: v.optional(reactionTypeValidator),
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
    const reaction =
      REACTION_BY_TYPE[args.reactionType ?? DEFAULT_REACTION_TYPE];
    const message = {
      title: `${reaction.emoji} New reaction`,
      body: `${actorName} reacted ${reaction.emoji} to your prediction`,
      url: `/feed/${args.feedEventId}?utm_source=push&utm_medium=push&utm_campaign=reaction_received`,
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
