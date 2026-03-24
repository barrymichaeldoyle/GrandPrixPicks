import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { internalMutation, mutation, query } from './_generated/server';
import { getViewer, requireViewer } from './lib/auth';

const sessionTypeValidator = v.union(
  v.literal('quali'),
  v.literal('sprint_quali'),
  v.literal('sprint'),
  v.literal('race'),
);

const MAX_NOTIFICATIONS = 30;

// ============ Public queries ============

export const getMyNotifications = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return null;
    }

    const notifications = await ctx.db
      .query('inAppNotifications')
      .withIndex('by_user_created', (q) => q.eq('userId', viewer._id))
      .order('desc')
      .take(MAX_NOTIFICATIONS);

    const unreadCount = notifications.filter((n) => !n.readAt).length;

    return { notifications, unreadCount };
  },
});

// ============ Public mutations ============

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const viewer = requireViewer(await getViewer(ctx));
    const now = Date.now();

    const unread = await ctx.db
      .query('inAppNotifications')
      .withIndex('by_user_created', (q) => q.eq('userId', viewer._id))
      .order('desc')
      .take(MAX_NOTIFICATIONS);

    for (const n of unread) {
      if (!n.readAt) {
        await ctx.db.patch(n._id, { readAt: now });
      }
    }
  },
});

export const markRead = mutation({
  args: { notificationId: v.id('inAppNotifications') },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getViewer(ctx));

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== viewer._id) {
      return;
    }
    if (!notification.readAt) {
      await ctx.db.patch(args.notificationId, { readAt: Date.now() });
    }
  },
});

// ============ Internal mutations (triggered by other Convex functions) ============

/** Called from feed.giveRev after a rev is inserted. */
export const createRevNotification = internalMutation({
  args: {
    recipientUserId: v.id('users'),
    actorUserId: v.id('users'),
    feedEventId: v.id('feedEvents'),
    raceId: v.optional(v.id('races')),
    sessionType: v.optional(sessionTypeValidator),
    raceName: v.optional(v.string()),
    raceSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Don't notify when someone revs their own post
    if (args.recipientUserId === args.actorUserId) {
      return;
    }

    const actor = await ctx.db.get(args.actorUserId);
    if (!actor) {
      return;
    }

    await ctx.db.insert('inAppNotifications', {
      userId: args.recipientUserId,
      type: 'rev_received',
      actorUserId: args.actorUserId,
      actorUsername: actor.username,
      actorDisplayName: actor.displayName,
      actorAvatarUrl: actor.avatarUrl,
      feedEventId: args.feedEventId,
      raceId: args.raceId,
      sessionType: args.sessionType,
      raceName: args.raceName,
      raceSlug: args.raceSlug,
      createdAt: Date.now(),
    });
  },
});

/** Called from feed.writeFeedEventsForSession after scores are published. */
export const createResultsNotification = internalMutation({
  args: {
    userId: v.id('users'),
    raceId: v.id('races'),
    sessionType: sessionTypeValidator,
    raceName: v.string(),
    raceSlug: v.string(),
    points: v.number(),
  },
  handler: async (ctx, args) => {
    // Upsert: one results notification per user/race/session
    const existing = await ctx.db
      .query('inAppNotifications')
      .withIndex('by_user_created', (q) => q.eq('userId', args.userId))
      .filter((q) =>
        q.and(
          q.eq(q.field('type'), 'results_published'),
          q.eq(q.field('raceId'), args.raceId),
          q.eq(q.field('sessionType'), args.sessionType),
        ),
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        points: args.points,
        readAt: undefined, // re-surface if points updated
      });
    } else {
      await ctx.db.insert('inAppNotifications', {
        userId: args.userId,
        type: 'results_published',
        raceId: args.raceId,
        sessionType: args.sessionType,
        raceName: args.raceName,
        raceSlug: args.raceSlug,
        points: args.points,
        createdAt: Date.now(),
      });
    }
  },
});

/** Notify all users who predicted a session that it is now locked. */
export const notifyUsersSessionLocked = internalMutation({
  args: {
    raceId: v.id('races'),
    sessionType: sessionTypeValidator,
  },
  handler: async (ctx, args) => {
    const race = await ctx.db.get(args.raceId);
    if (!race) {
      return;
    }

    const predictions = await ctx.db
      .query('predictions')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )
      .take(500);

    const now = Date.now();

    for (const prediction of predictions) {
      // Skip if we've already notified this user for this session lock
      const existing = await ctx.db
        .query('inAppNotifications')
        .withIndex('by_user_created', (q) => q.eq('userId', prediction.userId))
        .filter((q) =>
          q.and(
            q.eq(q.field('type'), 'session_locked'),
            q.eq(q.field('raceId'), args.raceId),
            q.eq(q.field('sessionType'), args.sessionType),
          ),
        )
        .first();

      if (existing) {
        continue;
      }

      await ctx.db.insert('inAppNotifications', {
        userId: prediction.userId,
        type: 'session_locked',
        raceId: args.raceId,
        sessionType: args.sessionType,
        raceName: race.name,
        raceSlug: race.slug,
        createdAt: now,
      });
    }
  },
});

/**
 * Schedule session-locked notifications for all sessions of a race.
 * Mirrors the scheduleReminder pattern in notifications.ts.
 * Safe to call multiple times — only schedules sessions whose lock time is in the future.
 * notifyUsersSessionLocked is idempotent, so duplicate firings are harmless.
 */
export async function scheduleSessionLockNotifications(
  ctx: MutationCtx,
  race: Doc<'races'>,
): Promise<void> {
  if (race.status === 'cancelled') {
    return;
  }

  const now = Date.now();
  const sessions: Array<{
    sessionType: 'quali' | 'sprint_quali' | 'sprint' | 'race';
    lockAt: number | undefined;
  }> = [
    { sessionType: 'quali', lockAt: race.qualiLockAt },
    { sessionType: 'sprint_quali', lockAt: race.sprintQualiLockAt },
    { sessionType: 'sprint', lockAt: race.sprintLockAt },
    { sessionType: 'race', lockAt: race.predictionLockAt },
  ];

  for (const { sessionType, lockAt } of sessions) {
    if (!lockAt || lockAt <= now) {
      continue;
    }
    await ctx.scheduler.runAt(
      lockAt,
      internal.inAppNotifications.notifyUsersSessionLocked,
      { raceId: race._id, sessionType },
    );
  }
}

/** Delete all in-app notifications for a session (e.g. on result rollback). */
export const deleteNotificationsForSession = internalMutation({
  args: {
    raceId: v.id('races'),
    sessionType: sessionTypeValidator,
  },
  handler: async (ctx, args) => {
    // We need to scan by raceId/sessionType — no direct index, so filter on user_created
    // Use by_race pattern: query all results_published for this session
    const toDelete: Array<Id<'inAppNotifications'>> = [];

    // Scan all notifications of the relevant types for this race+session
    // Since we don't have a race+session index, we'll use a collection approach
    // This is acceptable for the rollback/admin path (not on hot path)
    const notifications = await ctx.db
      .query('inAppNotifications')
      .filter((q) =>
        q.and(
          q.eq(q.field('raceId'), args.raceId),
          q.eq(q.field('sessionType'), args.sessionType),
        ),
      )
      .take(1000);

    for (const n of notifications) {
      toDelete.push(n._id);
    }

    for (const id of toDelete) {
      await ctx.db.delete(id);
    }
  },
});
