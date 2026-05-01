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

export type RankedRow<T> = T & { rank: number };

type RankedStreamResult<T> = {
  pageRows: Array<RankedRow<T>>;
  totalCount: number;
  hasMore: boolean;
  viewerRank: number | null;
  viewerRow: RankedRow<T> | null;
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

/**
 * Assigns competition ranks (1, 1, 1, 4, ...) to a list already sorted by
 * descending points. Tied rows share the rank of the first row in the group;
 * the next group skips positions to reflect how many rows shared the prior rank.
 */
export function assignCompetitionRanks<T>(
  sorted: ReadonlyArray<T>,
  getPoints: (row: T) => number,
): Array<RankedRow<T>> {
  const ranked: Array<RankedRow<T>> = [];
  let lastPoints: number | null = null;
  let lastRank = 0;

  for (let i = 0; i < sorted.length; i++) {
    const row = sorted[i];
    const points = getPoints(row);
    const rank =
      lastPoints !== null && points === lastPoints ? lastRank : i + 1;
    lastPoints = points;
    lastRank = rank;
    ranked.push({ ...row, rank });
  }

  return ranked;
}

export function buildViewerEntryFromRows<T extends RowBase>(
  rows: ReadonlyArray<T>,
  viewer: Viewer,
) {
  if (!viewer) {
    return null;
  }

  const ranked = assignCompetitionRanks(rows, (row) => row.totalPoints);
  const viewerRanked = ranked.find((row) => row.userId === viewer._id);
  if (!viewerRanked) {
    return null;
  }

  return {
    rank: viewerRanked.rank,
    userId: viewer._id,
    username: viewer.username ?? ANONYMOUS,
    displayName: viewer.displayName,
    points: viewerRanked.totalPoints,
    raceCount: viewerRanked.raceCount,
    isViewer: true,
  };
}

export function mapRowsToLeaderboardEntries<T extends RowBase>(
  rows: ReadonlyArray<RankedRow<T>>,
  viewerId?: Id<'users'>,
) {
  return rows.map((row) => ({
    rank: row.rank,
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
  const pageRows: Array<RankedRow<T>> = [];
  let totalCount = 0;
  let viewerRank: number | null = null;
  let viewerRow: RankedRow<T> | null = null;
  let currentGroup: Array<T> = [];
  let currentPoints: number | null = null;

  function flushGroup() {
    if (currentGroup.length === 0) {
      return;
    }

    currentGroup.sort((a, b) =>
      String(a.userId).localeCompare(String(b.userId)),
    );

    let groupRank: number | null = null;

    for (const row of currentGroup) {
      if (!includeRow(row)) {
        continue;
      }

      totalCount += 1;
      if (groupRank === null) {
        groupRank = totalCount;
      }
      const ranked: RankedRow<T> = { ...row, rank: groupRank };

      if (totalCount > params.offset && pageRows.length < params.limit) {
        pageRows.push(ranked);
      }

      if (params.viewerId && row.userId === params.viewerId) {
        viewerRank = groupRank;
        viewerRow = ranked;
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

  const ranked = assignCompetitionRanks(sorted, (row) => row.points);

  return ranked.map((score) => ({
    rank: score.rank,
    userId: score.userId,
    username: score.username ?? ANONYMOUS,
    displayName: score.displayName,
    avatarUrl: score.avatarUrl,
    points: score.points,
    breakdown: score.breakdown,
  }));
}
