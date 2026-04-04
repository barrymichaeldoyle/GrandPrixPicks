import type { SessionType } from '@grandprixpicks/shared/sessions';
import type { FunctionReference } from 'convex/server';
import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { internalMutation, mutation, query } from './_generated/server';
import {
  deriveClerkSubjectFromStoredId,
  findUserByClerkIdentity,
  getOrCreateViewer,
  getViewer,
  isAdmin,
  requireAdmin,
  requireViewer,
} from './lib/auth';
import { streamRankedLeaderboardRows } from './lib/leaderboard';
import {
  STANDINGS_SYNC_BATCH_SIZE,
  STANDINGS_SYNC_STEPS,
  nextStandingsSyncStep,
  normalizeStandingsSyncFields,
  syncUserToStandings,
  type StandingsSyncFields,
  type StandingsSyncStep,
} from './lib/standings';

type AccountDeletionSummary = {
  follows: number;
  supportRequests: number;
  userSeasonPasses: number;
  pushSubscriptions: number;
  processedPaddleWebhookEvents: number;
  predictions: number;
  h2hPredictions: number;
  scores: number;
  h2hScores: number;
  seasonStandings: number;
  h2hSeasonStandings: number;
  leagueMemberships: number;
  leaguesDeleted: number;
  leaguesReassigned: number;
  leagueAdminsPromoted: number;
  users: number;
};

const DELETION_BATCH_SIZE = 200;
const CLERK_SUBJECT_BACKFILL_BATCH_SIZE = 100;
const standingsSyncFieldsValidator = v.object({
  username: v.optional(v.string()),
  displayName: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
});
const standingsSyncStepValidator = v.union(
  ...STANDINGS_SYNC_STEPS.map((step) => v.literal(step)),
);
const DELETION_STEPS = [
  'follows_as_follower',
  'follows_as_followee',
  'support_requests',
  'user_season_passes',
  'push_subscriptions',
  'processed_paddle_webhook_events',
  'predictions',
  'h2h_predictions',
  'scores',
  'h2h_scores',
  'season_standings',
  'h2h_season_standings',
  'cleanup_leagues',
  'delete_user',
] as const;

type AccountDeletionStep = (typeof DELETION_STEPS)[number];

const accountDeletionSummaryValidator = v.object({
  follows: v.number(),
  supportRequests: v.number(),
  userSeasonPasses: v.number(),
  pushSubscriptions: v.number(),
  processedPaddleWebhookEvents: v.number(),
  predictions: v.number(),
  h2hPredictions: v.number(),
  scores: v.number(),
  h2hScores: v.number(),
  seasonStandings: v.number(),
  h2hSeasonStandings: v.number(),
  leagueMemberships: v.number(),
  leaguesDeleted: v.number(),
  leaguesReassigned: v.number(),
  leagueAdminsPromoted: v.number(),
  users: v.number(),
});

const accountDeletionStepValidator = v.union(
  ...DELETION_STEPS.map((step) => v.literal(step)),
);

function emptyDeletionSummary(): AccountDeletionSummary {
  return {
    follows: 0,
    supportRequests: 0,
    userSeasonPasses: 0,
    pushSubscriptions: 0,
    processedPaddleWebhookEvents: 0,
    predictions: 0,
    h2hPredictions: 0,
    scores: 0,
    h2hScores: 0,
    seasonStandings: 0,
    h2hSeasonStandings: 0,
    leagueMemberships: 0,
    leaguesDeleted: 0,
    leaguesReassigned: 0,
    leagueAdminsPromoted: 0,
    users: 0,
  };
}

async function patchRows<T extends { _id: string }>(
  ctx: MutationCtx,
  rows: Array<T>,
  patch: StandingsSyncFields,
) {
  for (const row of rows) {
    await ctx.db.patch(row._id as never, patch);
  }
}

async function getCurrentSeason(ctx: Pick<QueryCtx, 'db'>) {
  const now = Date.now();
  const nextUpcomingRace = await ctx.db
    .query('races')
    .withIndex('by_status_and_predictionLockAt', (q) =>
      q.eq('status', 'upcoming').gt('predictionLockAt', now),
    )
    .first();
  if (nextUpcomingRace) {
    return nextUpcomingRace.season;
  }

  const latestRace = await ctx.db
    .query('races')
    .withIndex('by_raceStartAt')
    .order('desc')
    .first();
  return latestRace?.season ?? 2026;
}

async function deleteRows<T extends { _id: string }>(
  ctx: MutationCtx,
  rows: Array<T>,
): Promise<number> {
  for (const row of rows) {
    await ctx.db.delete(row._id as never);
  }
  return rows.length;
}

async function loadLeagueMembers(
  ctx: MutationCtx,
  leagueId: Id<'leagues'>,
) {
  const members = [];
  for await (const member of ctx.db
    .query('leagueMembers')
    .withIndex('by_league', (q) => q.eq('leagueId', leagueId))) {
    members.push(member);
  }
  return members;
}

async function scheduleDeletionBatch(
  ctx: MutationCtx,
  args: {
    userId: Id<'users'>;
    clerkUserId: string;
    step: AccountDeletionStep;
    summary: AccountDeletionSummary;
  },
) {
  await ctx.scheduler.runAfter(0, internal.users.processUserDeletionBatch, args);
}

async function processDeletionStep(
  ctx: MutationCtx,
  args: {
    userId: Id<'users'>;
    clerkUserId: string;
    step: AccountDeletionStep;
    summary: AccountDeletionSummary;
  },
): Promise<{
  summary: AccountDeletionSummary;
  repeatCurrentStep: boolean;
  nextStep: AccountDeletionStep | null;
}> {
  const summary = { ...args.summary };

  switch (args.step) {
    case 'follows_as_follower': {
      const rows = await ctx.db
        .query('follows')
        .withIndex('by_follower', (q) => q.eq('followerId', args.userId))
        .take(DELETION_BATCH_SIZE);
      summary.follows += await deleteRows(ctx, rows);
      return {
        summary,
        repeatCurrentStep: rows.length === DELETION_BATCH_SIZE,
        nextStep: 'follows_as_followee',
      };
    }
    case 'follows_as_followee': {
      const rows = await ctx.db
        .query('follows')
        .withIndex('by_followee', (q) => q.eq('followeeId', args.userId))
        .take(DELETION_BATCH_SIZE);
      summary.follows += await deleteRows(ctx, rows);
      return {
        summary,
        repeatCurrentStep: rows.length === DELETION_BATCH_SIZE,
        nextStep: 'support_requests',
      };
    }
    case 'support_requests': {
      const rows = await ctx.db
        .query('supportRequests')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .take(DELETION_BATCH_SIZE);
      summary.supportRequests += await deleteRows(ctx, rows);
      return {
        summary,
        repeatCurrentStep: rows.length === DELETION_BATCH_SIZE,
        nextStep: 'user_season_passes',
      };
    }
    case 'user_season_passes': {
      const rows = await ctx.db
        .query('userSeasonPasses')
        .withIndex('by_user_season', (q) => q.eq('userId', args.userId))
        .take(DELETION_BATCH_SIZE);
      summary.userSeasonPasses += await deleteRows(ctx, rows);
      return {
        summary,
        repeatCurrentStep: rows.length === DELETION_BATCH_SIZE,
        nextStep: 'push_subscriptions',
      };
    }
    case 'push_subscriptions': {
      const rows = await ctx.db
        .query('pushSubscriptions')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .take(DELETION_BATCH_SIZE);
      summary.pushSubscriptions += await deleteRows(ctx, rows);
      return {
        summary,
        repeatCurrentStep: rows.length === DELETION_BATCH_SIZE,
        nextStep: 'processed_paddle_webhook_events',
      };
    }
    case 'processed_paddle_webhook_events': {
      const rows = await ctx.db
        .query('processedPaddleWebhookEvents')
        .withIndex('by_clerkUserId', (q) =>
          q.eq('clerkUserId', args.clerkUserId),
        )
        .take(DELETION_BATCH_SIZE);
      summary.processedPaddleWebhookEvents += await deleteRows(ctx, rows);
      return {
        summary,
        repeatCurrentStep: rows.length === DELETION_BATCH_SIZE,
        nextStep: 'predictions',
      };
    }
    case 'predictions': {
      const rows = await ctx.db
        .query('predictions')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .take(DELETION_BATCH_SIZE);
      summary.predictions += await deleteRows(ctx, rows);
      return {
        summary,
        repeatCurrentStep: rows.length === DELETION_BATCH_SIZE,
        nextStep: 'h2h_predictions',
      };
    }
    case 'h2h_predictions': {
      const rows = await ctx.db
        .query('h2hPredictions')
        .withIndex('by_user_race_session', (q) => q.eq('userId', args.userId))
        .take(DELETION_BATCH_SIZE);
      summary.h2hPredictions += await deleteRows(ctx, rows);
      return {
        summary,
        repeatCurrentStep: rows.length === DELETION_BATCH_SIZE,
        nextStep: 'scores',
      };
    }
    case 'scores': {
      const rows = await ctx.db
        .query('scores')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .take(DELETION_BATCH_SIZE);
      summary.scores += await deleteRows(ctx, rows);
      return {
        summary,
        repeatCurrentStep: rows.length === DELETION_BATCH_SIZE,
        nextStep: 'h2h_scores',
      };
    }
    case 'h2h_scores': {
      const rows = await ctx.db
        .query('h2hScores')
        .withIndex('by_user', (q) => q.eq('userId', args.userId))
        .take(DELETION_BATCH_SIZE);
      summary.h2hScores += await deleteRows(ctx, rows);
      return {
        summary,
        repeatCurrentStep: rows.length === DELETION_BATCH_SIZE,
        nextStep: 'season_standings',
      };
    }
    case 'season_standings': {
      const rows = await ctx.db
        .query('seasonStandings')
        .withIndex('by_user_season', (q) => q.eq('userId', args.userId))
        .take(DELETION_BATCH_SIZE);
      summary.seasonStandings += await deleteRows(ctx, rows);
      return {
        summary,
        repeatCurrentStep: rows.length === DELETION_BATCH_SIZE,
        nextStep: 'h2h_season_standings',
      };
    }
    case 'h2h_season_standings': {
      const rows = await ctx.db
        .query('h2hSeasonStandings')
        .withIndex('by_user_season', (q) => q.eq('userId', args.userId))
        .take(DELETION_BATCH_SIZE);
      summary.h2hSeasonStandings += await deleteRows(ctx, rows);
      return {
        summary,
        repeatCurrentStep: rows.length === DELETION_BATCH_SIZE,
        nextStep: 'cleanup_leagues',
      };
    }
    case 'cleanup_leagues': {
      await cleanupLeagueStateForDeletedUser(ctx, args.userId, summary);
      return {
        summary,
        repeatCurrentStep: false,
        nextStep: 'delete_user',
      };
    }
    case 'delete_user': {
      const user = await ctx.db.get(args.userId);
      if (user) {
        await ctx.db.delete(args.userId);
        summary.users = 1;
      }
      return {
        summary,
        repeatCurrentStep: false,
        nextStep: null,
      };
    }
  }
}

export async function startUserDeletion(
  ctx: MutationCtx,
  user: {
    _id: Id<'users'>;
    clerkUserId: string;
    deletingAt?: number;
  },
) {
  if (user.deletingAt) {
    return { scheduled: false as const, alreadyScheduled: true as const };
  }

  await ctx.db.patch(user._id, {
    deletingAt: Date.now(),
    updatedAt: Date.now(),
  });
  await scheduleDeletionBatch(ctx, {
    userId: user._id,
    clerkUserId: user.clerkUserId,
    step: 'follows_as_follower',
    summary: emptyDeletionSummary(),
  });

  return { scheduled: true as const, alreadyScheduled: false as const };
}

async function cleanupLeagueStateForDeletedUser(
  ctx: MutationCtx,
  userId: Id<'users'>,
  summary: AccountDeletionSummary,
) {
  const now = Date.now();
  const processedLeagueIds = new Set<string>();
  const memberships = [];
  for await (const membership of ctx.db
    .query('leagueMembers')
    .withIndex('by_user', (q) => q.eq('userId', userId))) {
    memberships.push(membership);
  }

  for (const membership of memberships) {
    const league = await ctx.db.get(membership.leagueId);
    if (!league) {
      await ctx.db.delete(membership._id);
      summary.leagueMemberships += 1;
      continue;
    }

    processedLeagueIds.add(String(league._id));

    const members = await loadLeagueMembers(ctx, league._id);

    const otherMembers = members.filter((m) => m.userId !== userId);
    let adminCount = otherMembers.filter((m) => m.role === 'admin').length;

    if (membership.role === 'admin' && otherMembers.length > 0) {
      if (adminCount === 0) {
        const promote = [...otherMembers].sort(
          (a, b) => a.joinedAt - b.joinedAt,
        )[0];
        if (promote.role !== 'admin') {
          await ctx.db.patch(promote._id, { role: 'admin' });
          summary.leagueAdminsPromoted += 1;
          adminCount += 1;
        }
      }
    }

    await ctx.db.delete(membership._id);
    summary.leagueMemberships += 1;

    const remainingMembers = await loadLeagueMembers(ctx, league._id);

    if (remainingMembers.length === 0) {
      await ctx.db.delete(league._id);
      summary.leaguesDeleted += 1;
      continue;
    }

    if (
      league.createdBy === userId ||
      !remainingMembers.some((m) => m.userId === league.createdBy)
    ) {
      const replacement =
        remainingMembers.find((m) => m.role === 'admin') ?? remainingMembers[0];
      if (replacement.userId !== league.createdBy) {
        await ctx.db.patch(league._id, {
          createdBy: replacement.userId,
          memberCount: remainingMembers.length,
          adminCount,
          updatedAt: now,
        });
        summary.leaguesReassigned += 1;
      } else {
        await ctx.db.patch(league._id, {
          memberCount: remainingMembers.length,
          adminCount,
          updatedAt: now,
        });
      }
    } else {
      await ctx.db.patch(league._id, {
        memberCount: remainingMembers.length,
        adminCount,
        updatedAt: now,
      });
    }
  }

  // Handle leagues created by this user where they are no longer a member.
  for await (const league of ctx.db
    .query('leagues')
    .withIndex('by_createdBy', (q) => q.eq('createdBy', userId))) {
    if (processedLeagueIds.has(String(league._id))) {
      continue;
    }

    const members = await loadLeagueMembers(ctx, league._id);

    if (members.length === 0) {
      await ctx.db.delete(league._id);
      summary.leaguesDeleted += 1;
      continue;
    }

    const replacement = members.find((m) => m.role === 'admin') ?? members[0];
    const adminCount = members.filter((m) => m.role === 'admin').length;
    if (replacement.userId !== league.createdBy) {
      await ctx.db.patch(league._id, {
        createdBy: replacement.userId,
        memberCount: members.length,
        adminCount,
        updatedAt: now,
      });
      summary.leaguesReassigned += 1;
    } else {
      await ctx.db.patch(league._id, {
        memberCount: members.length,
        adminCount,
        updatedAt: now,
      });
    }
  }
}

export const processUserDeletionBatch = internalMutation({
  args: {
    userId: v.id('users'),
    clerkUserId: v.string(),
    step: accountDeletionStepValidator,
    summary: accountDeletionSummaryValidator,
  },
  handler: async (ctx, args) => {
    const result = await processDeletionStep(ctx, args);
    const nextStep = result.repeatCurrentStep ? args.step : result.nextStep;

    if (nextStep) {
      await scheduleDeletionBatch(ctx, {
        userId: args.userId,
        clerkUserId: args.clerkUserId,
        step: nextStep,
        summary: result.summary,
      });
      return {
        completed: false as const,
        scheduledStep: nextStep,
        summary: result.summary,
      };
    }

    return {
      completed: true as const,
      scheduledStep: null,
      summary: result.summary,
    };
  },
});

export const me = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return null;
    }

    return {
      _id: viewer._id,
      username: viewer.username,
      displayName: viewer.displayName,
      email: viewer.email,
      avatarUrl: viewer.avatarUrl,
      usernameChangedAt: viewer.usernameChangedAt,
      emailPredictionReminders: viewer.emailPredictionReminders,
      emailResults: viewer.emailResults,
      pushPredictionReminders: viewer.pushPredictionReminders,
      pushResults: viewer.pushResults,
      pushSessionLocked: viewer.pushSessionLocked,
      pushRevReceived: viewer.pushRevReceived,
      timezone: viewer.timezone,
      locale: viewer.locale,
      isAdmin: viewer.isAdmin ?? false,
    };
  },
});

/** Sync the current user's profile from Clerk identity claims. */
export const syncProfile = mutation({
  args: {
    timezone: v.optional(v.string()),
    locale: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await getOrCreateViewer(ctx, {
      timezone: args.timezone,
      locale: args.locale,
    });
  },
});

export const amIAdmin = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    return isAdmin(viewer);
  },
});

type ProgressByUser = Map<
  string,
  {
    sessions: Set<SessionType>;
    latestSubmittedAt: number;
  }
>;

function requiredSessionsForRace(hasSprint: boolean): Array<SessionType> {
  return hasSprint
    ? ['sprint_quali', 'sprint', 'quali', 'race']
    : ['quali', 'race'];
}

type AdminStatusUser = {
  _id: string;
  username?: string;
  displayName?: string;
  email?: string;
};

export function buildAdminPredictionStatus(params: {
  users: Array<AdminStatusUser>;
  requiredSessions: Array<SessionType>;
  top5ByUser: ProgressByUser;
  h2hByUser: ProgressByUser;
}) {
  const users = params.users
    .map((u) => {
      const top5 = params.top5ByUser.get(u._id);
      const h2h = params.h2hByUser.get(u._id);
      const completedSessions = top5?.sessions.size ?? 0;
      const h2hCompletedSessions = h2h?.sessions.size ?? 0;
      const requiredSessionCount = params.requiredSessions.length;
      const hasStarted = completedSessions > 0;
      const hasCompleted = completedSessions === requiredSessionCount;
      const h2hHasStarted = h2hCompletedSessions > 0;
      const h2hHasCompleted = h2hCompletedSessions === requiredSessionCount;
      return {
        userId: u._id,
        username: u.username ?? null,
        displayName: u.displayName ?? null,
        email: u.email ?? null,
        completedSessions,
        requiredSessionCount,
        hasStarted,
        hasCompleted,
        latestSubmittedAt: top5?.latestSubmittedAt ?? null,
        h2hCompletedSessions,
        h2hHasStarted,
        h2hHasCompleted,
        h2hLatestSubmittedAt: h2h?.latestSubmittedAt ?? null,
      };
    })
    .sort((a, b) => {
      if (a.hasCompleted !== b.hasCompleted) {
        return a.hasCompleted ? -1 : 1;
      }
      if (a.completedSessions !== b.completedSessions) {
        return b.completedSessions - a.completedSessions;
      }
      const aLabel = (
        a.displayName ??
        a.username ??
        a.email ??
        ''
      ).toLowerCase();
      const bLabel = (
        b.displayName ??
        b.username ??
        b.email ??
        ''
      ).toLowerCase();
      return aLabel.localeCompare(bLabel);
    });

  const totalUsers = users.length;
  const usersStarted = users.filter((u) => u.hasStarted).length;
  const usersCompleted = users.filter((u) => u.hasCompleted).length;
  const h2hUsersStarted = users.filter((u) => u.h2hHasStarted).length;
  const h2hUsersCompleted = users.filter((u) => u.h2hHasCompleted).length;

  return {
    users,
    totals: {
      totalUsers,
      usersStarted,
      usersCompleted,
      usersPending: totalUsers - usersCompleted,
      h2hUsersStarted,
      h2hUsersCompleted,
      h2hUsersPending: totalUsers - h2hUsersCompleted,
    },
  };
}

export const adminPredictionStatusForRace = query({
  args: { raceId: v.id('races') },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    requireAdmin(viewer);

    const race = await ctx.db.get(args.raceId);
    if (!race) {
      throw new Error('Race not found');
    }

    const requiredSessions = requiredSessionsForRace(race.hasSprint ?? false);

    const top5ByUser: ProgressByUser = new Map();
    const h2hByUser: ProgressByUser = new Map();

    for (const sessionType of requiredSessions) {
      for await (const row of ctx.db
        .query('predictions')
        .withIndex('by_race_session', (q) =>
          q.eq('raceId', race._id).eq('sessionType', sessionType),
        )) {
        const key = row.userId as string;
        const existing = top5ByUser.get(key) ?? {
          sessions: new Set<SessionType>(),
          latestSubmittedAt: 0,
        };
        existing.sessions.add(sessionType);
        existing.latestSubmittedAt = Math.max(
          existing.latestSubmittedAt,
          row.updatedAt,
        );
        top5ByUser.set(key, existing);
      }
    }

    for (const sessionType of requiredSessions) {
      for await (const row of ctx.db
        .query('h2hPredictions')
        .withIndex('by_race_session', (q) =>
          q.eq('raceId', race._id).eq('sessionType', sessionType),
        )) {
        const key = row.userId as string;
        const existing = h2hByUser.get(key) ?? {
          sessions: new Set<SessionType>(),
          latestSubmittedAt: 0,
        };
        existing.sessions.add(sessionType);
        existing.latestSubmittedAt = Math.max(
          existing.latestSubmittedAt,
          row.updatedAt,
        );
        h2hByUser.set(key, existing);
      }
    }

    const users = [];
    for await (const user of ctx.db.query('users')) {
      users.push({
        _id: user._id as string,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
      });
    }

    const status = buildAdminPredictionStatus({
      users,
      requiredSessions,
      top5ByUser,
      h2hByUser,
    });

    return {
      race: {
        _id: race._id,
        name: race.name,
        round: race.round,
        hasSprint: race.hasSprint ?? false,
      },
      requiredSessions,
      totals: status.totals,
      users: status.users,
    };
  },
});

export const getProfileByUsername = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);

    const user = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', args.username))
      .unique();

    if (!user) {
      return null;
    }

    return {
      _id: user._id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      isOwner: viewer ? user._id === viewer._id : false,
    };
  },
});

export const getUserStats = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    // Count unique race weekends with predictions
    const weekendRaceIds = new Set<Id<'races'>>();
    for await (const prediction of ctx.db
      .query('predictions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))) {
      weekendRaceIds.add(prediction.raceId);
    }
    const weekendCount = weekendRaceIds.size;

    // Read from materialized standings instead of full table scans
    const season = await getCurrentSeason(ctx);

    // Top 5 rank from seasonStandings
    const userStanding = await ctx.db
      .query('seasonStandings')
      .withIndex('by_user_season', (q) =>
        q.eq('userId', args.userId).eq('season', season),
      )
      .unique();

    const totalPoints = userStanding?.totalPoints ?? 0;
    const scoredWeekends = userStanding?.raceCount ?? 0;

    const seasonRanked = await streamRankedLeaderboardRows(
      ctx.db
        .query('seasonStandings')
        .withIndex('by_season_points', (q) => q.eq('season', season))
        .order('desc'),
      { offset: 0, limit: 1, viewerId: args.userId },
    );
    const seasonRank = seasonRanked.viewerRank;
    const totalPlayers = seasonRanked.totalCount;

    // H2H rank from h2hSeasonStandings
    const h2hRanked = await streamRankedLeaderboardRows(
      ctx.db
        .query('h2hSeasonStandings')
        .withIndex('by_season_points', (q) => q.eq('season', season))
        .order('desc'),
      { offset: 0, limit: 1, viewerId: args.userId },
    );
    const h2hSeasonRank = h2hRanked.viewerRank;
    const h2hTotalPlayers = h2hRanked.totalCount;

    return {
      totalPoints,
      weekendCount,
      scoredWeekends,
      seasonRank,
      totalPlayers,
      h2hSeasonRank,
      h2hTotalPlayers,
    };
  },
});

export const hasSeasonPassForSeason = query({
  args: { season: v.number() },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return false;
    }

    const pass = await ctx.db
      .query('userSeasonPasses')
      .withIndex('by_user_season', (q) =>
        q.eq('userId', viewer._id).eq('season', args.season),
      )
      .unique();

    return !!pass;
  },
});

export const updateNotificationSettings = mutation({
  args: {
    emailPredictionReminders: v.optional(v.boolean()),
    emailResults: v.optional(v.boolean()),
    pushPredictionReminders: v.optional(v.boolean()),
    pushResults: v.optional(v.boolean()),
    pushSessionLocked: v.optional(v.boolean()),
    pushRevReceived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));
    await ctx.db.patch(viewer._id, { ...args, updatedAt: Date.now() });
  },
});

export const updateRegionalSettings = mutation({
  args: {
    timezone: v.optional(v.union(v.string(), v.null())),
    locale: v.optional(v.union(v.string(), v.null())),
  },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.timezone !== undefined) {
      if (args.timezone === null) {
        patch.timezone = undefined; // Clear to use browser default
      } else {
        try {
          Intl.DateTimeFormat(undefined, { timeZone: args.timezone });
        } catch {
          throw new Error(`Invalid timezone: ${args.timezone}`);
        }
        patch.timezone = args.timezone;
      }
    }
    if (args.locale !== undefined) {
      if (args.locale === null) {
        patch.locale = undefined; // Clear to use browser default
      } else {
        try {
          new Intl.DateTimeFormat(args.locale);
        } catch {
          throw new Error(`Invalid locale: ${args.locale}`);
        }
        patch.locale = args.locale;
      }
    }
    await ctx.db.patch(viewer._id, patch);
  },
});

/** Combined profile + stats data for OG image generation (avoids two round-trips). */
export const getProfileOgData = query({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', args.username))
      .unique();

    if (!user) {
      return null;
    }

    const season = await getCurrentSeason(ctx);

    // Count unique race weekends with predictions
    const weekendRaceIds = new Set<Id<'races'>>();
    for await (const prediction of ctx.db
      .query('predictions')
      .withIndex('by_user', (q) => q.eq('userId', user._id))) {
      weekendRaceIds.add(prediction.raceId);
    }
    const weekendCount = weekendRaceIds.size;

    // Get season standing
    const userStanding = await ctx.db
      .query('seasonStandings')
      .withIndex('by_user_season', (q) =>
        q.eq('userId', user._id).eq('season', season),
      )
      .unique();

    const totalPoints = userStanding?.totalPoints ?? 0;

    // Compute rank
    const ranked = await streamRankedLeaderboardRows(
      ctx.db
        .query('seasonStandings')
        .withIndex('by_season_points', (q) => q.eq('season', season))
        .order('desc'),
      { offset: 0, limit: 1, viewerId: user._id },
    );
    const seasonRank = ranked.viewerRank;

    return {
      displayName: user.displayName ?? user.username ?? 'Anonymous',
      username: user.username ?? 'anonymous',
      avatarUrl: user.avatarUrl,
      totalPoints,
      seasonRank,
      totalPlayers: ranked.totalCount,
      weekendCount,
    };
  },
});

const USERNAME_REGEX = /^[a-z0-9_-]+$/;
const USERNAME_COOLDOWN_MS = 90 * 24 * 60 * 60 * 1000;

export const updateProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));
    const now = Date.now();

    const patch: Record<string, unknown> = { updatedAt: now };

    // Validate display name
    if (args.displayName !== undefined) {
      const trimmed = args.displayName.trim();
      if (trimmed.length < 1 || trimmed.length > 50) {
        throw new Error('Display name must be between 1 and 50 characters');
      }
      patch.displayName = trimmed;
    }

    // Validate and update username
    if (args.username !== undefined) {
      const trimmed = args.username.trim().toLowerCase();

      if (trimmed !== viewer.username) {
        if (trimmed.length < 3 || trimmed.length > 30) {
          throw new Error('Username must be between 3 and 30 characters');
        }
        if (!USERNAME_REGEX.test(trimmed)) {
          throw new Error(
            'Username can only contain lowercase letters, numbers, underscores, and hyphens',
          );
        }

        // 90-day cooldown
        if (viewer.usernameChangedAt) {
          const elapsed = now - viewer.usernameChangedAt;
          if (elapsed < USERNAME_COOLDOWN_MS) {
            const nextDate = new Date(
              viewer.usernameChangedAt + USERNAME_COOLDOWN_MS,
            );
            throw new Error(
              `You can change your username again on ${nextDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
            );
          }
        }

        // Uniqueness check
        const existing = await ctx.db
          .query('users')
          .withIndex('by_username', (q) => q.eq('username', trimmed))
          .unique();
        if (existing && existing._id !== viewer._id) {
          throw new Error('Username already taken');
        }

        patch.username = trimmed;
        patch.usernameChangedAt = now;
      }
    }

    await ctx.db.patch(viewer._id, patch);

    // Sync denormalized fields to standings if username or displayName changed
    const standingsSync: Record<string, string | undefined> = {};
    if (patch.username) {
      standingsSync.username = patch.username as string;
    }
    if (patch.displayName) {
      standingsSync.displayName = patch.displayName as string;
    }
    if (Object.keys(standingsSync).length > 0) {
      await syncUserToStandings(ctx, viewer._id, standingsSync);
    }

    return { success: true };
  },
});

export const syncUserToStandingsBatch = internalMutation({
  args: {
    userId: v.id('users'),
    fields: standingsSyncFieldsValidator,
    step: standingsSyncStepValidator,
    cursor: v.union(v.string(), v.null()),
  },
  handler: async (ctx, args) => {
    const fields = normalizeStandingsSyncFields(args.fields);
    if (Object.keys(fields).length === 0) {
      return {
        done: true,
        step: args.step,
        patched: 0,
      };
    }

    const paginationOpts = {
      numItems: STANDINGS_SYNC_BATCH_SIZE,
      cursor: args.cursor,
    };
    let patched = 0;

    switch (args.step) {
      case 'season_standings': {
        const page = await ctx.db
          .query('seasonStandings')
          .withIndex('by_user_season', (q) => q.eq('userId', args.userId))
          .paginate(paginationOpts);
        patched = page.page.length;
        await patchRows(ctx, page.page, fields);

        if (!page.isDone) {
          await ctx.scheduler.runAfter(
            0,
            internal.users.syncUserToStandingsBatch,
            {
              userId: args.userId,
              fields,
              step: args.step,
              cursor: page.continueCursor,
            },
          );
          return { done: false, step: args.step, patched: page.page.length };
        }
        break;
      }
      case 'h2h_season_standings': {
        const page = await ctx.db
          .query('h2hSeasonStandings')
          .withIndex('by_user_season', (q) => q.eq('userId', args.userId))
          .paginate(paginationOpts);
        patched = page.page.length;
        await patchRows(ctx, page.page, fields);

        if (!page.isDone) {
          await ctx.scheduler.runAfter(
            0,
            internal.users.syncUserToStandingsBatch,
            {
              userId: args.userId,
              fields,
              step: args.step,
              cursor: page.continueCursor,
            },
          );
          return { done: false, step: args.step, patched: page.page.length };
        }
        break;
      }
      case 'scores': {
        const page = await ctx.db
          .query('scores')
          .withIndex('by_user', (q) => q.eq('userId', args.userId))
          .paginate(paginationOpts);
        patched = page.page.length;
        await patchRows(ctx, page.page, fields);

        if (!page.isDone) {
          await ctx.scheduler.runAfter(
            0,
            internal.users.syncUserToStandingsBatch,
            {
              userId: args.userId,
              fields,
              step: args.step,
              cursor: page.continueCursor,
            },
          );
          return { done: false, step: args.step, patched: page.page.length };
        }
        break;
      }
      default: {
        const exhaustiveCheck: never = args.step;
        return exhaustiveCheck;
      }
    }

    const nextStep = nextStandingsSyncStep(args.step as StandingsSyncStep);
    if (nextStep) {
      await ctx.scheduler.runAfter(0, internal.users.syncUserToStandingsBatch, {
        userId: args.userId,
        fields,
        step: nextStep,
        cursor: null,
      });
    }

    return {
      done: nextStep === null,
      step: args.step,
      patched,
      nextStep,
    };
  },
});

export const deleteUserFromClerkWebhook = mutation({
  args: {
    webhookKey: v.string(),
    clerkUserId: v.string(),
    clerkSubject: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const expectedWebhookKey = process.env.CLERK_CONVEX_WEBHOOK_KEY;
    if (!expectedWebhookKey) {
      throw new Error('Missing CLERK_CONVEX_WEBHOOK_KEY');
    }
    if (args.webhookKey !== expectedWebhookKey) {
      throw new Error('Unauthorized webhook caller');
    }

    const user = await findUserByClerkIdentity(ctx, {
      tokenIdentifier: args.clerkUserId,
      subject: args.clerkSubject,
    });

    if (!user) {
      return { handled: false as const, reason: 'user_not_found' as const };
    }

    const scheduled = await startUserDeletion(ctx, {
      _id: user._id,
      clerkUserId: user.clerkUserId,
      deletingAt: user.deletingAt,
    });

    return {
      handled: true as const,
      userId: user._id,
      scheduled,
    };
  },
});

export const deleteUserFromClerkWebhookInternal = internalMutation({
  args: {
    clerkUserId: v.string(),
    clerkSubject: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await findUserByClerkIdentity(ctx, {
      tokenIdentifier: args.clerkUserId,
      subject: args.clerkSubject,
    });

    if (!user) {
      return { handled: false as const, reason: 'user_not_found' as const };
    }

    const scheduled = await startUserDeletion(ctx, {
      _id: user._id,
      clerkUserId: user.clerkUserId,
      deletingAt: user.deletingAt,
    });

    return {
      handled: true as const,
      userId: user._id,
      scheduled,
    };
  },
});

/**
 * Migration: backfill users.clerkSubject from the existing stored Clerk identifier.
 * Safe to re-run; it only patches rows where the derived subject is missing or stale.
 */
export const backfillClerkSubjects = internalMutation({
  args: {
    startAfter: v.optional(v.string()),
    updated: v.optional(v.number()),
    scanned: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const usersQuery = args.startAfter
      ? ctx.db
          .query('users')
          .withIndex('by_clerkUserId', (q) => q.gt('clerkUserId', args.startAfter!))
      : ctx.db.query('users').withIndex('by_clerkUserId');

    const users = await usersQuery.take(CLERK_SUBJECT_BACKFILL_BATCH_SIZE);
    let updated = args.updated ?? 0;
    let scanned = args.scanned ?? 0;

    for (const user of users) {
      scanned += 1;
      const clerkSubject = deriveClerkSubjectFromStoredId(user.clerkUserId);
      if (user.clerkSubject === clerkSubject) {
        continue;
      }

      await ctx.db.patch(user._id, {
        clerkSubject,
        updatedAt: Date.now(),
      });
      updated += 1;
    }

    const lastUser = users[users.length - 1];
    if (lastUser && users.length === CLERK_SUBJECT_BACKFILL_BATCH_SIZE) {
      await ctx.scheduler.runAfter(
        0,
        'users:backfillClerkSubjects' as unknown as FunctionReference<'mutation'>,
        {
          startAfter: lastUser.clerkUserId,
          updated,
          scanned,
        },
      );
    }

    return {
      updated,
      scanned,
      done: users.length < CLERK_SUBJECT_BACKFILL_BATCH_SIZE,
      nextStartAfter:
        users.length === CLERK_SUBJECT_BACKFILL_BATCH_SIZE
          ? lastUser?.clerkUserId
          : null,
    };
  },
});
