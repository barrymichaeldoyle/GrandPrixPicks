import type { Id } from '../_generated/dataModel';

const ANONYMOUS = 'Anonymous';

type RowBase = {
  userId: Id<'users'>;
  username?: string;
  avatarUrl?: string;
  totalPoints: number;
  raceCount: number;
};

type VisibleRowBase = {
  userId: Id<'users'>;
  showOnLeaderboard?: boolean;
};

type Viewer = {
  _id: Id<'users'>;
  username?: string;
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

export function filterLeaderboardVisibility<T extends VisibleRowBase>(
  rows: ReadonlyArray<T>,
  viewerId?: Id<'users'>,
): Array<T> {
  return rows.filter((row) => {
    if (viewerId && row.userId === viewerId) {
      return true;
    }
    return row.showOnLeaderboard !== false;
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
    avatarUrl: row.avatarUrl,
    points: row.totalPoints,
    raceCount: row.raceCount,
    isViewer: viewerId ? row.userId === viewerId : false,
  }));
}
