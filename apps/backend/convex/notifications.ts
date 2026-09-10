import { v } from 'convex/values';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { internalMutation, internalQuery, mutation } from './_generated/server';
import { scheduleSessionLockNotifications } from './inAppNotifications';
import { getViewer, requireAdmin } from './lib/auth';
import {
  sessionLocks,
  healthyReminderPush,
} from './lib/notificationEligibility';
import { shouldEmailReminder } from './lib/notificationChannels';
import { getExpoTokensForUser, dispatchPushTargets } from './push';
const TWENTY_FOUR_HOURS_MS = 86400000;
const TWO_HOURS_MS = 7200000;
export const USER_NOTIFICATION_BATCH_SIZE = 100;
const sessionTypeValidator = v.union(
  v.literal('quali'),
  v.literal('sprint_quali'),
  v.literal('sprint'),
  v.literal('race'),
);
type SessionType = 'quali' | 'sprint_quali' | 'sprint' | 'race';
export function getIncompleteH2HNudgeEligibility(params: {
  raceStatus: string;
  predictionLockAt: number;
  now: number;
  requiredSessions: Array<SessionType>;
  top5Sessions: Set<SessionType>;
  h2hSessions: Set<SessionType>;
}):
  | { eligible: true }
  | {
      eligible: false;
      reason:
        | 'race_not_upcoming'
        | 'predictions_locked'
        | 'top5_incomplete'
        | 'h2h_complete';
    } {
  if (params.raceStatus !== 'upcoming') {
    return { eligible: false, reason: 'race_not_upcoming' };
  }
  if (params.predictionLockAt <= params.now) {
    return { eligible: false, reason: 'predictions_locked' };
  }

  const hasCompleteTop5 = params.requiredSessions.every((s) =>
    params.top5Sessions.has(s),
  );
  if (!hasCompleteTop5) {
    return { eligible: false, reason: 'top5_incomplete' };
  }

  const hasCompleteH2H = params.requiredSessions.every((s) =>
    params.h2hSessions.has(s),
  );
  if (hasCompleteH2H) {
    return { eligible: false, reason: 'h2h_complete' };
  }

  return { eligible: true };
}

export function getSignupPredictionNudgeEligibility(params: {
  hasPredictions: boolean;
  remindersEnabled: boolean;
  canEmail: boolean;
  canPush: boolean;
}):
  | { eligible: true }
  | {
      eligible: false;
      reason: 'already_predicted' | 'notifications_disabled' | 'no_channel';
    } {
  if (params.hasPredictions) {
    return { eligible: false, reason: 'already_predicted' };
  }
  if (!params.remindersEnabled) {
    return { eligible: false, reason: 'notifications_disabled' };
  }
  if (!params.canEmail && !params.canPush) {
    return { eligible: false, reason: 'no_channel' };
  }
  return { eligible: true };
}

export async function sendPredictionRemindersBatchCore(
  ctx: MutationCtx,
  args: {
    raceId: Id<'races'>;
    startAfter?: string;
    recipientCount?: number;
    batchesScheduled?: number;
  },
) {
  await ctx.runMutation(internal.notificationEmails.fanout, {
    raceId: args.raceId,
    kind: 'reminder',
  });
  return null;
}
export const sendPredictionReminders = internalMutation({
  args: { raceId: v.id('races') },
  returns: v.null(),
  handler: sendPredictionRemindersBatchCore,
});
export const sendPredictionRemindersBatch = internalMutation({
  args: {
    raceId: v.id('races'),
    startAfter: v.optional(v.string()),
    recipientCount: v.optional(v.number()),
    batchesScheduled: v.optional(v.number()),
  },
  returns: v.null(),
  handler: sendPredictionRemindersBatchCore,
});
export const sendResultEmailsForSession = internalMutation({
  args: { raceId: v.id('races'), sessionType: sessionTypeValidator },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.sessionType === 'race') {
      await ctx.runMutation(internal.notificationEmails.fanout, {
        raceId: args.raceId,
        kind: 'summary',
      });
    }
    return null;
  },
});
export const sendResultEmailsForSessionBatch = internalMutation({
  args: {
    raceId: v.id('races'),
    sessionType: sessionTypeValidator,
    startAfter: v.optional(v.string()),
    recipientCount: v.optional(v.number()),
    batchesScheduled: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (args.sessionType === 'race') {
      await ctx.runMutation(internal.notificationEmails.fanout, {
        raceId: args.raceId,
        kind: 'summary',
      });
    }
    return null;
  },
});
// Retired: completion nudges now share the missing-picks deadline reminder.
// Keep old scheduled entry points safe during rollout.
export const sendIncompleteH2HNudgeForUser = internalMutation({
  args: { raceId: v.id('races'), userId: v.id('users') },
  returns: v.null(),
  handler: async () => null,
});
export async function sendH2HRemindersForRaceBatchCore(
  _ctx: MutationCtx,
  _args: { raceId: Id<'races'>; startAfter?: string; scheduled?: number },
) {
  return null;
}
export const sendH2HRemindersForRace = internalMutation({
  args: { raceId: v.id('races') },
  returns: v.null(),
  handler: sendH2HRemindersForRaceBatchCore,
});
export const sendH2HRemindersForRaceBatch = internalMutation({
  args: {
    raceId: v.id('races'),
    startAfter: v.optional(v.string()),
    scheduled: v.optional(v.number()),
  },
  returns: v.null(),
  handler: sendH2HRemindersForRaceBatchCore,
});
export const sendSignupPredictionNudgeForUser = internalMutation({
  args: { userId: v.id('users') },
  returns: v.null(),
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || user.deletingAt) {
      return null;
    }
    const now = Date.now();
    const race = await ctx.db
      .query('races')
      .withIndex('by_status_and_predictionLockAt', (q) =>
        q.eq('status', 'upcoming').gt('predictionLockAt', now),
      )
      .first();
    if (!race) {
      return null;
    }
    const first = sessionLocks(race)[0];
    if (!first || first.lockAt - now <= 25 * 3600000) {
      return null;
    }
    if (
      await ctx.db
        .query('predictions')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .first()
    ) {
      return null;
    }
    const push = await healthyReminderPush(ctx, user, now);
    if (shouldEmailReminder(user, push)) {
      await ctx.runMutation(internal.notificationEmails.queue, {
        userId: user._id,
        raceId: race._id,
        kind: 'signup',
      });
    }
    if (push) {
      const subscriptions = await ctx.db
        .query('pushSubscriptions')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .take(20);
      await dispatchPushTargets(
        ctx,
        {
          subscriptions: subscriptions.map((s) => ({
            endpoint: s.endpoint,
            p256dh: s.p256dh,
            auth: s.auth,
          })),
          tokens: await getExpoTokensForUser(ctx, user._id),
        },
        {
          title: race.name,
          body: 'Make your first Top 5 and head-to-head picks.',
          url: `/races/${race.slug}?utm_campaign=signup_nudge`,
          category: 'reminder',
          eventKey: `signup:${user._id}`,
          expiresAt: first.lockAt - 24 * 3600000,
          raceId: race._id,
        },
      );
    }
    return null;
  },
});
export const adminTriggerReminders = mutation({
  args: { raceId: v.id('races') },
  returns: v.null(),
  handler: async (ctx, args) => {
    requireAdmin(await getViewer(ctx));
    await ctx.runMutation(internal.notificationEmails.fanout, {
      raceId: args.raceId,
      kind: 'reminder',
    });
    return null;
  },
});
export const triggerRemindersForNextRace = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const race = await ctx.db
      .query('races')
      .withIndex('by_status_and_predictionLockAt', (q) =>
        q.eq('status', 'upcoming').gt('predictionLockAt', Date.now()),
      )
      .first();
    if (race) {
      await ctx.runMutation(internal.notificationEmails.fanout, {
        raceId: race._id,
        kind: 'reminder',
      });
    }
    return null;
  },
});
export async function scheduleReminder(
  ctx: MutationCtx,
  race: Doc<'races'>,
): Promise<void> {
  for (const id of [
    ...(race.reminderJobIds ?? []),
    ...(race.reminderScheduledId
      ? [race.reminderScheduledId as Id<'_scheduled_functions'>]
      : []),
  ]) {
    try {
      await ctx.scheduler.cancel(id);
    } catch {
      /* Already completed. */
    }
  }
  const version = (race.reminderVersion ?? 0) + 1;
  const ids: Id<'_scheduled_functions'>[] = [];
  const now = Date.now();
  if (race.status !== 'cancelled' && race.status !== 'finished') {
    const locks = sessionLocks(race);
    const first = locks[0];
    if (first && first.lockAt - TWENTY_FOUR_HOURS_MS > now) {
      ids.push(
        await ctx.scheduler.runAt(
          first.lockAt - TWENTY_FOUR_HOURS_MS,
          internal.notifications.sendPredictionReminders,
          { raceId: race._id },
        ),
      );
      ids.push(
        await ctx.scheduler.runAt(
          first.lockAt - TWENTY_FOUR_HOURS_MS,
          internal.push.sendPushRemindersForRace,
          {
            raceId: race._id,
            filterUnpredicted: false,
            sessionType: first.sessionType,
            expectedLockAt: first.lockAt,
            version,
          },
        ),
      );
    }
    for (const lock of locks) {
      if (lock.lockAt - TWO_HOURS_MS > now) {
        ids.push(
          await ctx.scheduler.runAt(
            lock.lockAt - TWO_HOURS_MS,
            internal.push.sendPushRemindersForRace,
            {
              raceId: race._id,
              filterUnpredicted: true,
              sessionType: lock.sessionType,
              expectedLockAt: lock.lockAt,
              version,
            },
          ),
        );
      }
    }
  }
  await ctx.db.patch(race._id, {
    reminderVersion: version,
    reminderJobIds: ids,
    reminderScheduledId: undefined,
  });
}

export const rescheduleUpcomingRaceReminders = internalMutation({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const races = await ctx.db
      .query('races')
      .withIndex('by_status_and_predictionLockAt', (q) =>
        q.eq('status', 'upcoming').gt('predictionLockAt', Date.now()),
      )
      .take(50);
    for (const race of races) {
      await scheduleReminder(ctx, race);
      await scheduleSessionLockNotifications(ctx, race);
    }
    return null;
  },
});
export const inspectRecentNotificationJobs = internalQuery({
  args: { sinceMs: v.number(), nowMs: v.number() },
  returns: v.object({
    counts: v.record(v.string(), v.number()),
    sampleLimit: v.number(),
  }),
  handler: async (ctx, args) => {
    const cutoff = args.nowMs - Math.min(args.sinceMs, 30 * 86400000);
    const rows = await ctx.db
      .query('notificationDeliveries')
      .order('desc')
      .take(1000);
    const counts: Record<string, number> = {};
    for (const row of rows) {
      if (row.createdAt >= cutoff) {
        const key = `${row.category}:${row.channel}:${row.status}`;
        counts[key] = (counts[key] ?? 0) + 1;
      }
    }
    return { counts, sampleLimit: 1000 };
  },
});
export const cancelQueuedResultNotifications = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query('races')
      .paginate({ cursor: args.cursor ?? null, numItems: 50 });
    for (const race of page.page) {
      for (const key of [
        `summary:${race._id}`,
        ...['quali', 'sprint_quali', 'sprint', 'race'].map(
          (s) => `results:${race._id}:${s}`,
        ),
      ]) {
        const campaign = await ctx.db
          .query('notificationCampaigns')
          .withIndex('by_key', (q) => q.eq('key', key))
          .unique();
        if (campaign) {
          await ctx.db.patch(campaign._id, { cancelled: true });
        } else {
          await ctx.db.insert('notificationCampaigns', {
            key,
            cancelled: true,
            createdAt: Date.now(),
          });
        }
      }
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.cancelQueuedResultNotifications,
        { cursor: page.continueCursor },
      );
    }
    return null;
  },
});
export const markResultNotificationsSent = internalMutation({
  args: { cursor: v.optional(v.union(v.string(), v.null())) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const page = await ctx.db
      .query('results')
      .paginate({ cursor: args.cursor ?? null, numItems: 100 });
    for (const row of page.page) {
      if (!row.notificationsSent) {
        await ctx.db.patch(row._id, { notificationsSent: true });
      }
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.notifications.markResultNotificationsSent,
        { cursor: page.continueCursor },
      );
    }
    return null;
  },
});
