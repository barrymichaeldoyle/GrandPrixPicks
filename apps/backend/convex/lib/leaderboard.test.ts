import { describe, expect, it } from 'vitest';

import type { Id } from '../_generated/dataModel';
import {
  buildViewerEntryFromRows,
  clampLeaderboardPagination,
  getRaceLeaderboardAccess,
  mapRaceScoresToLeaderboardEntries,
  mapRowsToLeaderboardEntries,
  sortByPointsWithStableTieBreak,
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
        avatarUrl: undefined,
        points: 30,
        breakdown: undefined,
      },
      {
        rank: 2,
        userId: user('a'),
        username: 'Anonymous',
        avatarUrl: undefined,
        points: 20,
        breakdown: undefined,
      },
      {
        rank: 3,
        userId: user('b'),
        username: 'Beta',
        avatarUrl: undefined,
        points: 20,
        breakdown: [{ test: true }],
      },
    ]);
  });
});
