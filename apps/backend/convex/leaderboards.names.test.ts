/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

type Ctx = Parameters<Parameters<ReturnType<typeof convexTest>['run']>[0]>[0];

async function seedNamedBoard(ctx: Ctx) {
  const viewerId = await ctx.db.insert('users', {
    clerkUserId: 'viewer',
    username: 'apex-hunter',
    displayName: 'Apex Hunter',
    createdAt: 0,
    updatedAt: 0,
  });
  const rivalId = await ctx.db.insert('users', {
    clerkUserId: 'rival',
    username: 'late-braker',
    displayName: 'Late Braker',
    createdAt: 0,
    updatedAt: 0,
  });
  await ctx.db.insert('seasonStandings', {
    userId: rivalId,
    season: 2026,
    totalPoints: 40,
    raceCount: 2,
    username: 'late-braker',
    displayName: 'Late Braker',
    updatedAt: 0,
  });
  await ctx.db.insert('seasonStandings', {
    userId: viewerId,
    season: 2026,
    totalPoints: 30,
    raceCount: 2,
    username: 'apex-hunter',
    displayName: 'Apex Hunter',
    updatedAt: 0,
  });
  const raceId = await ctx.db.insert('races', {
    season: 2026,
    round: 14,
    name: 'Spanish Grand Prix',
    slug: 'madrid-2026',
    raceStartAt: Date.now(),
    predictionLockAt: Date.now(),
    status: 'finished',
    createdAt: 0,
    updatedAt: 0,
  });
  await ctx.db.insert('scores', {
    userId: rivalId,
    raceId,
    sessionType: 'race',
    points: 20,
    username: 'late-braker',
    displayName: 'Late Braker',
    createdAt: 0,
    updatedAt: 0,
  });
  await ctx.db.insert('scores', {
    userId: viewerId,
    raceId,
    sessionType: 'race',
    points: 15,
    username: 'apex-hunter',
    displayName: 'Apex Hunter',
    createdAt: 0,
    updatedAt: 0,
  });
  return { raceId };
}

describe('leaderboard display names', () => {
  it('keeps usernames only on an unsigned season board', async () => {
    const t = convexTest(schema, modules);
    await t.run(seedNamedBoard);

    const board = await t.query(api.leaderboards.getCombinedSeasonLeaderboard, {
      season: 2026,
    });

    expect(board.entries.map((entry) => entry.username)).toEqual([
      'late-braker',
      'apex-hunter',
    ]);
    expect(board.entries.map((entry) => entry.displayName)).toEqual([
      undefined,
      undefined,
    ]);
  });

  it('shows display names on a signed-in season board', async () => {
    const t = convexTest(schema, modules);
    await t.run(seedNamedBoard);

    const board = await t
      .withIdentity({ subject: 'viewer' })
      .query(api.leaderboards.getCombinedSeasonLeaderboard, { season: 2026 });

    expect(board.entries.map((entry) => entry.displayName)).toEqual([
      'Late Braker',
      'Apex Hunter',
    ]);
    expect(board.viewerEntry?.displayName).toBe('Apex Hunter');
  });

  it('keeps usernames only on an unsigned weekend board', async () => {
    const t = convexTest(schema, modules);
    const { raceId } = await t.run(seedNamedBoard);

    const board = await t.query(api.leaderboards.getCombinedRaceLeaderboard, {
      raceId,
    });

    expect(board.status).toBe('visible');
    if (board.status !== 'visible') {
      return;
    }
    expect(board.entries.map((entry) => entry.username)).toEqual([
      'late-braker',
      'apex-hunter',
    ]);
    expect(board.entries.map((entry) => entry.displayName)).toEqual([
      undefined,
      undefined,
    ]);
  });

  it('shows display names on a signed-in weekend board', async () => {
    const t = convexTest(schema, modules);
    const { raceId } = await t.run(seedNamedBoard);

    const board = await t
      .withIdentity({ subject: 'viewer' })
      .query(api.leaderboards.getCombinedRaceLeaderboard, { raceId });

    expect(board.status).toBe('visible');
    if (board.status !== 'visible') {
      return;
    }
    expect(board.entries.map((entry) => entry.displayName)).toEqual([
      'Late Braker',
      'Apex Hunter',
    ]);
  });
});
