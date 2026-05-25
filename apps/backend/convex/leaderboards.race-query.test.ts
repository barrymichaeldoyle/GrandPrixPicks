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
  scores?: Array<{
    userId: Id<'users'>;
    username?: string;
    avatarUrl?: string;
    points: number;
    breakdown?: unknown;
  }>;
}) {
  const scoreQuery = {
    async *[Symbol.asyncIterator]() {
      for (const score of params.scores ?? []) {
        yield score;
      }
    },
  };

  return {
    db: {
      get: () => Promise.resolve(params.race),
      query: (table: string) => ({
        withIndex: (_indexName: string, _builder: unknown) => {
          if (table === 'scores') {
            return scoreQuery;
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
      getRaceLeaderboardForViewer(makeCtx({ race: null }) as never, {
        raceId: raceId('r1'),
      }),
    ).rejects.toThrow('Race not found');
  });

  it('returns scores to signed-out users on an upcoming race', async () => {
    const result = await getRaceLeaderboardForViewer(
      makeCtx({
        race: { _id: raceId('r1'), status: 'upcoming' },
        scores: [{ userId: userId('a'), username: 'A', points: 10 }],
      }) as never,
      { raceId: raceId('r1') },
    );

    expect(result.status).toBe('visible');
    expect(result.entries).toHaveLength(1);
  });

  it('returns scores to signed-in users who have not predicted', async () => {
    const result = await getRaceLeaderboardForViewer(
      makeCtx({
        race: { _id: raceId('r1'), status: 'locked' },
        scores: [{ userId: userId('a'), username: 'A', points: 10 }],
      }) as never,
      { raceId: raceId('r1') },
    );

    expect(result.status).toBe('visible');
    expect(result.entries).toHaveLength(1);
  });

  it('returns visible entries sorted by points', async () => {
    const result = await getRaceLeaderboardForViewer(
      makeCtx({
        race: { _id: raceId('r1'), status: 'locked' },
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
          rank: 1,
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
});
