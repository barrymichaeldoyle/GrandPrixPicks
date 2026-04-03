import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { internalMutation, mutation, query } from './_generated/server';
import { getViewer, requireViewer } from './lib/auth';

const sessionTypeValidator = v.union(
  v.literal('quali'),
  v.literal('sprint_quali'),
  v.literal('sprint'),
  v.literal('race'),
);

const MAX_NOTIFICATIONS = 30;

async function loadFollowedActorIds(
  ctx: Pick<QueryCtx, 'db'>,
  viewerId: Id<'users'>,
  actorIds: Iterable<Id<'users'>>,
) {
  const followedIds = new Set<Id<'users'>>();

  for (const actorId of actorIds) {
    const existing = await ctx.db
      .query('follows')
      .withIndex('by_follower_followee', (q) =>
        q.eq('followerId', viewerId).eq('followeeId', actorId),
      )
      .unique();
    if (existing) {
      followedIds.add(actorId);
    }
  }

  return followedIds;
}

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

    const actorIds = new Set<Id<'users'>>();
    for (const notification of notifications) {
      if (notification.actorUserId) {
        actorIds.add(notification.actorUserId);
      }
    }
    const followedIds = await loadFollowedActorIds(ctx, viewer._id, actorIds);

    // Group rev_received by feedEventId; pass everything else through unchanged
    const revsByEventId = new Map<Id<'feedEvents'>, typeof notifications>();
    const result: Array<
      (typeof notifications)[number] & {
        actors?: Array<{
          userId?: Id<'users'>;
          username?: string;
          displayName?: string;
          avatarUrl?: string;
          isFollowed: boolean;
        }>;
        totalRevCount?: number;
      }
    > = [];

    for (const n of notifications) {
      if (n.type === 'rev_received' && n.feedEventId) {
        const key = n.feedEventId;
        if (!revsByEventId.has(key)) {
          revsByEventId.set(key, []);
        }
        revsByEventId.get(key)!.push(n);
      } else {
        result.push(n);
      }
    }

    for (const revNotifs of revsByEventId.values()) {
      // Followed actors first, then most recent
      revNotifs.sort((a, b) => {
        const aF = a.actorUserId && followedIds.has(a.actorUserId) ? 0 : 1;
        const bF = b.actorUserId && followedIds.has(b.actorUserId) ? 0 : 1;
        if (aF !== bF) {
          return aF - bF;
        }
        return b.createdAt - a.createdAt;
      });

      const representative = revNotifs[0];
      const groupUnread = revNotifs.some((n) => !n.readAt);

      result.push({
        ...representative,
        readAt: groupUnread ? undefined : representative.readAt,
        actors: revNotifs.map((n) => ({
          userId: n.actorUserId,
          username: n.actorUsername,
          displayName: n.actorDisplayName,
          avatarUrl: n.actorAvatarUrl,
          isFollowed: n.actorUserId ? followedIds.has(n.actorUserId) : false,
        })),
        totalRevCount: revNotifs.length,
      });
    }

    result.sort((a, b) => b.createdAt - a.createdAt);

    const unreadCount = result.filter((n) => !n.readAt).length;

    return { notifications: result, unreadCount };
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
  args: {
    notificationId: v.id('inAppNotifications'),
    feedEventId: v.optional(v.id('feedEvents')),
  },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getViewer(ctx));
    const now = Date.now();

    // For grouped revs, mark all notifications for the feed event as read
    if (args.feedEventId) {
      for await (const notification of ctx.db
        .query('inAppNotifications')
        .withIndex('by_user_type_and_feedEventId', (q) =>
          q
            .eq('userId', viewer._id)
            .eq('type', 'rev_received')
            .eq('feedEventId', args.feedEventId),
        )) {
        if (!notification.readAt) {
          await ctx.db.patch(notification._id, { readAt: now });
        }
      }
      return;
    }

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== viewer._id) {
      return;
    }
    if (!notification.readAt) {
      await ctx.db.patch(args.notificationId, { readAt: now });
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

    await ctx.scheduler.runAfter(0, internal.push.sendPushForRevReceived, {
      recipientUserId: args.recipientUserId,
      actorDisplayName: actor.displayName,
      feedEventId: args.feedEventId,
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
      .withIndex('by_user_type_raceId_and_sessionType', (q) =>
        q
          .eq('userId', args.userId)
          .eq('type', 'results_published')
          .eq('raceId', args.raceId)
          .eq('sessionType', args.sessionType),
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

    const now = Date.now();
    const notifiedUserIds: Id<'users'>[] = [];
    const existingNotificationUserIds = new Set<Id<'users'>>();

    for await (const notification of ctx.db
      .query('inAppNotifications')
      .withIndex('by_raceId_and_sessionType', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )) {
      if (notification.type === 'session_locked') {
        existingNotificationUserIds.add(notification.userId);
      }
    }

    for await (const prediction of ctx.db
      .query('predictions')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )) {
      if (existingNotificationUserIds.has(prediction.userId)) {
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

      notifiedUserIds.push(prediction.userId);
      existingNotificationUserIds.add(prediction.userId);
    }

    if (notifiedUserIds.length > 0) {
      await ctx.scheduler.runAfter(0, internal.push.sendPushForSessionLocked, {
        raceId: args.raceId,
        sessionType: args.sessionType,
        userIds: notifiedUserIds,
      });
    }

    // Write feed events so followees' picks are visible in the feed at lock time
    await ctx.scheduler.runAfter(
      0,
      internal.feed.writeFeedEventsForSessionLock,
      { raceId: args.raceId, sessionType: args.sessionType },
    );
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
    const toDelete: Array<Id<'inAppNotifications'>> = [];
    for await (const notification of ctx.db
      .query('inAppNotifications')
      .withIndex('by_raceId_and_sessionType', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )) {
      toDelete.push(notification._id);
    }

    for (const id of toDelete) {
      await ctx.db.delete(id);
    }
  },
});
