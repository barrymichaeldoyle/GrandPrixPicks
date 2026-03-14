import { describe, expect, it } from 'vitest';

import type { Id } from './_generated/dataModel';
import { getRaceLeaderboardForViewer } from './leaderboards';

function raceId(id: string): Id<'races'> {
  return id as Id<'races'>;
}

function userId(id: string): Id<'users'> {
  return id as Id<'users'>;
}

function makeCtx(params: {
  race: {
    _id: Id<'races'>;
    status: string;
  } | null;
  hasSubmittedPrediction?: boolean;
  scores?: Array<{
    userId: Id<'users'>;
    username?: string;
    avatarUrl?: string;
    points: number;
    breakdown?: unknown;
  }>;
}) {
  return {
    db: {
      get: () => Promise.resolve(params.race),
      query: (table: string) => ({
        withIndex: (_indexName: string, _builder: unknown) => {
          if (table === 'predictions') {
            return {
              first: () =>
                Promise.resolve(
                  params.hasSubmittedPrediction
                    ? ({ _id: 'prediction' } as const)
                    : null,
                ),
            };
          }
          if (table === 'scores') {
            return {
              collect: () => Promise.resolve(params.scores ?? []),
            };
          }
          throw new Error(`Unsupported table in test ctx: ${table}`);
        },
      }),
    },
  } as const;
}

describe('getRaceLeaderboardForViewer', () => {
  it('throws when race does not exist', async () => {
    await expect(
      getRaceLeaderboardForViewer(
        makeCtx({ race: null }) as never,
        { raceId: raceId('r1') },
        null,
      ),
    ).rejects.toThrow('Race not found');
  });

  it('locks non-finished race for signed-out users', async () => {
    const result = await getRaceLeaderboardForViewer(
      makeCtx({
        race: { _id: raceId('r1'), status: 'upcoming' },
      }) as never,
      { raceId: raceId('r1') },
      null,
    );

    expect(result).toEqual({
      status: 'locked',
      reason: 'sign_in',
      entries: [],
    });
  });

  it('locks non-finished race for signed-in users without a prediction', async () => {
    const result = await getRaceLeaderboardForViewer(
      makeCtx({
        race: { _id: raceId('r1'), status: 'locked' },
        hasSubmittedPrediction: false,
      }) as never,
      { raceId: raceId('r1') },
      { _id: userId('viewer'), username: 'Viewer' } as never,
    );

    expect(result).toEqual({
      status: 'locked',
      reason: 'no_prediction',
      entries: [],
    });
  });

  it('returns visible entries sorted by points', async () => {
    const result = await getRaceLeaderboardForViewer(
      makeCtx({
        race: { _id: raceId('r1'), status: 'locked' },
        hasSubmittedPrediction: true,
        scores: [
          {
            userId: userId('viewer'),
            points: 5,
          },
          {
            userId: userId('a'),
            points: 20,
          },
          {
            userId: userId('b'),
            points: 20,
          },
        ],
      }) as never,
      { raceId: raceId('r1') },
      { _id: userId('viewer'), username: 'Viewer' } as never,
    );

    expect(result).toEqual({
      status: 'visible',
      reason: null,
      entries: [
        {
          rank: 1,
          userId: userId('a'),
          username: 'Anonymous',
          avatarUrl: undefined,
          points: 20,
          breakdown: undefined,
        },
        {
          rank: 2,
          userId: userId('b'),
          username: 'Anonymous',
          avatarUrl: undefined,
          points: 20,
          breakdown: undefined,
        },
        {
          rank: 3,
          userId: userId('viewer'),
          username: 'Anonymous',
          avatarUrl: undefined,
          points: 5,
          breakdown: undefined,
        },
      ],
    });
  });

  it('aggregates multiple session score rows for the same user', async () => {
    const result = await getRaceLeaderboardForViewer(
      makeCtx({
        race: { _id: raceId('r1'), status: 'finished' },
        scores: [
          {
            userId: userId('dup'),
            username: 'dupe',
            points: 8,
          },
          {
            userId: userId('dup'),
            username: 'dupe',
            points: 7,
          },
          {
            userId: userId('other'),
            username: 'other',
            points: 10,
          },
        ],
      }) as never,
      { raceId: raceId('r1') },
      null,
    );

    expect(result).toEqual({
      status: 'visible',
      reason: null,
      entries: [
        {
          rank: 1,
          userId: userId('dup'),
          username: 'dupe',
          displayName: undefined,
          avatarUrl: undefined,
          points: 15,
          breakdown: undefined,
        },
        {
          rank: 2,
          userId: userId('other'),
          username: 'other',
          displayName: undefined,
          avatarUrl: undefined,
          points: 10,
          breakdown: undefined,
        },
      ],
    });
  });

  it('does not require sign-in or prediction once race is finished', async () => {
    const result = await getRaceLeaderboardForViewer(
      makeCtx({
        race: { _id: raceId('r1'), status: 'finished' },
        hasSubmittedPrediction: false,
        scores: [
          {
            userId: userId('public'),
            username: 'Public',
            points: 12,
          },
          {
            userId: userId('other'),
            points: 10,
          },
        ],
      }) as never,
      { raceId: raceId('r1') },
      null,
    );

    expect(result).toEqual({
      status: 'visible',
      reason: null,
      entries: [
        {
          rank: 1,
          userId: userId('public'),
          username: 'Public',
          avatarUrl: undefined,
          points: 12,
          breakdown: undefined,
        },
        {
          rank: 2,
          userId: userId('other'),
          username: 'Anonymous',
          avatarUrl: undefined,
          points: 10,
          breakdown: undefined,
        },
      ],
    });
  });
});
