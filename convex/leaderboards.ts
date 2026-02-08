import { v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import { query } from './_generated/server';
import { getViewer } from './lib/auth';

export const getSeasonLeaderboard = query({
  args: {
    season: v.optional(v.number()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    const season = args.season ?? 2026;
    const MAX_LIMIT = 100;
    const limit = Math.min(MAX_LIMIT, Math.max(1, args.limit ?? 50));
    const offset = Math.max(0, args.offset ?? 0);

    const standings = await ctx.db
      .query('seasonStandings')
      .withIndex('by_season_points', (q) => q.eq('season', season))
      .collect();

    // Sort by totalPoints desc (index is ascending)
    const allRows = standings.sort((a, b) => b.totalPoints - a.totalPoints);

    // Find viewer's entry from ALL rows (before privacy filtering)
    let viewerEntry: {
      rank: number;
      userId: Id<'users'>;
      username: string;
      points: number;
      raceCount: number;
      isViewer: boolean;
    } | null = null;

    if (viewer) {
      const viewerIndex = allRows.findIndex((r) => r.userId === viewer._id);
      if (viewerIndex !== -1) {
        const viewerRow = allRows[viewerIndex];
        viewerEntry = {
          rank: viewerIndex + 1,
          userId: viewer._id,
          username: viewer.username ?? 'Anonymous',
          points: viewerRow.totalPoints,
          raceCount: viewerRow.raceCount,
          isViewer: true,
        };
      }
    }

    // Filter out users who opted out of leaderboard (but always include viewer)
    // Only read user docs for privacy filtering — we need showOnLeaderboard from all rows
    // but username/avatar only for the paginated subset
    const privacyMap = new Map<string, boolean>();
    for (const row of allRows) {
      if (viewer && row.userId === viewer._id) continue; // always visible
      const user = await ctx.db.get(row.userId);
      privacyMap.set(row.userId, user?.showOnLeaderboard !== false);
    }

    const rows = allRows.filter((row) => {
      if (viewer && row.userId === viewer._id) return true;
      return privacyMap.get(row.userId) !== false;
    });

    // Paginate results
    const paginatedRows = rows.slice(offset, offset + limit);
    const hasMore = offset + limit < rows.length;

    // Only read user docs for the paginated page
    const enrichedRows = await Promise.all(
      paginatedRows.map(async (row, index) => {
        const user = await ctx.db.get(row.userId);
        const isViewer = viewer ? row.userId === viewer._id : false;
        return {
          rank: offset + index + 1,
          userId: row.userId,
          username: user?.username ?? 'Anonymous',
          avatarUrl: user?.avatarUrl,
          points: row.totalPoints,
          raceCount: row.raceCount,
          isViewer,
        };
      }),
    );

    return {
      entries: enrichedRows,
      totalCount: rows.length,
      hasMore,
      viewerEntry,
    };
  },
});

export const getFriendsLeaderboard = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return { entries: [], totalCount: 0, hasMore: false, viewerEntry: null };
    }

    const MAX_LIMIT = 100;
    const limit = Math.min(MAX_LIMIT, Math.max(1, args.limit ?? 50));
    const offset = Math.max(0, args.offset ?? 0);

    // Get all users the viewer follows
    const followRows = await ctx.db
      .query('follows')
      .withIndex('by_follower', (q) => q.eq('followerId', viewer._id))
      .collect();

    const friendIds = new Set<string>(followRows.map((f) => f.followeeId));
    friendIds.add(viewer._id);

    const standings = await ctx.db
      .query('seasonStandings')
      .withIndex('by_season_points', (q) => q.eq('season', 2026))
      .collect();

    const allRows = standings
      .filter((s) => friendIds.has(s.userId))
      .sort((a, b) => b.totalPoints - a.totalPoints);

    // Find viewer's entry
    let viewerEntry: {
      rank: number;
      userId: Id<'users'>;
      username: string;
      points: number;
      raceCount: number;
      isViewer: boolean;
    } | null = null;

    const viewerIndex = allRows.findIndex((r) => r.userId === viewer._id);
    if (viewerIndex !== -1) {
      const viewerRow = allRows[viewerIndex];
      viewerEntry = {
        rank: viewerIndex + 1,
        userId: viewer._id,
        username: viewer.username ?? 'Anonymous',
        points: viewerRow.totalPoints,
        raceCount: viewerRow.raceCount,
        isViewer: true,
      };
    }

    // Paginate
    const paginatedRows = allRows.slice(offset, offset + limit);
    const hasMore = offset + limit < allRows.length;

    // Only read user docs for the paginated page
    const enrichedRows = await Promise.all(
      paginatedRows.map(async (row, index) => {
        const user = await ctx.db.get(row.userId);
        const isViewer = row.userId === viewer._id;
        return {
          rank: offset + index + 1,
          userId: row.userId,
          username: user?.username ?? 'Anonymous',
          avatarUrl: user?.avatarUrl,
          points: row.totalPoints,
          raceCount: row.raceCount,
          isViewer,
        };
      }),
    );

    return {
      entries: enrichedRows,
      totalCount: allRows.length,
      hasMore,
      viewerEntry,
    };
  },
});

export const getFriendsH2HLeaderboard = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return { entries: [], totalCount: 0, hasMore: false, viewerEntry: null };
    }

    const MAX_LIMIT = 100;
    const limit = Math.min(MAX_LIMIT, Math.max(1, args.limit ?? 50));
    const offset = Math.max(0, args.offset ?? 0);

    const followRows = await ctx.db
      .query('follows')
      .withIndex('by_follower', (q) => q.eq('followerId', viewer._id))
      .collect();

    const friendIds = new Set<string>(followRows.map((f) => f.followeeId));
    friendIds.add(viewer._id);

    const standings = await ctx.db
      .query('h2hSeasonStandings')
      .withIndex('by_season_points', (q) => q.eq('season', 2026))
      .collect();

    const allRows = standings
      .filter((s) => friendIds.has(s.userId))
      .sort((a, b) => b.totalPoints - a.totalPoints);

    let viewerEntry: {
      rank: number;
      userId: Id<'users'>;
      username: string;
      points: number;
      raceCount: number;
      correctPicks: number;
      totalPicks: number;
      isViewer: boolean;
    } | null = null;

    const viewerIndex = allRows.findIndex((r) => r.userId === viewer._id);
    if (viewerIndex !== -1) {
      const viewerRow = allRows[viewerIndex];
      viewerEntry = {
        rank: viewerIndex + 1,
        userId: viewer._id,
        username: viewer.username ?? 'Anonymous',
        points: viewerRow.totalPoints,
        raceCount: viewerRow.raceCount,
        correctPicks: viewerRow.correctPicks,
        totalPicks: viewerRow.totalPicks,
        isViewer: true,
      };
    }

    const paginatedRows = allRows.slice(offset, offset + limit);
    const hasMore = offset + limit < allRows.length;

    const enrichedRows = await Promise.all(
      paginatedRows.map(async (row, index) => {
        const user = await ctx.db.get(row.userId);
        const isViewer = row.userId === viewer._id;
        return {
          rank: offset + index + 1,
          userId: row.userId,
          username: user?.username ?? 'Anonymous',
          avatarUrl: user?.avatarUrl,
          points: row.totalPoints,
          raceCount: row.raceCount,
          correctPicks: row.correctPicks,
          totalPicks: row.totalPicks,
          isViewer,
        };
      }),
    );

    return {
      entries: enrichedRows,
      totalCount: allRows.length,
      hasMore,
      viewerEntry,
    };
  },
});

export const getRaceLeaderboard = query({
  args: { raceId: v.id('races') },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    const race = await ctx.db.get(args.raceId);
    if (!race) throw new Error('Race not found');

    // Blind rule:
    // If race isn't finished yet, only allow per-race leaderboard
    // if the viewer has already submitted a prediction for this race.
    if (race.status !== 'finished') {
      if (!viewer) {
        return { status: 'locked', reason: 'sign_in', entries: [] };
      }

      // Check if user has any prediction for this race
      const submitted = await ctx.db
        .query('predictions')
        .withIndex('by_user_race_session', (q) =>
          q.eq('userId', viewer._id).eq('raceId', args.raceId),
        )
        .first();

      if (!submitted) {
        return { status: 'locked', reason: 'no_prediction', entries: [] };
      }
    }

    const scores = await ctx.db
      .query('scores')
      .withIndex('by_race_session', (q) => q.eq('raceId', args.raceId))
      .collect();

    const sortedScores = scores.sort((a, b) => b.points - a.points);

    // Filter out users who opted out (but keep viewer)
    const filteredScores = await Promise.all(
      sortedScores.map(async (s) => {
        const user = await ctx.db.get(s.userId);
        return { score: s, user };
      }),
    );

    const visibleScores = filteredScores.filter(({ score, user }) => {
      if (viewer && score.userId === viewer._id) return true;
      return user?.showOnLeaderboard !== false;
    });

    const entries = visibleScores.map(({ score, user }, index) => ({
      rank: index + 1,
      userId: score.userId,
      username: user?.username ?? 'Anonymous',
      avatarUrl: user?.avatarUrl,
      points: score.points,
      breakdown: score.breakdown,
    }));

    return { status: 'visible', reason: null, entries };
  },
});
