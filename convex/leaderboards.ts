import { v } from 'convex/values';

import { query } from './_generated/server';
import { getViewer } from './lib/auth';
import {
  buildViewerEntryFromRows,
  clampLeaderboardPagination,
  filterLeaderboardVisibility,
  mapRowsToLeaderboardEntries,
  sortByPointsWithStableTieBreak,
} from './lib/leaderboard';

export const getSeasonLeaderboard = query({
  args: {
    season: v.optional(v.number()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    const season = args.season ?? 2026;
    const { limit, offset } = clampLeaderboardPagination(
      args.limit,
      args.offset,
    );

    const standings = await ctx.db
      .query('seasonStandings')
      .withIndex('by_season_points', (q) => q.eq('season', season))
      .collect();

    const allRows = sortByPointsWithStableTieBreak(standings);
    const viewerEntry = buildViewerEntryFromRows(allRows, viewer);
    const rows = filterLeaderboardVisibility(allRows, viewer?._id);

    // Paginate results
    const paginatedRows = rows.slice(offset, offset + limit);
    const hasMore = offset + limit < rows.length;

    const enrichedRows = mapRowsToLeaderboardEntries(
      paginatedRows,
      offset,
      viewer?._id,
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

    const { limit, offset } = clampLeaderboardPagination(
      args.limit,
      args.offset,
    );

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

    const allRows = sortByPointsWithStableTieBreak(
      standings.filter((s) => friendIds.has(s.userId)),
    );
    const viewerEntry = buildViewerEntryFromRows(allRows, viewer);

    // Paginate
    const paginatedRows = allRows.slice(offset, offset + limit);
    const hasMore = offset + limit < allRows.length;

    const enrichedRows = mapRowsToLeaderboardEntries(
      paginatedRows,
      offset,
      viewer._id,
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

    const { limit, offset } = clampLeaderboardPagination(
      args.limit,
      args.offset,
    );

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

    const allRows = sortByPointsWithStableTieBreak(
      standings.filter((s) => friendIds.has(s.userId)),
    );
    const viewerEntryBase = buildViewerEntryFromRows(allRows, viewer);
    const viewerEntry = viewerEntryBase
      ? {
          ...viewerEntryBase,
          correctPicks: allRows[viewerEntryBase.rank - 1].correctPicks,
          totalPicks: allRows[viewerEntryBase.rank - 1].totalPicks,
        }
      : null;

    const paginatedRows = allRows.slice(offset, offset + limit);
    const hasMore = offset + limit < allRows.length;

    // Use denormalized user data — no user doc reads needed
    const enrichedRows = paginatedRows.map((row, index) => {
      const isViewer = row.userId === viewer._id;
      return {
        rank: offset + index + 1,
        userId: row.userId,
        username: row.username ?? 'Anonymous',
        avatarUrl: row.avatarUrl,
        points: row.totalPoints,
        raceCount: row.raceCount,
        correctPicks: row.correctPicks,
        totalPicks: row.totalPicks,
        isViewer,
      };
    });

    return {
      entries: enrichedRows,
      totalCount: allRows.length,
      hasMore,
      viewerEntry,
    };
  },
});

export const getLeagueLeaderboard = query({
  args: {
    leagueId: v.id('leagues'),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);

    const members = await ctx.db
      .query('leagueMembers')
      .withIndex('by_league', (q) => q.eq('leagueId', args.leagueId))
      .collect();

    const memberIds = new Set<string>(members.map((m) => m.userId));

    if (!viewer || !memberIds.has(viewer._id)) {
      return { entries: [], totalCount: 0, hasMore: false, viewerEntry: null };
    }

    const { limit, offset } = clampLeaderboardPagination(
      args.limit,
      args.offset,
    );

    const standings = await ctx.db
      .query('seasonStandings')
      .withIndex('by_season_points', (q) => q.eq('season', 2026))
      .collect();

    const allRows = sortByPointsWithStableTieBreak(
      standings.filter((s) => memberIds.has(s.userId)),
    );
    const viewerEntry = buildViewerEntryFromRows(allRows, viewer);

    // Paginate
    const paginatedRows = allRows.slice(offset, offset + limit);
    const hasMore = offset + limit < allRows.length;

    const enrichedRows = mapRowsToLeaderboardEntries(
      paginatedRows,
      offset,
      viewer._id,
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
    if (!race) {
      throw new Error('Race not found');
    }

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

    // Filter out users who opted out (using denormalized field — no user doc reads)
    const visibleScores = sortedScores.filter((score) => {
      if (viewer && score.userId === viewer._id) {
        return true;
      }
      return score.showOnLeaderboard !== false;
    });

    // Use denormalized user data — no user doc reads needed
    const entries = visibleScores.map((score, index) => ({
      rank: index + 1,
      userId: score.userId,
      username: score.username ?? 'Anonymous',
      avatarUrl: score.avatarUrl,
      points: score.points,
      breakdown: score.breakdown,
    }));

    return { status: 'visible', reason: null, entries };
  },
});
