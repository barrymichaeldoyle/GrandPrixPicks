import { describe, expect, it } from 'vitest';

import type { Id } from '../../convex/_generated/dataModel';
import {
  buildViewerEntryFromRows,
  clampLeaderboardPagination,
  filterLeaderboardVisibility,
  mapRowsToLeaderboardEntries,
  sortByPointsWithStableTieBreak,
} from '../../convex/lib/leaderboard';

function user(id: string): Id<'users'> {
  return id as Id<'users'>;
}

describe('leaderboard helpers', () => {
  it('clamps pagination inputs to safe bounds', () => {
    expect(clampLeaderboardPagination(undefined, undefined)).toEqual({
      limit: 50,
      offset: 0,
    });
    expect(clampLeaderboardPagination(-5, -2)).toEqual({ limit: 1, offset: 0 });
    expect(clampLeaderboardPagination(999, 7)).toEqual({
      limit: 100,
      offset: 7,
    });
  });

  it('sorts by points descending and uses user id as deterministic tie-break', () => {
    const sorted = sortByPointsWithStableTieBreak([
      { userId: user('u3'), totalPoints: 20, raceCount: 2 },
      { userId: user('u2'), totalPoints: 30, raceCount: 2 },
      { userId: user('u1'), totalPoints: 30, raceCount: 2 },
    ]);

    expect(sorted.map((row) => row.userId)).toEqual([
      user('u1'),
      user('u2'),
      user('u3'),
    ]);
  });

  it('filters hidden rows but always keeps the viewer row', () => {
    const rows = [
      { userId: user('viewer'), showOnLeaderboard: false },
      { userId: user('public'), showOnLeaderboard: true },
      { userId: user('hidden'), showOnLeaderboard: false },
    ];

    expect(
      filterLeaderboardVisibility(rows, user('viewer')).map((r) => r.userId),
    ).toEqual([user('viewer'), user('public')]);
  });

  it('builds viewer entry rank from sorted rows and uses username fallback', () => {
    const rows = sortByPointsWithStableTieBreak([
      { userId: user('a'), totalPoints: 40, raceCount: 5 },
      { userId: user('v'), totalPoints: 35, raceCount: 5 },
      { userId: user('b'), totalPoints: 30, raceCount: 5 },
    ]);

    expect(buildViewerEntryFromRows(rows, { _id: user('v') })).toEqual({
      rank: 2,
      userId: user('v'),
      username: 'Anonymous',
      points: 35,
      raceCount: 5,
      isViewer: true,
    });
    expect(buildViewerEntryFromRows(rows, null)).toBeNull();
    expect(buildViewerEntryFromRows(rows, { _id: user('x') })).toBeNull();
  });

  it('maps rows to ranked entries with offset and viewer flag', () => {
    const entries = mapRowsToLeaderboardEntries(
      [
        {
          userId: user('a'),
          username: 'Alice',
          avatarUrl: 'a.png',
          totalPoints: 40,
          raceCount: 5,
        },
        {
          userId: user('b'),
          totalPoints: 30,
          raceCount: 5,
        },
      ],
      10,
      user('b'),
    );

    expect(entries).toEqual([
      {
        rank: 11,
        userId: user('a'),
        username: 'Alice',
        avatarUrl: 'a.png',
        points: 40,
        raceCount: 5,
        isViewer: false,
      },
      {
        rank: 12,
        userId: user('b'),
        username: 'Anonymous',
        avatarUrl: undefined,
        points: 30,
        raceCount: 5,
        isViewer: true,
      },
    ]);
  });
});
