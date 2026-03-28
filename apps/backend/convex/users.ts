import type { SessionType } from '@grandprixpicks/shared/sessions';
import { v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { internalMutation, mutation, query } from './_generated/server';
import {
  getOrCreateViewer,
  getViewer,
  isAdmin,
  requireAdmin,
  requireViewer,
} from './lib/auth';
import { syncUserToStandings } from './lib/standings';


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

async function cleanupLeagueStateForDeletedUser(
  ctx: MutationCtx,
  userId: Id<'users'>,
  summary: AccountDeletionSummary,
) {
  const now = Date.now();
  const processedLeagueIds = new Set<string>();

  const memberships = await ctx.db
    .query('leagueMembers')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect();

  for (const membership of memberships) {
    const league = await ctx.db.get(membership.leagueId);
    if (!league) {
      await ctx.db.delete(membership._id);
      summary.leagueMemberships += 1;
      continue;
    }

    processedLeagueIds.add(String(league._id));

    const members = await ctx.db
      .query('leagueMembers')
      .withIndex('by_league', (q) => q.eq('leagueId', league._id))
      .collect();

    const otherMembers = members.filter((m) => m.userId !== userId);

    if (membership.role === 'admin' && otherMembers.length > 0) {
      const hasAnotherAdmin = otherMembers.some((m) => m.role === 'admin');
      if (!hasAnotherAdmin) {
        const promote = [...otherMembers].sort(
          (a, b) => a.joinedAt - b.joinedAt,
        )[0];
        if (promote.role !== 'admin') {
          await ctx.db.patch(promote._id, { role: 'admin' });
          summary.leagueAdminsPromoted += 1;
        }
      }
    }

    await ctx.db.delete(membership._id);
    summary.leagueMemberships += 1;

    const remainingMembers = await ctx.db
      .query('leagueMembers')
      .withIndex('by_league', (q) => q.eq('leagueId', league._id))
      .collect();

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
          updatedAt: now,
        });
        summary.leaguesReassigned += 1;
      }
    }
  }

  // Handle leagues created by this user where they are no longer a member.
  const leaguesCreatedByUser = (await ctx.db.query('leagues').collect()).filter(
    (league) => league.createdBy === userId,
  );

  for (const league of leaguesCreatedByUser) {
    if (processedLeagueIds.has(String(league._id))) {
      continue;
    }

    const members = await ctx.db
      .query('leagueMembers')
      .withIndex('by_league', (q) => q.eq('leagueId', league._id))
      .collect();

    if (members.length === 0) {
      await ctx.db.delete(league._id);
      summary.leaguesDeleted += 1;
      continue;
    }

    const replacement = members.find((m) => m.role === 'admin') ?? members[0];
    if (replacement.userId !== league.createdBy) {
      await ctx.db.patch(league._id, {
        createdBy: replacement.userId,
        updatedAt: now,
      });
      summary.leaguesReassigned += 1;
    }
  }
}

async function deleteAllDataForUser(
  ctx: MutationCtx,
  user: {
    _id: Id<'users'>;
    clerkUserId: string;
  },
) {
  const summary: AccountDeletionSummary = {
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

  const followsAsFollower = await ctx.db
    .query('follows')
    .withIndex('by_follower', (q) => q.eq('followerId', user._id))
    .collect();
  const followsAsFollowee = await ctx.db
    .query('follows')
    .withIndex('by_followee', (q) => q.eq('followeeId', user._id))
    .collect();

  const followIds = new Set<string>();
  for (const row of followsAsFollower) {
    followIds.add(String(row._id));
  }
  for (const row of followsAsFollowee) {
    followIds.add(String(row._id));
  }
  for (const followId of followIds) {
    await ctx.db.delete(followId as Id<'follows'>);
  }
  summary.follows = followIds.size;

  const supportRequests = await ctx.db
    .query('supportRequests')
    .withIndex('by_user', (q) => q.eq('userId', user._id))
    .collect();
  for (const row of supportRequests) {
    await ctx.db.delete(row._id);
  }
  summary.supportRequests = supportRequests.length;

  const userSeasonPasses = await ctx.db
    .query('userSeasonPasses')
    .withIndex('by_user_season', (q) => q.eq('userId', user._id))
    .collect();
  for (const row of userSeasonPasses) {
    await ctx.db.delete(row._id);
  }
  summary.userSeasonPasses = userSeasonPasses.length;

  const pushSubscriptions = await ctx.db
    .query('pushSubscriptions')
    .withIndex('by_user', (q) => q.eq('userId', user._id))
    .collect();
  for (const row of pushSubscriptions) {
    await ctx.db.delete(row._id);
  }
  summary.pushSubscriptions = pushSubscriptions.length;

  const processedPaddleWebhookEvents = (
    await ctx.db.query('processedPaddleWebhookEvents').collect()
  ).filter((row) => row.clerkUserId === user.clerkUserId);
  for (const row of processedPaddleWebhookEvents) {
    await ctx.db.delete(row._id);
  }
  summary.processedPaddleWebhookEvents = processedPaddleWebhookEvents.length;

  const predictions = await ctx.db
    .query('predictions')
    .withIndex('by_user', (q) => q.eq('userId', user._id))
    .collect();
  for (const row of predictions) {
    await ctx.db.delete(row._id);
  }
  summary.predictions = predictions.length;

  const h2hPredictions = await ctx.db
    .query('h2hPredictions')
    .withIndex('by_user_race_session', (q) => q.eq('userId', user._id))
    .collect();
  for (const row of h2hPredictions) {
    await ctx.db.delete(row._id);
  }
  summary.h2hPredictions = h2hPredictions.length;

  const scores = await ctx.db
    .query('scores')
    .withIndex('by_user', (q) => q.eq('userId', user._id))
    .collect();
  for (const row of scores) {
    await ctx.db.delete(row._id);
  }
  summary.scores = scores.length;

  const h2hScores = await ctx.db
    .query('h2hScores')
    .withIndex('by_user', (q) => q.eq('userId', user._id))
    .collect();
  for (const row of h2hScores) {
    await ctx.db.delete(row._id);
  }
  summary.h2hScores = h2hScores.length;

  const seasonStandings = await ctx.db
    .query('seasonStandings')
    .withIndex('by_user_season', (q) => q.eq('userId', user._id))
    .collect();
  for (const row of seasonStandings) {
    await ctx.db.delete(row._id);
  }
  summary.seasonStandings = seasonStandings.length;

  const h2hSeasonStandings = await ctx.db
    .query('h2hSeasonStandings')
    .withIndex('by_user_season', (q) => q.eq('userId', user._id))
    .collect();
  for (const row of h2hSeasonStandings) {
    await ctx.db.delete(row._id);
  }
  summary.h2hSeasonStandings = h2hSeasonStandings.length;

  await cleanupLeagueStateForDeletedUser(ctx, user._id, summary);

  await ctx.db.delete(user._id);
  summary.users = 1;

  return summary;
}

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

    const allUsers = await ctx.db.query('users').collect();
    const requiredSessions = requiredSessionsForRace(race.hasSprint ?? false);

    const top5ByUser: ProgressByUser = new Map();
    const h2hByUser: ProgressByUser = new Map();

    for (const sessionType of requiredSessions) {
      const submissions = await ctx.db
        .query('predictions')
        .withIndex('by_race_session', (q) =>
          q.eq('raceId', race._id).eq('sessionType', sessionType),
        )
        .collect();

      for (const row of submissions) {
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
      const submissions = await ctx.db
        .query('h2hPredictions')
        .withIndex('by_race_session', (q) =>
          q.eq('raceId', race._id).eq('sessionType', sessionType),
        )
        .collect();

      for (const row of submissions) {
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

    const status = buildAdminPredictionStatus({
      users: allUsers.map((u) => ({
        _id: u._id as string,
        username: u.username,
        displayName: u.displayName,
        email: u.email,
      })),
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
    const predictions = await ctx.db
      .query('predictions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();
    const weekendRaceIds = new Set(predictions.map((p) => p.raceId));
    const weekendCount = weekendRaceIds.size;

    // Read from materialized standings instead of full table scans
    const season = 2026;

    // Top 5 rank from seasonStandings
    const userStanding = await ctx.db
      .query('seasonStandings')
      .withIndex('by_user_season', (q) =>
        q.eq('userId', args.userId).eq('season', season),
      )
      .unique();

    const totalPoints = userStanding?.totalPoints ?? 0;
    const scoredWeekends = userStanding?.raceCount ?? 0;

    const allStandings = await ctx.db
      .query('seasonStandings')
      .withIndex('by_season_points', (q) => q.eq('season', season))
      .collect();

    const sortedStandings = allStandings.sort(
      (a, b) => b.totalPoints - a.totalPoints,
    );
    const rankIndex = sortedStandings.findIndex(
      (r) => r.userId === args.userId,
    );
    const seasonRank = rankIndex === -1 ? null : rankIndex + 1;
    const totalPlayers = sortedStandings.length;

    // H2H rank from h2hSeasonStandings
    const allH2HStandings = await ctx.db
      .query('h2hSeasonStandings')
      .withIndex('by_season_points', (q) => q.eq('season', season))
      .collect();

    const sortedH2H = allH2HStandings.sort(
      (a, b) => b.totalPoints - a.totalPoints,
    );
    const h2hRankIndex = sortedH2H.findIndex((r) => r.userId === args.userId);
    const h2hSeasonRank = h2hRankIndex === -1 ? null : h2hRankIndex + 1;
    const h2hTotalPlayers = sortedH2H.length;

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

    const season = 2026;

    // Count unique race weekends with predictions
    const predictions = await ctx.db
      .query('predictions')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();
    const weekendCount = new Set(predictions.map((p) => p.raceId)).size;

    // Get season standing
    const userStanding = await ctx.db
      .query('seasonStandings')
      .withIndex('by_user_season', (q) =>
        q.eq('userId', user._id).eq('season', season),
      )
      .unique();

    const totalPoints = userStanding?.totalPoints ?? 0;

    // Compute rank
    const allStandings = await ctx.db
      .query('seasonStandings')
      .withIndex('by_season_points', (q) => q.eq('season', season))
      .collect();

    const sorted = allStandings.sort((a, b) => b.totalPoints - a.totalPoints);
    const rankIndex = sorted.findIndex((r) => r.userId === user._id);
    const seasonRank = rankIndex === -1 ? null : rankIndex + 1;

    return {
      displayName: user.displayName ?? user.username ?? 'Anonymous',
      username: user.username ?? 'anonymous',
      avatarUrl: user.avatarUrl,
      totalPoints,
      seasonRank,
      totalPlayers: sorted.length,
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

export const deleteUserFromClerkWebhook = mutation({
  args: {
    webhookKey: v.string(),
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const expectedWebhookKey = process.env.CLERK_CONVEX_WEBHOOK_KEY;
    if (!expectedWebhookKey) {
      throw new Error('Missing CLERK_CONVEX_WEBHOOK_KEY');
    }
    if (args.webhookKey !== expectedWebhookKey) {
      throw new Error('Unauthorized webhook caller');
    }

    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', args.clerkUserId))
      .unique();

    if (!user) {
      return { handled: false as const, reason: 'user_not_found' as const };
    }

    const deleted = await deleteAllDataForUser(ctx, {
      _id: user._id,
      clerkUserId: user.clerkUserId,
    });

    return {
      handled: true as const,
      userId: user._id,
      deleted,
    };
  },
});

export const deleteUserFromClerkWebhookInternal = internalMutation({
  args: {
    clerkUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', args.clerkUserId))
      .unique();

    if (!user) {
      return { handled: false as const, reason: 'user_not_found' as const };
    }

    const deleted = await deleteAllDataForUser(ctx, {
      _id: user._id,
      clerkUserId: user.clerkUserId,
    });

    return {
      handled: true as const,
      userId: user._id,
      deleted,
    };
  },
});
