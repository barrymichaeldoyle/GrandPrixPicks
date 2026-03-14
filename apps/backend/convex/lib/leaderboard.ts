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
