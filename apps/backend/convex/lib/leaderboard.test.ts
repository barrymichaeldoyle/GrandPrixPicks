import { describe, expect, it } from 'vitest';

import type { Id } from '../_generated/dataModel';
import {
  assignCompetitionRanks,
  buildViewerEntryFromRows,
  clampLeaderboardPagination,
  getRaceLeaderboardAccess,
  mapRaceScoresToLeaderboardEntries,
  mapRowsToLeaderboardEntries,
  sortByPointsWithStableTieBreak,
  streamRankedLeaderboardRows,
} from './leaderboard';

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

  it('maps ranked rows to entries with viewer flag', () => {
    const entries = mapRowsToLeaderboardEntries(
      [
        {
          userId: user('a'),
          username: 'Alice',
          avatarUrl: 'a.png',
          totalPoints: 40,
          raceCount: 5,
          rank: 11,
        },
        {
          userId: user('b'),
          totalPoints: 30,
          raceCount: 5,
          rank: 12,
        },
      ],
      user('b'),
    );

    expect(entries).toEqual([
      {
        rank: 11,
        userId: user('a'),
        username: 'Alice',
        displayName: undefined,
        avatarUrl: 'a.png',
        points: 40,
        raceCount: 5,
        isViewer: false,
      },
      {
        rank: 12,
        userId: user('b'),
        username: 'Anonymous',
        displayName: undefined,
        avatarUrl: undefined,
        points: 30,
        raceCount: 5,
        isViewer: true,
      },
    ]);
  });

  it('evaluates race leaderboard access rules', () => {
    expect(
      getRaceLeaderboardAccess({
        raceStatus: 'finished',
        viewerId: undefined,
        hasSubmittedPrediction: false,
      }),
    ).toEqual({ status: 'visible', reason: null });

    expect(
      getRaceLeaderboardAccess({
        raceStatus: 'upcoming',
        viewerId: undefined,
        hasSubmittedPrediction: false,
      }),
    ).toEqual({ status: 'locked', reason: 'sign_in' });

    expect(
      getRaceLeaderboardAccess({
        raceStatus: 'locked',
        viewerId: user('viewer'),
        hasSubmittedPrediction: false,
      }),
    ).toEqual({ status: 'locked', reason: 'no_prediction' });

    expect(
      getRaceLeaderboardAccess({
        raceStatus: 'locked',
        viewerId: user('viewer'),
        hasSubmittedPrediction: true,
      }),
    ).toEqual({ status: 'visible', reason: null });
  });

  it('maps race scores with deterministic point sort', () => {
    const entries = mapRaceScoresToLeaderboardEntries([
      {
        userId: user('b'),
        username: 'Beta',
        points: 20,
        breakdown: [{ test: true }],
      },
      {
        userId: user('a'),
        points: 20,
      },
      {
        userId: user('c'),
        points: 30,
      },
    ]);

    expect(entries).toEqual([
      {
        rank: 1,
        userId: user('c'),
        username: 'Anonymous',
        displayName: undefined,
        avatarUrl: undefined,
        points: 30,
        breakdown: undefined,
      },
      {
        rank: 2,
        userId: user('a'),
        username: 'Anonymous',
        displayName: undefined,
        avatarUrl: undefined,
        points: 20,
        breakdown: undefined,
      },
      {
        rank: 2,
        userId: user('b'),
        username: 'Beta',
        displayName: undefined,
        avatarUrl: undefined,
        points: 20,
        breakdown: [{ test: true }],
      },
    ]);
  });

  it('streams ranked leaderboard rows with stable tie-breaks and filtered viewer rank', async () => {
    async function* rows() {
      yield { userId: user('z'), totalPoints: 30, raceCount: 3 };
      yield { userId: user('a'), totalPoints: 30, raceCount: 3 };
      yield { userId: user('b'), totalPoints: 20, raceCount: 3 };
      yield { userId: user('c'), totalPoints: 20, raceCount: 3 };
    }

    const result = await streamRankedLeaderboardRows(rows(), {
      offset: 1,
      limit: 2,
      viewerId: user('c'),
      includeRow: (row) => row.userId !== user('b'),
    });

    expect(result.totalCount).toBe(3);
    expect(result.hasMore).toBe(false);
    expect(result.viewerRank).toBe(3);
    expect(result.viewerRow?.userId).toBe(user('c'));
    expect(
      result.pageRows.map((row) => ({ id: row.userId, rank: row.rank })),
    ).toEqual([
      { id: user('z'), rank: 1 },
      { id: user('c'), rank: 3 },
    ]);
  });

  it('assigns competition ranks so ties share a position and the next group skips', () => {
    const ranked = assignCompetitionRanks(
      [
        { userId: user('a'), totalPoints: 30 },
        { userId: user('b'), totalPoints: 30 },
        { userId: user('c'), totalPoints: 30 },
        { userId: user('d'), totalPoints: 20 },
        { userId: user('e'), totalPoints: 20 },
        { userId: user('f'), totalPoints: 5 },
      ],
      (row) => row.totalPoints,
    );

    expect(ranked.map((row) => row.rank)).toEqual([1, 1, 1, 4, 4, 6]);
  });

  it('streams ranked rows with three-way ties at the top', async () => {
    async function* rows() {
      yield { userId: user('a'), totalPoints: 18, raceCount: 1 };
      yield { userId: user('b'), totalPoints: 18, raceCount: 1 };
      yield { userId: user('c'), totalPoints: 18, raceCount: 1 };
      yield { userId: user('d'), totalPoints: 17, raceCount: 1 };
      yield { userId: user('e'), totalPoints: 17, raceCount: 1 };
      yield { userId: user('f'), totalPoints: 17, raceCount: 1 };
      yield { userId: user('g'), totalPoints: 10, raceCount: 1 };
    }

    const result = await streamRankedLeaderboardRows(rows(), {
      offset: 0,
      limit: 50,
      viewerId: user('e'),
    });

    expect(result.totalCount).toBe(7);
    expect(result.viewerRank).toBe(4);
    expect(result.pageRows.map((row) => row.rank)).toEqual([
      1, 1, 1, 4, 4, 4, 7,
    ]);
  });

  it('uses the shared rank for the viewer when they sit in a tied group', () => {
    const viewerEntry = buildViewerEntryFromRows(
      [
        { userId: user('a'), totalPoints: 18, raceCount: 1 },
        { userId: user('viewer'), totalPoints: 18, raceCount: 1 },
        { userId: user('c'), totalPoints: 18, raceCount: 1 },
        { userId: user('d'), totalPoints: 12, raceCount: 1 },
      ],
      { _id: user('viewer'), username: 'Viewer' },
    );

    expect(viewerEntry?.rank).toBe(1);
  });

  it('competition-ranks race scores when multiple users tie', () => {
    const entries = mapRaceScoresToLeaderboardEntries([
      { userId: user('a'), points: 25 },
      { userId: user('b'), points: 25 },
      { userId: user('c'), points: 25 },
      { userId: user('d'), points: 20 },
      { userId: user('e'), points: 5 },
    ]);

    expect(entries.map((entry) => entry.rank)).toEqual([1, 1, 1, 4, 5]);
  });
});
