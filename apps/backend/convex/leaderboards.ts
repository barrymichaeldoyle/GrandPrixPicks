import { v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';
import { query } from './_generated/server';
import { getViewer } from './lib/auth';
import {
  buildViewerEntryFromRows,
  clampLeaderboardPagination,
  filterLeaderboardVisibility,
  getRaceLeaderboardAccess,
  mapRaceScoresToLeaderboardEntries,
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
        displayName: row.displayName,
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
    return getRaceLeaderboardForViewer(ctx, args, viewer);
  },
});

export async function getRaceLeaderboardForViewer(
  ctx: QueryCtx,
  args: { raceId: Id<'races'> },
  viewer: Awaited<ReturnType<typeof getViewer>>,
) {
  const race = await ctx.db.get(args.raceId);
  if (!race) {
    throw new Error('Race not found');
  }

  let hasSubmittedPrediction = false;
  if (viewer && race.status !== 'finished') {
    const submitted = await ctx.db
      .query('predictions')
      .withIndex('by_user_race_session', (q) =>
        q.eq('userId', viewer._id).eq('raceId', args.raceId),
      )
      .first();
    hasSubmittedPrediction = submitted !== null;
  }

  const access = getRaceLeaderboardAccess({
    raceStatus: race.status,
    viewerId: viewer?._id,
    hasSubmittedPrediction,
  });
  if (access.status === 'locked') {
    return { status: access.status, reason: access.reason, entries: [] };
  }

  const scores = await ctx.db
    .query('scores')
    .withIndex('by_race_session', (q) => q.eq('raceId', args.raceId))
    .collect();

  const entries = mapRaceScoresToLeaderboardEntries(scores, viewer?._id);

  return { status: 'visible', reason: null, entries };
}
