import { v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';
import { query } from './_generated/server';
import { getViewer } from './lib/auth';
import {
  clampLeaderboardPagination,
  getRaceLeaderboardAccess,
  mapRaceScoresToLeaderboardEntries,
  mapRowsToLeaderboardEntries,
  streamRankedLeaderboardRows,
} from './lib/leaderboard';

type CombinedRow = {
  userId: Id<'users'>;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  top5Points: number;
  h2hPoints: number;
  raceCount: number;
};

function sortCombinedRows(rows: ReadonlyArray<CombinedRow>) {
  return [...rows].sort((a, b) => {
    const aTotal = a.top5Points + a.h2hPoints;
    const bTotal = b.top5Points + b.h2hPoints;
    if (aTotal !== bTotal) {
      return bTotal - aTotal;
    }
    return String(a.userId).localeCompare(String(b.userId));
  });
}

function buildCombinedViewerEntry(
  rows: ReadonlyArray<CombinedRow>,
  viewer: Awaited<ReturnType<typeof getViewer>>,
) {
  if (!viewer) {
    return null;
  }

  const idx = rows.findIndex((r) => r.userId === viewer._id);
  if (idx === -1) {
    return null;
  }

  const row = rows[idx];
  return {
    rank: idx + 1,
    userId: viewer._id,
    username: viewer.username ?? 'Anonymous',
    displayName: viewer.displayName,
    points: row.top5Points + row.h2hPoints,
    top5Points: row.top5Points,
    h2hPoints: row.h2hPoints,
    raceCount: row.raceCount,
    isViewer: true,
  };
}

async function getLeagueMemberIds(
  ctx: QueryCtx,
  leagueId: Id<'leagues'>,
): Promise<Set<string>> {
  const memberIds = new Set<string>();
  for await (const member of ctx.db
    .query('leagueMembers')
    .withIndex('by_league', (q) => q.eq('leagueId', leagueId))) {
    memberIds.add(member.userId);
  }
  return memberIds;
}

async function loadCombinedSeasonRows(
  ctx: QueryCtx,
  params: {
    season: number;
    includeRow?: (userId: Id<'users'>) => boolean;
  },
) {
  const includeRow = params.includeRow ?? (() => true);
  const userMap = new Map<string, CombinedRow>();

  for await (const row of ctx.db
    .query('seasonStandings')
    .withIndex('by_season_points', (q) => q.eq('season', params.season))
    .order('desc')) {
    if (!includeRow(row.userId)) {
      continue;
    }
    userMap.set(row.userId, {
      userId: row.userId,
      username: row.username,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      top5Points: row.totalPoints,
      h2hPoints: 0,
      raceCount: row.raceCount,
    });
  }

  for await (const row of ctx.db
    .query('h2hSeasonStandings')
    .withIndex('by_season_points', (q) => q.eq('season', params.season))
    .order('desc')) {
    if (!includeRow(row.userId)) {
      continue;
    }
    const existing = userMap.get(row.userId);
    if (existing) {
      existing.h2hPoints = row.totalPoints;
      existing.raceCount = Math.max(existing.raceCount, row.raceCount);
      continue;
    }
    userMap.set(row.userId, {
      userId: row.userId,
      username: row.username,
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      top5Points: 0,
      h2hPoints: row.totalPoints,
      raceCount: row.raceCount,
    });
  }

  return sortCombinedRows([...userMap.values()]);
}

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

    const ranked = await streamRankedLeaderboardRows(
      ctx.db
        .query('seasonStandings')
        .withIndex('by_season_points', (q) => q.eq('season', season))
        .order('desc'),
      { offset, limit, viewerId: viewer?._id },
    );

    const enrichedRows = mapRowsToLeaderboardEntries(
      ranked.pageRows,
      offset,
      viewer?._id,
    );

    const viewerEntry =
      viewer && ranked.viewerRank !== null && ranked.viewerRow
        ? {
            rank: ranked.viewerRank,
            userId: viewer._id,
            username: viewer.username ?? 'Anonymous',
            displayName: viewer.displayName,
            points: ranked.viewerRow.totalPoints,
            raceCount: ranked.viewerRow.raceCount,
            isViewer: true,
          }
        : null;

    return {
      entries: enrichedRows,
      totalCount: ranked.totalCount,
      hasMore: ranked.hasMore,
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

    const followRows = await ctx.db
      .query('follows')
      .withIndex('by_follower', (q) => q.eq('followerId', viewer._id))
      .take(5000);

    const friendIds = new Set<string>(followRows.map((f) => f.followeeId));
    friendIds.add(viewer._id);

    const ranked = await streamRankedLeaderboardRows(
      ctx.db
        .query('seasonStandings')
        .withIndex('by_season_points', (q) => q.eq('season', 2026))
        .order('desc'),
      {
        offset,
        limit,
        viewerId: viewer._id,
        includeRow: (row) => friendIds.has(row.userId),
      },
    );

    const enrichedRows = mapRowsToLeaderboardEntries(
      ranked.pageRows,
      offset,
      viewer._id,
    );

    const viewerEntry =
      ranked.viewerRank !== null && ranked.viewerRow
        ? {
            rank: ranked.viewerRank,
            userId: viewer._id,
            username: viewer.username ?? 'Anonymous',
            displayName: viewer.displayName,
            points: ranked.viewerRow.totalPoints,
            raceCount: ranked.viewerRow.raceCount,
            isViewer: true,
          }
        : null;

    return {
      entries: enrichedRows,
      totalCount: ranked.totalCount,
      hasMore: ranked.hasMore,
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
      .take(5000);

    const friendIds = new Set<string>(followRows.map((f) => f.followeeId));
    friendIds.add(viewer._id);

    const ranked = await streamRankedLeaderboardRows(
      ctx.db
        .query('h2hSeasonStandings')
        .withIndex('by_season_points', (q) => q.eq('season', 2026))
        .order('desc'),
      {
        offset,
        limit,
        viewerId: viewer._id,
        includeRow: (row) => friendIds.has(row.userId),
      },
    );

    const viewerEntry =
      ranked.viewerRank !== null && ranked.viewerRow
        ? {
            rank: ranked.viewerRank,
            userId: viewer._id,
            username: viewer.username ?? 'Anonymous',
            displayName: viewer.displayName,
            points: ranked.viewerRow.totalPoints,
            raceCount: ranked.viewerRow.raceCount,
            correctPicks: ranked.viewerRow.correctPicks,
            totalPicks: ranked.viewerRow.totalPicks,
            isViewer: true,
          }
        : null;

    const enrichedRows = ranked.pageRows.map((row, index) => {
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
      totalCount: ranked.totalCount,
      hasMore: ranked.hasMore,
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
    const memberIds = await getLeagueMemberIds(ctx, args.leagueId);

    if (!viewer || !memberIds.has(viewer._id)) {
      return { entries: [], totalCount: 0, hasMore: false, viewerEntry: null };
    }

    const { limit, offset } = clampLeaderboardPagination(
      args.limit,
      args.offset,
    );

    const ranked = await streamRankedLeaderboardRows(
      ctx.db
        .query('seasonStandings')
        .withIndex('by_season_points', (q) => q.eq('season', 2026))
        .order('desc'),
      {
        offset,
        limit,
        viewerId: viewer._id,
        includeRow: (row) => memberIds.has(row.userId),
      },
    );

    const enrichedRows = mapRowsToLeaderboardEntries(
      ranked.pageRows,
      offset,
      viewer._id,
    );

    const viewerEntry =
      ranked.viewerRank !== null && ranked.viewerRow
        ? {
            rank: ranked.viewerRank,
            userId: viewer._id,
            username: viewer.username ?? 'Anonymous',
            displayName: viewer.displayName,
            points: ranked.viewerRow.totalPoints,
            raceCount: ranked.viewerRow.raceCount,
            isViewer: true,
          }
        : null;

    return {
      entries: enrichedRows,
      totalCount: ranked.totalCount,
      hasMore: ranked.hasMore,
      viewerEntry,
    };
  },
});

export const getCombinedSeasonLeaderboard = query({
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

    const allRows = await loadCombinedSeasonRows(ctx, { season });
    const viewerEntry = buildCombinedViewerEntry(allRows, viewer);

    const paginatedRows = allRows.slice(offset, offset + limit);
    const hasMore = offset + limit < allRows.length;

    const entries = paginatedRows.map((row, index) => ({
      rank: offset + index + 1,
      userId: row.userId,
      username: row.username ?? 'Anonymous',
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      points: row.top5Points + row.h2hPoints,
      top5Points: row.top5Points,
      h2hPoints: row.h2hPoints,
      raceCount: row.raceCount,
      isViewer: viewer ? row.userId === viewer._id : false,
    }));

    return { entries, totalCount: allRows.length, hasMore, viewerEntry };
  },
});

export const getFriendsCombinedLeaderboard = query({
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
      .take(5000);

    const friendIds = new Set<string>(followRows.map((f) => f.followeeId));
    friendIds.add(viewer._id);

    const allRows = await loadCombinedSeasonRows(ctx, {
      season: 2026,
      includeRow: (userId) => friendIds.has(userId),
    });
    const viewerEntry = buildCombinedViewerEntry(allRows, viewer);

    const paginatedRows = allRows.slice(offset, offset + limit);
    const hasMore = offset + limit < allRows.length;

    const entries = paginatedRows.map((row, index) => ({
      rank: offset + index + 1,
      userId: row.userId,
      username: row.username ?? 'Anonymous',
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      points: row.top5Points + row.h2hPoints,
      top5Points: row.top5Points,
      h2hPoints: row.h2hPoints,
      raceCount: row.raceCount,
      isViewer: row.userId === viewer._id,
    }));

    return { entries, totalCount: allRows.length, hasMore, viewerEntry };
  },
});

export const getCombinedRaceLeaderboard = query({
  args: { raceId: v.id('races'), friendsOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);

    if (args.friendsOnly && !viewer) {
      return {
        status: 'locked' as const,
        reason: 'sign_in' as const,
        entries: [],
      };
    }

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

    let friendIds: Set<string> | null = null;
    if (args.friendsOnly && viewer) {
      const followRows = await ctx.db
        .query('follows')
        .withIndex('by_follower', (q) => q.eq('followerId', viewer._id))
        .take(5000);
      friendIds = new Set([viewer._id, ...followRows.map((f) => f.followeeId)]);
    }

    type RaceEntry = {
      userId: Id<'users'>;
      username?: string;
      displayName?: string;
      avatarUrl?: string;
      top5Points: number;
      h2hPoints: number;
    };

    const userMap = new Map<string, RaceEntry>();

    for await (const score of ctx.db
      .query('scores')
      .withIndex('by_race_session', (q) => q.eq('raceId', args.raceId))) {
      const existing = userMap.get(score.userId);
      if (existing) {
        existing.top5Points += score.points;
      } else {
        userMap.set(score.userId, {
          userId: score.userId,
          username: score.username,
          displayName: score.displayName,
          avatarUrl: score.avatarUrl,
          top5Points: score.points,
          h2hPoints: 0,
        });
      }
    }

    for await (const score of ctx.db
      .query('h2hScores')
      .withIndex('by_race_session', (q) => q.eq('raceId', args.raceId))) {
      const existing = userMap.get(score.userId);
      if (existing) {
        existing.h2hPoints += score.points;
      } else {
        userMap.set(score.userId, {
          userId: score.userId,
          top5Points: 0,
          h2hPoints: score.points,
        });
      }
    }

    // Fetch user info for any entries missing username (h2h-only participants)
    const missingUserIds = [...userMap.values()]
      .filter((e) => !e.username)
      .map((e) => e.userId);

    if (missingUserIds.length > 0) {
      const users = await Promise.all(
        missingUserIds.map((id) => ctx.db.get(id)),
      );
      for (const user of users) {
        if (user) {
          const entry = userMap.get(user._id);
          if (entry) {
            entry.username = user.username;
            entry.displayName = user.displayName;
            entry.avatarUrl = user.avatarUrl;
          }
        }
      }
    }

    const allEntries = [...userMap.values()].filter(
      (e) => !friendIds || friendIds.has(e.userId),
    );

    const sorted = allEntries.sort((a, b) => {
      const aTotal = a.top5Points + a.h2hPoints;
      const bTotal = b.top5Points + b.h2hPoints;
      if (aTotal !== bTotal) {
        return bTotal - aTotal;
      }
      return String(a.userId).localeCompare(String(b.userId));
    });

    const entries = sorted.map((row, index) => ({
      rank: index + 1,
      userId: row.userId,
      username: row.username ?? 'Anonymous',
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      points: row.top5Points + row.h2hPoints,
      top5Points: row.top5Points,
      h2hPoints: row.h2hPoints,
      isViewer: viewer ? row.userId === viewer._id : false,
    }));

    return { status: 'visible' as const, reason: null, entries };
  },
});

export const getH2HRaceLeaderboard = query({
  args: { raceId: v.id('races'), friendsOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);

    if (args.friendsOnly && !viewer) {
      return {
        status: 'locked' as const,
        reason: 'sign_in' as const,
        entries: [],
      };
    }

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

    let friendIds: Set<string> | null = null;
    if (args.friendsOnly && viewer) {
      const followRows = await ctx.db
        .query('follows')
        .withIndex('by_follower', (q) => q.eq('followerId', viewer._id))
        .take(5000);
      friendIds = new Set([viewer._id, ...followRows.map((f) => f.followeeId)]);
    }

    type H2HEntry = {
      userId: Id<'users'>;
      points: number;
      correctPicks: number;
      totalPicks: number;
    };

    const userMap = new Map<string, H2HEntry>();
    for await (const score of ctx.db
      .query('h2hScores')
      .withIndex('by_race_session', (q) => q.eq('raceId', args.raceId))) {
      const existing = userMap.get(score.userId);
      if (existing) {
        existing.points += score.points;
        existing.correctPicks += score.correctPicks;
        existing.totalPicks += score.totalPicks;
      } else {
        userMap.set(score.userId, {
          userId: score.userId,
          points: score.points,
          correctPicks: score.correctPicks,
          totalPicks: score.totalPicks,
        });
      }
    }

    const filteredEntries = [...userMap.values()].filter(
      (e) => !friendIds || friendIds.has(e.userId),
    );

    const userIds = filteredEntries.map((e) => e.userId);
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const userInfoMap = new Map(users.filter(Boolean).map((u) => [u!._id, u!]));

    const sorted = filteredEntries.sort((a, b) => {
      if (a.points !== b.points) {
        return b.points - a.points;
      }
      return String(a.userId).localeCompare(String(b.userId));
    });

    const entries = sorted.map((row, index) => {
      const user = userInfoMap.get(row.userId);
      return {
        rank: index + 1,
        userId: row.userId,
        username: user?.username ?? 'Anonymous',
        displayName: user?.displayName,
        avatarUrl: user?.avatarUrl,
        points: row.points,
        correctPicks: row.correctPicks,
        totalPicks: row.totalPicks,
        isViewer: viewer ? row.userId === viewer._id : false,
      };
    });

    return { status: 'visible' as const, reason: null, entries };
  },
});

export const getRaceLeaderboard = query({
  args: { raceId: v.id('races'), friendsOnly: v.optional(v.boolean()) },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);

    if (args.friendsOnly && !viewer) {
      return {
        status: 'locked' as const,
        reason: 'sign_in' as const,
        entries: [],
      };
    }

    const result = await getRaceLeaderboardForViewer(ctx, args, viewer);
    if (result.status !== 'visible' || !args.friendsOnly || !viewer) {
      return result;
    }

    const followRows = await ctx.db
      .query('follows')
      .withIndex('by_follower', (q) => q.eq('followerId', viewer._id))
      .take(5000);
    const friendIds = new Set([
      viewer._id,
      ...followRows.map((f) => f.followeeId),
    ]);
    const filteredEntries = result.entries
      .filter((e) => friendIds.has(e.userId))
      .map((e, i) => ({ ...e, rank: i + 1 }));

    return {
      status: 'visible' as const,
      reason: null,
      entries: filteredEntries,
    };
  },
});

export const getLeagueCombinedSeasonLeaderboard = query({
  args: {
    leagueId: v.id('leagues'),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    const memberIds = await getLeagueMemberIds(ctx, args.leagueId);

    if (!viewer || !memberIds.has(viewer._id)) {
      return { entries: [], totalCount: 0, hasMore: false, viewerEntry: null };
    }

    const { limit, offset } = clampLeaderboardPagination(
      args.limit,
      args.offset,
    );

    const allRows = await loadCombinedSeasonRows(ctx, {
      season: 2026,
      includeRow: (userId) => memberIds.has(userId),
    });
    const viewerEntry = buildCombinedViewerEntry(allRows, viewer);

    const paginatedRows = allRows.slice(offset, offset + limit);
    const hasMore = offset + limit < allRows.length;

    const entries = paginatedRows.map((row, index) => ({
      rank: offset + index + 1,
      userId: row.userId,
      username: row.username ?? 'Anonymous',
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      points: row.top5Points + row.h2hPoints,
      top5Points: row.top5Points,
      h2hPoints: row.h2hPoints,
      raceCount: row.raceCount,
      isViewer: row.userId === viewer._id,
    }));

    return { entries, totalCount: allRows.length, hasMore, viewerEntry };
  },
});

export const getLeagueH2HSeasonLeaderboard = query({
  args: {
    leagueId: v.id('leagues'),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    const memberIds = await getLeagueMemberIds(ctx, args.leagueId);

    if (!viewer || !memberIds.has(viewer._id)) {
      return { entries: [], totalCount: 0, hasMore: false, viewerEntry: null };
    }

    const { limit, offset } = clampLeaderboardPagination(
      args.limit,
      args.offset,
    );

    const ranked = await streamRankedLeaderboardRows(
      ctx.db
        .query('h2hSeasonStandings')
        .withIndex('by_season_points', (q) => q.eq('season', 2026))
        .order('desc'),
      {
        offset,
        limit,
        viewerId: viewer._id,
        includeRow: (row) => memberIds.has(row.userId),
      },
    );

    const viewerEntry =
      ranked.viewerRank !== null && ranked.viewerRow
        ? {
            rank: ranked.viewerRank,
            userId: viewer._id,
            username: viewer.username ?? 'Anonymous',
            displayName: viewer.displayName,
            points: ranked.viewerRow.totalPoints,
            raceCount: ranked.viewerRow.raceCount,
            correctPicks: ranked.viewerRow.correctPicks,
            totalPicks: ranked.viewerRow.totalPicks,
            isViewer: true,
          }
        : null;

    const enrichedRows = ranked.pageRows.map((row, index) => ({
      rank: offset + index + 1,
      userId: row.userId,
      username: row.username ?? 'Anonymous',
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      points: row.totalPoints,
      raceCount: row.raceCount,
      correctPicks: row.correctPicks,
      totalPicks: row.totalPicks,
      isViewer: row.userId === viewer._id,
    }));

    return {
      entries: enrichedRows,
      totalCount: ranked.totalCount,
      hasMore: ranked.hasMore,
      viewerEntry,
    };
  },
});

export const getLeagueRaceLeaderboard = query({
  args: {
    leagueId: v.id('leagues'),
    raceId: v.id('races'),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    const memberIds = await getLeagueMemberIds(ctx, args.leagueId);

    if (!viewer || !memberIds.has(viewer._id)) {
      return {
        status: 'locked' as const,
        reason: 'sign_in' as const,
        entries: [],
      };
    }

    const race = await ctx.db.get(args.raceId);
    if (!race) {
      throw new Error('Race not found');
    }

    let hasSubmittedPrediction = false;
    if (race.status !== 'finished') {
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
      viewerId: viewer._id,
      hasSubmittedPrediction,
    });
    if (access.status === 'locked') {
      return { status: access.status, reason: access.reason, entries: [] };
    }

    const userMap = new Map<
      string,
      {
        userId: Id<'users'>;
        username?: string;
        displayName?: string;
        avatarUrl?: string;
        points: number;
      }
    >();

    for await (const score of ctx.db
      .query('scores')
      .withIndex('by_race_session', (q) => q.eq('raceId', args.raceId))) {
      if (!memberIds.has(score.userId)) {
        continue;
      }
      const existing = userMap.get(score.userId);
      if (existing) {
        existing.points += score.points;
        existing.username ??= score.username;
        existing.displayName ??= score.displayName;
        existing.avatarUrl ??= score.avatarUrl;
      } else {
        userMap.set(score.userId, {
          userId: score.userId,
          username: score.username,
          displayName: score.displayName,
          avatarUrl: score.avatarUrl,
          points: score.points,
        });
      }
    }

    const entries = mapRaceScoresToLeaderboardEntries([
      ...userMap.values(),
    ]).map((e) => ({ ...e, isViewer: e.userId === viewer._id }));

    return { status: 'visible' as const, reason: null, entries };
  },
});

export const getLeagueCombinedRaceLeaderboard = query({
  args: {
    leagueId: v.id('leagues'),
    raceId: v.id('races'),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    const memberIds = await getLeagueMemberIds(ctx, args.leagueId);

    if (!viewer || !memberIds.has(viewer._id)) {
      return {
        status: 'locked' as const,
        reason: 'sign_in' as const,
        entries: [],
      };
    }

    const race = await ctx.db.get(args.raceId);
    if (!race) {
      throw new Error('Race not found');
    }

    let hasSubmittedPrediction = false;
    if (race.status !== 'finished') {
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
      viewerId: viewer._id,
      hasSubmittedPrediction,
    });
    if (access.status === 'locked') {
      return { status: access.status, reason: access.reason, entries: [] };
    }

    type RaceEntry = {
      userId: Id<'users'>;
      username?: string;
      displayName?: string;
      avatarUrl?: string;
      top5Points: number;
      h2hPoints: number;
    };

    const userMap = new Map<string, RaceEntry>();

    for await (const score of ctx.db
      .query('scores')
      .withIndex('by_race_session', (q) => q.eq('raceId', args.raceId))) {
      if (!memberIds.has(score.userId)) {
        continue;
      }
      const existing = userMap.get(score.userId);
      if (existing) {
        existing.top5Points += score.points;
      } else {
        userMap.set(score.userId, {
          userId: score.userId,
          username: score.username,
          displayName: score.displayName,
          avatarUrl: score.avatarUrl,
          top5Points: score.points,
          h2hPoints: 0,
        });
      }
    }

    for await (const score of ctx.db
      .query('h2hScores')
      .withIndex('by_race_session', (q) => q.eq('raceId', args.raceId))) {
      if (!memberIds.has(score.userId)) {
        continue;
      }
      const existing = userMap.get(score.userId);
      if (existing) {
        existing.h2hPoints += score.points;
      } else {
        userMap.set(score.userId, {
          userId: score.userId,
          top5Points: 0,
          h2hPoints: score.points,
        });
      }
    }

    const missingUserIds = [...userMap.values()]
      .filter((e) => !e.username)
      .map((e) => e.userId);

    if (missingUserIds.length > 0) {
      const users = await Promise.all(
        missingUserIds.map((id) => ctx.db.get(id)),
      );
      for (const user of users) {
        if (user) {
          const entry = userMap.get(user._id);
          if (entry) {
            entry.username = user.username;
            entry.displayName = user.displayName;
            entry.avatarUrl = user.avatarUrl;
          }
        }
      }
    }

    const sorted = [...userMap.values()].sort((a, b) => {
      const aTotal = a.top5Points + a.h2hPoints;
      const bTotal = b.top5Points + b.h2hPoints;
      if (aTotal !== bTotal) {
        return bTotal - aTotal;
      }
      return String(a.userId).localeCompare(String(b.userId));
    });

    const entries = sorted.map((row, index) => ({
      rank: index + 1,
      userId: row.userId,
      username: row.username ?? 'Anonymous',
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      points: row.top5Points + row.h2hPoints,
      top5Points: row.top5Points,
      h2hPoints: row.h2hPoints,
      isViewer: row.userId === viewer._id,
    }));

    return { status: 'visible' as const, reason: null, entries };
  },
});

export const getLeagueH2HRaceLeaderboard = query({
  args: {
    leagueId: v.id('leagues'),
    raceId: v.id('races'),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    const memberIds = await getLeagueMemberIds(ctx, args.leagueId);

    if (!viewer || !memberIds.has(viewer._id)) {
      return {
        status: 'locked' as const,
        reason: 'sign_in' as const,
        entries: [],
      };
    }

    const race = await ctx.db.get(args.raceId);
    if (!race) {
      throw new Error('Race not found');
    }

    let hasSubmittedPrediction = false;
    if (race.status !== 'finished') {
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
      viewerId: viewer._id,
      hasSubmittedPrediction,
    });
    if (access.status === 'locked') {
      return { status: access.status, reason: access.reason, entries: [] };
    }

    type H2HEntry = {
      userId: Id<'users'>;
      points: number;
      correctPicks: number;
      totalPicks: number;
    };

    const userMap = new Map<string, H2HEntry>();

    for await (const score of ctx.db
      .query('h2hScores')
      .withIndex('by_race_session', (q) => q.eq('raceId', args.raceId))) {
      if (!memberIds.has(score.userId)) {
        continue;
      }
      const existing = userMap.get(score.userId);
      if (existing) {
        existing.points += score.points;
        existing.correctPicks += score.correctPicks;
        existing.totalPicks += score.totalPicks;
      } else {
        userMap.set(score.userId, {
          userId: score.userId,
          points: score.points,
          correctPicks: score.correctPicks,
          totalPicks: score.totalPicks,
        });
      }
    }

    const userIds = [...userMap.values()].map((e) => e.userId);
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const userInfoMap = new Map(users.filter(Boolean).map((u) => [u!._id, u!]));

    const sorted = [...userMap.values()].sort((a, b) => {
      if (a.points !== b.points) {
        return b.points - a.points;
      }
      return String(a.userId).localeCompare(String(b.userId));
    });

    const entries = sorted.map((row, index) => {
      const user = userInfoMap.get(row.userId);
      return {
        rank: index + 1,
        userId: row.userId,
        username: user?.username ?? 'Anonymous',
        displayName: user?.displayName,
        avatarUrl: user?.avatarUrl,
        points: row.points,
        correctPicks: row.correctPicks,
        totalPicks: row.totalPicks,
        isViewer: row.userId === viewer._id,
      };
    });

    return { status: 'visible' as const, reason: null, entries };
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

  const userMap = new Map<
    string,
    {
      userId: Id<'users'>;
      username?: string;
      displayName?: string;
      avatarUrl?: string;
      points: number;
      breakdown?: unknown;
    }
  >();

  for await (const score of ctx.db
    .query('scores')
    .withIndex('by_race_session', (q) => q.eq('raceId', args.raceId))) {
    const existing = userMap.get(score.userId);
    if (existing) {
      existing.points += score.points;
      existing.username ??= score.username;
      existing.displayName ??= score.displayName;
      existing.avatarUrl ??= score.avatarUrl;
      existing.breakdown ??= score.breakdown;
      continue;
    }

    userMap.set(score.userId, {
      userId: score.userId,
      username: score.username,
      displayName: score.displayName,
      avatarUrl: score.avatarUrl,
      points: score.points,
      breakdown: score.breakdown,
    });
  }

  const entries = mapRaceScoresToLeaderboardEntries([...userMap.values()]);

  return { status: 'visible' as const, reason: null, entries };
}
