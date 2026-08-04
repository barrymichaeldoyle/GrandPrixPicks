import {
  NOTIFICATION_FILTER_VALUES,
  NOTIFICATION_TYPES_BY_FILTER,
  type NotificationFilter,
} from '@grandprixpicks/shared/notifications';
import { paginationOptsValidator } from 'convex/server';
import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { internalMutation, mutation, query } from './_generated/server';
import { getViewer, requireViewer } from './lib/auth';
import {
  DEFAULT_REACTION_TYPE,
  type ReactionType,
  reactionTypeValidator,
} from './lib/reactions';

/**
 * Ceiling on the unread badge. Past this the UI says "99+" rather than paying
 * to count a number nobody reads precisely.
 */
const UNREAD_COUNT_LIMIT = 99;

/**
 * How many unread rows one "mark all read" clears. High enough to cover any
 * realistic backlog in a single transaction; a reader deeper than this taps
 * again.
 */
const MARK_ALL_READ_LIMIT = 500;

/**
 * How far back the per-category counts look. They feed small rail badges, so
 * an exact number across an unbounded history is not worth the read; past this
 * the payload says `truncated` and the UI renders "N+".
 */
const COUNT_SCAN_LIMIT = 200;

const sessionTypeValidator = v.union(
  v.literal('quali'),
  v.literal('sprint_quali'),
  v.literal('sprint'),
  v.literal('race'),
);

const notificationFilterValidator = v.union(
  ...NOTIFICATION_FILTER_VALUES.map((value) => v.literal(value)),
);

async function loadFollowedActorIds(
  ctx: Pick<QueryCtx, 'db'>,
  viewerId: Id<'users'>,
  actorIds: Iterable<Id<'users'>>,
) {
  const followedIds = new Set<Id<'users'>>();

  await Promise.all(
    [...actorIds].map(async (actorId) => {
      const existing = await ctx.db
        .query('follows')
        .withIndex('by_follower_followee', (q) =>
          q.eq('followerId', viewerId).eq('followeeId', actorId),
        )
        .unique();
      if (existing) {
        followedIds.add(actorId);
      }
    }),
  );

  return followedIds;
}

type GroupedNotification = Doc<'inAppNotifications'> & {
  actors?: Array<{
    userId?: Id<'users'>;
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    isFollowed: boolean;
    reactionType: ReactionType;
  }>;
  totalReactionCount?: number;
  totalRevCount?: number;
};

/**
 * Collapses reaction notifications onto one row per feed event and leaves every
 * other type alone. The persisted type stays `rev_received` during the
 * compatibility window for released clients.
 *
 * Grouping is scoped to the rows handed in, so a paginated caller can end up
 * with two rows for one feed event when its reactions straddle a page boundary.
 * The clients merge on `feedEventId` for that reason.
 */
async function groupNotifications(
  ctx: Pick<QueryCtx, 'db'>,
  viewerId: Id<'users'>,
  notifications: Doc<'inAppNotifications'>[],
): Promise<GroupedNotification[]> {
  const actorIds = new Set<Id<'users'>>();
  for (const notification of notifications) {
    if (notification.actorUserId) {
      actorIds.add(notification.actorUserId);
    }
  }
  const followedIds = await loadFollowedActorIds(ctx, viewerId, actorIds);

  const revsByEventId = new Map<
    Id<'feedEvents'>,
    Doc<'inAppNotifications'>[]
  >();
  const result: GroupedNotification[] = [];

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
        reactionType: n.reactionType ?? DEFAULT_REACTION_TYPE,
      })),
      totalReactionCount: revNotifs.length,
      totalRevCount: revNotifs.length,
    });
  }

  result.sort((a, b) => b.createdAt - a.createdAt);
  return result;
}

/** Counts reaction rows the way the list renders them: one per feed event. */
function countGrouped(notifications: Doc<'inAppNotifications'>[]): number {
  const seenEventIds = new Set<Id<'feedEvents'>>();
  let count = 0;
  for (const n of notifications) {
    if (n.type === 'rev_received' && n.feedEventId) {
      if (seenEventIds.has(n.feedEventId)) {
        continue;
      }
      seenEventIds.add(n.feedEventId);
    }
    count += 1;
  }
  return count;
}

// ============ Public queries ============

/**
 * Paginated notification history, newest first, narrowed by the reader's
 * filters.
 *
 * The filters belong here rather than on the client. When the page filtered
 * what it had already loaded, "Reactions" over a history whose reactions were
 * forty rows back showed an empty inbox next to a button asking the reader to
 * page through their own history looking for them. Filtering in the query
 * means an empty result means empty, and `isDone` means there is genuinely no
 * more of *this* category.
 */
export const getMyNotifications = query({
  args: {
    paginationOpts: paginationOptsValidator,
    filter: v.optional(notificationFilterValidator),
    unreadOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      // A pagination result has to keep its shape, so signal "nothing here"
      // with an exhausted page. Auth-readiness is `getMyUnreadCount`'s null.
      return { page: [], isDone: true, continueCursor: '' };
    }

    // Unread-only rides its own index rather than scanning the history and
    // discarding read rows: a reader with a year of read notifications and one
    // unread should cost one row, not a year of them.
    const base = args.unreadOnly
      ? ctx.db
          .query('inAppNotifications')
          .withIndex('by_user_unread_created', (q) =>
            q.eq('userId', viewer._id).eq('readAt', undefined),
          )
      : ctx.db
          .query('inAppNotifications')
          .withIndex('by_user_created', (q) => q.eq('userId', viewer._id));

    const types = notificationTypesForFilter(args.filter);
    const ordered = base.order('desc');
    // query-hygiene-ignore db-filter: the category is a set of `type` values
    // (Results is two of them), so an index range would need one index per
    // category plus a second copy for the unread variant, and Results would
    // still have to merge two paginated streams by hand. The scan this costs
    // is bounded to the one signed-in user's own notifications — around a
    // hundred a season plus reactions — and only runs when they pick a
    // category. Revisit if per-user history ever reaches the thousands.
    const scoped = types
      ? ordered.filter((q) =>
          q.or(...types.map((type) => q.eq(q.field('type'), type))),
        )
      : ordered;

    const result = await scoped.paginate(args.paginationOpts);

    return {
      ...result,
      page: await groupNotifications(ctx, viewer._id, result.page),
    };
  },
});

/** `null` for the unfiltered view, so callers can skip the predicate. */
function notificationTypesForFilter(
  filter: NotificationFilter | undefined,
): readonly string[] | null {
  if (!filter || filter === 'all') {
    return null;
  }
  return NOTIFICATION_TYPES_BY_FILTER[filter];
}

/**
 * Per-category totals for the filter rail and the mobile chip row.
 *
 * Counted here for the same reason the list is filtered here: counting the
 * loaded page told the reader they had no reactions when they had eleven,
 * which is worse than showing no number at all. Reaction rows are collapsed
 * per feed event so a badge matches the rows the list will actually render.
 */
export const getMyNotificationCounts = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return null;
    }

    const scanned = await ctx.db
      .query('inAppNotifications')
      .withIndex('by_user_created', (q) => q.eq('userId', viewer._id))
      .order('desc')
      .take(COUNT_SCAN_LIMIT + 1);

    const rows = scanned.slice(0, COUNT_SCAN_LIMIT);
    const counts: Record<
      NotificationFilter,
      { total: number; unread: number }
    > = {
      all: { total: 0, unread: 0 },
      reactions: { total: 0, unread: 0 },
      results: { total: 0, unread: 0 },
      locked: { total: 0, unread: 0 },
      announcements: { total: 0, unread: 0 },
    };

    // One reaction thread is one row in the list, so it is one here too. Its
    // unread-ness is the thread's: unread if any row in it is.
    const reactionThreads = new Map<string, { unread: boolean }>();

    for (const row of rows) {
      if (row.type === 'rev_received' && row.feedEventId) {
        const thread = reactionThreads.get(row.feedEventId);
        if (thread) {
          thread.unread ||= !row.readAt;
          continue;
        }
        reactionThreads.set(row.feedEventId, { unread: !row.readAt });
        continue;
      }
      for (const filter of NOTIFICATION_FILTER_VALUES) {
        const types = notificationTypesForFilter(filter);
        if (types && !types.includes(row.type)) {
          continue;
        }
        counts[filter].total += 1;
        if (!row.readAt) {
          counts[filter].unread += 1;
        }
      }
    }

    for (const thread of reactionThreads.values()) {
      for (const filter of ['all', 'reactions'] as const) {
        counts[filter].total += 1;
        if (thread.unread) {
          counts[filter].unread += 1;
        }
      }
    }

    return { counts, truncated: scanned.length > COUNT_SCAN_LIMIT };
  },
});

/**
 * Unread total for the header bell and the page heading, independent of how far
 * the reader has paged. Reads only unread rows off `by_user_unread`, so it stays
 * cheap as history grows.
 */
export const getMyUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return null;
    }

    const unread = await ctx.db
      .query('inAppNotifications')
      .withIndex('by_user_unread', (q) =>
        q.eq('userId', viewer._id).eq('readAt', undefined),
      )
      .take(UNREAD_COUNT_LIMIT + 1);

    return {
      count: countGrouped(unread.slice(0, UNREAD_COUNT_LIMIT)),
      // The badge renders "99+" rather than claiming a precise number it did
      // not count.
      hasMore: unread.length > UNREAD_COUNT_LIMIT,
    };
  },
});

// ============ Public mutations ============

export const markAllRead = mutation({
  args: {},
  handler: async (ctx) => {
    const viewer = requireViewer(await getViewer(ctx));
    const now = Date.now();

    // Everything unread, not just the newest page: the reader can now page
    // back through their whole history, so "mark all read" has to mean all.
    const unread = await ctx.db
      .query('inAppNotifications')
      .withIndex('by_user_unread', (q) =>
        q.eq('userId', viewer._id).eq('readAt', undefined),
      )
      .take(MARK_ALL_READ_LIMIT);

    for (const n of unread) {
      await ctx.db.patch(n._id, { readAt: now });
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

/** Called after a user adds their first reaction to a feed event. */
export const createRevNotification = internalMutation({
  args: {
    recipientUserId: v.id('users'),
    actorUserId: v.id('users'),
    feedEventId: v.id('feedEvents'),
    reactionType: v.optional(reactionTypeValidator),
    raceId: v.optional(v.id('races')),
    sessionType: v.optional(sessionTypeValidator),
    raceName: v.optional(v.string()),
    raceSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Don't notify when someone reacts to their own post.
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
      reactionType: args.reactionType ?? DEFAULT_REACTION_TYPE,
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
      reactionType: args.reactionType ?? DEFAULT_REACTION_TYPE,
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
      // Quietly keep the points current. Don't reset readAt: silent
      // corrections shouldn't re-surface this — official amendments announce
      // themselves through a dedicated results_amended notification instead.
      await ctx.db.patch(existing._id, {
        points: args.points,
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

/**
 * Notify everyone who predicted a session that its results were officially
 * amended (e.g. a stewards' decision changed the classification). Scheduled
 * from results.checkScoringComplete after rescoring finishes, so the points
 * on the notification are the corrected ones. Upserts one notification per
 * user/race/session and re-surfaces it as unread on repeat amendments.
 */
export const notifyResultsAmended = internalMutation({
  args: {
    raceId: v.id('races'),
    sessionType: sessionTypeValidator,
    amendmentNote: v.string(),
  },
  handler: async (ctx, args) => {
    const race = await ctx.db.get(args.raceId);
    if (!race) {
      return;
    }

    const now = Date.now();

    for await (const prediction of ctx.db
      .query('predictions')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )) {
      const score = await ctx.db
        .query('scores')
        .withIndex('by_user_race_session', (q) =>
          q
            .eq('userId', prediction.userId)
            .eq('raceId', args.raceId)
            .eq('sessionType', args.sessionType),
        )
        .unique();

      const existing = await ctx.db
        .query('inAppNotifications')
        .withIndex('by_user_type_raceId_and_sessionType', (q) =>
          q
            .eq('userId', prediction.userId)
            .eq('type', 'results_amended')
            .eq('raceId', args.raceId)
            .eq('sessionType', args.sessionType),
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          amendmentNote: args.amendmentNote,
          points: score?.points,
          readAt: undefined, // a new amendment re-surfaces the notification
          createdAt: now,
        });
      } else {
        await ctx.db.insert('inAppNotifications', {
          userId: prediction.userId,
          type: 'results_amended',
          raceId: args.raceId,
          sessionType: args.sessionType,
          raceName: race.name,
          raceSlug: race.slug,
          points: score?.points,
          amendmentNote: args.amendmentNote,
          createdAt: now,
        });
      }
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

const BROADCAST_BATCH_SIZE = 100;

/**
 * Send a one-off announcement to every player, in batches so each transaction
 * stays small. Used for site-wide news that isn't tied to one race — e.g.
 * explaining a bulk rescore after a policy change.
 *
 * Run via:
 *   npx convex run --prod inAppNotifications:broadcastAnnouncement \
 *     '{"title":"...","body":"...","linkPath":"/results-policy"}'
 */
export const broadcastAnnouncement = internalMutation({
  args: {
    title: v.string(),
    body: v.string(),
    linkPath: v.optional(v.string()),
    cursor: v.optional(v.union(v.string(), v.null())),
    sent: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<{ sent: number; done: boolean }> => {
    const page = await ctx.db.query('users').paginate({
      numItems: BROADCAST_BATCH_SIZE,
      cursor: args.cursor ?? null,
    });

    const now = Date.now();
    let sent = args.sent ?? 0;

    for (const user of page.page) {
      // Skip accounts already queued for deletion.
      if (user.deletingAt !== undefined) {
        continue;
      }
      await ctx.db.insert('inAppNotifications', {
        userId: user._id,
        type: 'announcement',
        title: args.title,
        body: args.body,
        linkPath: args.linkPath,
        createdAt: now,
      });
      sent += 1;
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.inAppNotifications.broadcastAnnouncement,
        {
          title: args.title,
          body: args.body,
          linkPath: args.linkPath,
          cursor: page.continueCursor,
          sent,
        },
      );
    }

    return { sent, done: page.isDone };
  },
});

const LOCK_CLEANUP_BATCH_SIZE = 100;

/**
 * Drop the "picks are locked" notifications for a session once its results are
 * published. The lock notice exists to point players at their friends' picks
 * while they wait; once the result is in, the results notification supersedes
 * it and leaving both just clutters the bell.
 *
 * Delete-only and idempotent, so it is safe to run on a rescore too.
 */
export const clearSessionLockedNotifications = internalMutation({
  args: {
    raceId: v.id('races'),
    sessionType: sessionTypeValidator,
  },
  handler: async (ctx, args): Promise<{ deleted: number }> => {
    const stale: Array<Id<'inAppNotifications'>> = [];

    for await (const notification of ctx.db
      .query('inAppNotifications')
      .withIndex('by_raceId_and_sessionType', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )) {
      if (notification.type !== 'session_locked') {
        continue;
      }
      stale.push(notification._id);
      if (stale.length >= LOCK_CLEANUP_BATCH_SIZE) {
        break;
      }
    }

    for (const id of stale) {
      await ctx.db.delete(id);
    }

    // More than one batch's worth: continue in a fresh transaction.
    if (stale.length === LOCK_CLEANUP_BATCH_SIZE) {
      await ctx.scheduler.runAfter(
        0,
        internal.inAppNotifications.clearSessionLockedNotifications,
        args,
      );
    }

    return { deleted: stale.length };
  },
});

/**
 * One-off: clear lock notices for sessions whose results were published before
 * `clearSessionLockedNotifications` started running at publish time.
 * Dry run by default; pass `"apply": true` to delete.
 */
export const backfillClearSessionLockedNotifications = internalMutation({
  args: { season: v.number(), apply: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const races = await ctx.db
      .query('races')
      .withIndex('by_season_round', (q) => q.eq('season', args.season))
      .take(30);

    let matched = 0;
    let deleted = 0;
    const perSession: Array<{
      race: string;
      sessionType: string;
      count: number;
    }> = [];

    for (const race of races) {
      const results = await ctx.db
        .query('results')
        .withIndex('by_race_session', (q) => q.eq('raceId', race._id))
        .take(8);

      for (const result of results) {
        let count = 0;
        for await (const notification of ctx.db
          .query('inAppNotifications')
          .withIndex('by_raceId_and_sessionType', (q) =>
            q.eq('raceId', race._id).eq('sessionType', result.sessionType),
          )) {
          if (notification.type !== 'session_locked') {
            continue;
          }
          count += 1;
          matched += 1;
          if (args.apply) {
            await ctx.db.delete(notification._id);
            deleted += 1;
          }
        }
        if (count > 0) {
          perSession.push({
            race: race.name,
            sessionType: result.sessionType,
            count,
          });
        }
      }
    }

    return { dryRun: !args.apply, matched, deleted, perSession };
  },
});
