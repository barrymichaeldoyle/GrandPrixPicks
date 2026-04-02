import type { Id } from '../_generated/dataModel';

const ANONYMOUS = 'Anonymous';

type RowBase = {
  userId: Id<'users'>;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  totalPoints: number;
  raceCount: number;
};

type RaceScoreRowBase = {
  userId: Id<'users'>;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  points: number;
  breakdown?: unknown;
};

type Viewer = {
  _id: Id<'users'>;
  username?: string;
  displayName?: string;
} | null;

type RankedStreamResult<T> = {
  pageRows: Array<T>;
  totalCount: number;
  hasMore: boolean;
  viewerRank: number | null;
  viewerRow: T | null;
};

export function clampLeaderboardPagination(
  limit: number | undefined,
  offset: number | undefined,
  maxLimit = 100,
) {
  return {
    limit: Math.min(maxLimit, Math.max(1, limit ?? 50)),
    offset: Math.max(0, offset ?? 0),
  };
}

export function sortByPointsWithStableTieBreak<T extends RowBase>(
  rows: ReadonlyArray<T>,
): Array<T> {
  return [...rows].sort((a, b) => {
    if (a.totalPoints !== b.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    return String(a.userId).localeCompare(String(b.userId));
  });
}

export function buildViewerEntryFromRows<T extends RowBase>(
  rows: ReadonlyArray<T>,
  viewer: Viewer,
) {
  if (!viewer) {
    return null;
  }

  const viewerIndex = rows.findIndex((row) => row.userId === viewer._id);
  if (viewerIndex === -1) {
    return null;
  }

  const row = rows[viewerIndex];
  return {
    rank: viewerIndex + 1,
    userId: viewer._id,
    username: viewer.username ?? ANONYMOUS,
    displayName: viewer.displayName,
    points: row.totalPoints,
    raceCount: row.raceCount,
    isViewer: true,
  };
}

export function mapRowsToLeaderboardEntries<T extends RowBase>(
  rows: ReadonlyArray<T>,
  offset: number,
  viewerId?: Id<'users'>,
) {
  return rows.map((row, index) => ({
    rank: offset + index + 1,
    userId: row.userId,
    username: row.username ?? ANONYMOUS,
    displayName: row.displayName,
    avatarUrl: row.avatarUrl,
    points: row.totalPoints,
    raceCount: row.raceCount,
    isViewer: viewerId ? row.userId === viewerId : false,
  }));
}

export async function streamRankedLeaderboardRows<T extends RowBase>(
  rows: AsyncIterable<T>,
  params: {
    offset: number;
    limit: number;
    viewerId?: Id<'users'>;
    includeRow?: (row: T) => boolean;
  },
): Promise<RankedStreamResult<T>> {
  const includeRow = params.includeRow ?? (() => true);
  const pageRows: Array<T> = [];
  let totalCount = 0;
  let viewerRank: number | null = null;
  let viewerRow: T | null = null;
  let currentGroup: Array<T> = [];
  let currentPoints: number | null = null;

  function flushGroup() {
    if (currentGroup.length === 0) {
      return;
    }

    currentGroup.sort((a, b) => String(a.userId).localeCompare(String(b.userId)));

    for (const row of currentGroup) {
      if (!includeRow(row)) {
        continue;
      }

      totalCount += 1;
      if (
        totalCount > params.offset &&
        pageRows.length < params.limit
      ) {
        pageRows.push(row);
      }

      if (params.viewerId && row.userId === params.viewerId) {
        viewerRank = totalCount;
        viewerRow = row;
      }
    }

    currentGroup = [];
    currentPoints = null;
  }

  for await (const row of rows) {
    if (currentPoints !== null && row.totalPoints !== currentPoints) {
      flushGroup();
    }

    currentPoints = row.totalPoints;
    currentGroup.push(row);
  }

  flushGroup();

  return {
    pageRows,
    totalCount,
    hasMore: params.offset + params.limit < totalCount,
    viewerRank,
    viewerRow,
  };
}

export function getRaceLeaderboardAccess(params: {
  raceStatus: string;
  viewerId?: Id<'users'>;
  hasSubmittedPrediction: boolean;
}):
  | { status: 'visible'; reason: null }
  | { status: 'locked'; reason: 'sign_in' | 'no_prediction' } {
  if (params.raceStatus === 'finished') {
    return { status: 'visible', reason: null };
  }
  if (!params.viewerId) {
    return { status: 'locked', reason: 'sign_in' };
  }
  if (!params.hasSubmittedPrediction) {
    return { status: 'locked', reason: 'no_prediction' };
  }
  return { status: 'visible', reason: null };
}

export function mapRaceScoresToLeaderboardEntries<T extends RaceScoreRowBase>(
  rows: ReadonlyArray<T>,
) {
  const sorted = [...rows].sort((a, b) => {
    if (a.points !== b.points) {
      return b.points - a.points;
    }
    return String(a.userId).localeCompare(String(b.userId));
  });

  return sorted.map((score, index) => ({
    rank: index + 1,
    userId: score.userId,
    username: score.username ?? ANONYMOUS,
    displayName: score.displayName,
    avatarUrl: score.avatarUrl,
    points: score.points,
    breakdown: score.breakdown,
  }));
}
