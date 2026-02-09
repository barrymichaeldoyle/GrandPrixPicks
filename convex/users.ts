import { v } from 'convex/values';

import { mutation, query } from './_generated/server';
import {
  getOrCreateViewer,
  getViewer,
  isAdmin,
  requireViewer,
} from './lib/auth';
import { syncUserToStandings } from './lib/standings';

export const me = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer) return null;

    return {
      _id: viewer._id,
      username: viewer.username,
      displayName: viewer.displayName,
      email: viewer.email,
      avatarUrl: viewer.avatarUrl,
      usernameChangedAt: viewer.usernameChangedAt,
      showOnLeaderboard: viewer.showOnLeaderboard,
      isAdmin: viewer.isAdmin ?? false,
    };
  },
});

/** Sync the current user's profile from Clerk identity claims. */
export const syncProfile = mutation({
  args: {},
  handler: async (ctx) => {
    await getOrCreateViewer(ctx);
  },
});

export const amIAdmin = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    return isAdmin(viewer);
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

    if (!user) return null;

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
    if (patch.username) standingsSync.username = patch.username as string;
    if (Object.keys(standingsSync).length > 0) {
      await syncUserToStandings(ctx, viewer._id, standingsSync);
    }

    return { success: true };
  },
});
