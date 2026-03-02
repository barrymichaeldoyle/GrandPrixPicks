import { v } from 'convex/values';

import { mutation, query } from './_generated/server';
import {
  getOrCreateViewer,
  getViewer,
  isAdmin,
  requireAdmin,
  requireViewer,
} from './lib/auth';
import { syncUserToStandings } from './lib/standings';

const notificationChannelValidator = v.union(
  v.literal('none'),
  v.literal('email'),
  v.literal('push'),
  v.literal('both'),
);

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
      showOnLeaderboard: viewer.showOnLeaderboard,
      emailReminders: viewer.emailReminders,
      emailResults: viewer.emailResults,
      pushReminders: viewer.pushReminders,
      pushResults: viewer.pushResults,
      predictionReminderChannel: viewer.predictionReminderChannel,
      resultsNotificationChannel: viewer.resultsNotificationChannel,
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

type SessionType = 'quali' | 'sprint_quali' | 'sprint' | 'race';
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
      showOnLeaderboard: user.showOnLeaderboard ?? true,
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
    emailReminders: v.optional(v.boolean()),
    emailResults: v.optional(v.boolean()),
    pushReminders: v.optional(v.boolean()),
    pushResults: v.optional(v.boolean()),
    predictionReminderChannel: v.optional(notificationChannelValidator),
    resultsNotificationChannel: v.optional(notificationChannelValidator),
  },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));
    const patch: Record<string, unknown> = { updatedAt: Date.now() };
    if (args.emailReminders !== undefined) {
      patch.emailReminders = args.emailReminders;
    }
    if (args.emailResults !== undefined) {
      patch.emailResults = args.emailResults;
    }
    if (args.pushReminders !== undefined) {
      patch.pushReminders = args.pushReminders;
    }
    if (args.pushResults !== undefined) {
      patch.pushResults = args.pushResults;
    }
    if (args.predictionReminderChannel !== undefined) {
      patch.predictionReminderChannel = args.predictionReminderChannel;
    }
    if (args.resultsNotificationChannel !== undefined) {
      patch.resultsNotificationChannel = args.resultsNotificationChannel;
    }
    await ctx.db.patch(viewer._id, patch);
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

export const updatePrivacySettings = mutation({
  args: { showOnLeaderboard: v.boolean() },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));
    await ctx.db.patch(viewer._id, {
      showOnLeaderboard: args.showOnLeaderboard,
      updatedAt: Date.now(),
    });
    await syncUserToStandings(ctx, viewer._id, {
      showOnLeaderboard: args.showOnLeaderboard,
    });
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

    // Sync denormalized fields to standings if username changed
    const standingsSync: Record<string, string | undefined> = {};
    if (patch.username) {
      standingsSync.username = patch.username as string;
    }
    if (Object.keys(standingsSync).length > 0) {
      await syncUserToStandings(ctx, viewer._id, standingsSync);
    }

    return { success: true };
  },
});
