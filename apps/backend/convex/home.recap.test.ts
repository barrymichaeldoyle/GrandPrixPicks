/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { RESULTS_FIRST_WINDOW_MS } from './home';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

const HOUR = 60 * 60 * 1000;

type Ctx = Parameters<Parameters<ReturnType<typeof convexTest>['run']>[0]>[0];

async function addUser(ctx: Ctx, username: string) {
  return await ctx.db.insert('users', {
    clerkUserId: username,
    username,
    displayName: username,
    createdAt: 0,
    updatedAt: 0,
  });
}

async function addRaceScore(
  ctx: Ctx,
  args: {
    userId: Id<'users'>;
    raceId: Id<'races'>;
    top5Points?: number;
    h2hPoints?: number;
  },
) {
  if (args.top5Points !== undefined) {
    await ctx.db.insert('scores', {
      userId: args.userId,
      raceId: args.raceId,
      sessionType: 'race',
      points: args.top5Points,
      createdAt: 0,
      updatedAt: 0,
    });
  }
  if (args.h2hPoints !== undefined) {
    await ctx.db.insert('h2hScores', {
      userId: args.userId,
      raceId: args.raceId,
      sessionType: 'race',
      points: args.h2hPoints,
      correctPicks: args.h2hPoints,
      totalPicks: 11,
      createdAt: 0,
      updatedAt: 0,
    });
  }
}

async function addSeasonPoints(
  ctx: Ctx,
  args: {
    userId: Id<'users'>;
    top5Points: number;
    h2hPoints?: number;
  },
) {
  await ctx.db.insert('seasonStandings', {
    userId: args.userId,
    season: 2026,
    totalPoints: args.top5Points,
    raceCount: 3,
    updatedAt: 0,
  });
  if (args.h2hPoints !== undefined) {
    await ctx.db.insert('h2hSeasonStandings', {
      userId: args.userId,
      season: 2026,
      totalPoints: args.h2hPoints,
      raceCount: 3,
      correctPicks: args.h2hPoints,
      totalPicks: 33,
      updatedAt: 0,
    });
  }
}

/**
 * Publishing the race result is what makes a weekend final, so a fixture that
 * wants a scored race has to write one. Qualifying scores alone do not count:
 * they exist from Saturday, while the race is still to be run.
 */
async function publishRaceResult(ctx: Ctx, raceId: Id<'races'>) {
  await ctx.db.insert('results', {
    raceId,
    sessionType: 'race',
    classification: [],
    scoringStatus: 'complete',
    publishedAt: 0,
    updatedAt: 0,
  });
}

async function addRace(
  ctx: Ctx,
  args: {
    round: number;
    name: string;
    slug: string;
    raceStartAt: number;
    status: 'upcoming' | 'locked' | 'finished' | 'cancelled';
  },
) {
  return await ctx.db.insert('races', {
    season: 2026,
    round: args.round,
    name: args.name,
    slug: args.slug,
    raceStartAt: args.raceStartAt,
    predictionLockAt: args.raceStartAt,
    status: args.status,
    createdAt: 0,
    updatedAt: 0,
  });
}

describe('home.getRaceRecap', () => {
  it('returns nothing when no race has run recently', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await addRace(ctx, {
        round: 1,
        name: 'Australian Grand Prix',
        slug: 'australia-2026',
        raceStartAt: Date.now() - 30 * 24 * HOUR,
        status: 'finished',
      });
    });

    expect(await t.query(api.home.getRaceRecap, {})).toBeNull();
  });

  it('reports a race that has run but is not scored yet as pending', async () => {
    const t = convexTest(schema, modules);
    const raceStartAt = Date.now() - HOUR;
    await t.run(async (ctx) => {
      await addRace(ctx, {
        round: 16,
        name: 'Bahrain Grand Prix',
        slug: 'bahrain-2026',
        raceStartAt,
        status: 'locked',
      });
    });

    const recap = await t.query(api.home.getRaceRecap, {});

    expect(recap?.status).toBe('pending');
    expect(recap?.viewer).toBeNull();
    expect(recap?.playerCount).toBe(0);
    // The window is measured from the race start, not from the publish.
    expect(recap?.windowEndsAt).toBe(raceStartAt + RESULTS_FIRST_WINDOW_MS);
  });

  it('skips a cancelled round and scores the race that was actually run', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await addRace(ctx, {
        round: 16,
        name: 'Bahrain Grand Prix',
        slug: 'bahrain-2026',
        raceStartAt: Date.now() - 3 * HOUR,
        status: 'finished',
      });
      // More recent, so it wins the index scan, and must still be passed over.
      await addRace(ctx, {
        round: 17,
        name: 'Cancelled Grand Prix',
        slug: 'cancelled-2026',
        raceStartAt: Date.now() - HOUR,
        status: 'cancelled',
      });
    });

    const recap = await t.query(api.home.getRaceRecap, {});

    expect(recap?.race.name).toBe('Bahrain Grand Prix');
  });

  it('gives the viewer their result, their season move and the players they follow', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const race = await addRace(ctx, {
        round: 16,
        name: 'Bahrain Grand Prix',
        slug: 'bahrain-2026',
        raceStartAt: Date.now() - 3 * HOUR,
        status: 'finished',
      });
      await publishRaceResult(ctx, race);

      const viewer = await addUser(ctx, 'viewer');
      const friend = await addUser(ctx, 'friend');
      const stranger = await addUser(ctx, 'stranger');
      await ctx.db.insert('follows', {
        followerId: viewer,
        followeeId: friend,
        createdAt: 0,
      });

      await addRaceScore(ctx, {
        userId: viewer,
        raceId: race,
        top5Points: 20,
        h2hPoints: 4,
      });
      await addRaceScore(ctx, { userId: friend, raceId: race, top5Points: 5 });
      await addRaceScore(ctx, {
        userId: stranger,
        raceId: race,
        top5Points: 30,
      });

      // Season totals include the race above. Before it the viewer sat behind
      // the friend (106 to 123) and the race put them ahead (130 to 128), so
      // the recap has one place of climb to report.
      await addSeasonPoints(ctx, {
        userId: viewer,
        top5Points: 120,
        h2hPoints: 10,
      });
      await addSeasonPoints(ctx, { userId: friend, top5Points: 128 });
      await addSeasonPoints(ctx, { userId: stranger, top5Points: 200 });
    });

    const recap = await t
      .withIdentity({ subject: 'viewer' })
      .query(api.home.getRaceRecap, {});

    expect(recap?.status).toBe('scored');
    expect(recap?.playerCount).toBe(3);
    expect(recap?.viewer).toMatchObject({
      points: 24,
      top5Points: 20,
      h2hPoints: 4,
      rank: 2,
      fieldSize: 3,
      seasonRank: 2,
      seasonRankDelta: 1,
    });

    // The viewer and the one player they follow, in race order. The stranger
    // counts toward the field and never reaches this table.
    expect(recap?.friends.map((row) => row.username)).toEqual([
      'viewer',
      'friend',
    ]);
    expect(recap?.friends[0].isViewer).toBe(true);
    expect(recap?.friendCount).toBe(1);
  });

  it('keeps the viewer in the followed table when they finish outside it', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const race = await addRace(ctx, {
        round: 16,
        name: 'Bahrain Grand Prix',
        slug: 'bahrain-2026',
        raceStartAt: Date.now() - 3 * HOUR,
        status: 'finished',
      });
      await publishRaceResult(ctx, race);

      const viewer = await addUser(ctx, 'viewer');
      await addRaceScore(ctx, { userId: viewer, raceId: race, top5Points: 1 });

      // Six followed players, every one of them ahead of the viewer.
      for (let i = 0; i < 6; i++) {
        const friend = await addUser(ctx, `friend-${i}`);
        await ctx.db.insert('follows', {
          followerId: viewer,
          followeeId: friend,
          createdAt: 0,
        });
        await addRaceScore(ctx, {
          userId: friend,
          raceId: race,
          top5Points: 10 + i,
        });
      }
    });

    const recap = await t
      .withIdentity({ subject: 'viewer' })
      .query(api.home.getRaceRecap, {});

    expect(recap?.friends).toHaveLength(5);
    expect(recap?.friends.at(-1)?.isViewer).toBe(true);
    expect(recap?.friendCount).toBe(6);
  });
  it('reports a running race as live, from the snapshot standings', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const race = await addRace(ctx, {
        round: 16,
        name: 'Bahrain Grand Prix',
        slug: 'bahrain-2026',
        // Started an hour ago: inside the two-hour live window.
        raceStartAt: Date.now() - HOUR,
        status: 'locked',
      });

      const viewer = await addUser(ctx, 'viewer');
      const friend = await addUser(ctx, 'friend');
      const stranger = await addUser(ctx, 'stranger');
      await ctx.db.insert('follows', {
        followerId: viewer,
        followeeId: friend,
        createdAt: 0,
      });

      // Qualifying was scored yesterday. The recap must not read these as a
      // finished weekend while the race is still running.
      await addRaceScore(ctx, { userId: viewer, raceId: race, top5Points: 9 });

      const driver = await ctx.db.insert('drivers', {
        code: 'VER',
        displayName: 'Max Verstappen',
        number: 1,
        createdAt: 0,
        updatedAt: 0,
      });
      await ctx.db.insert('liveSnapshots', {
        raceId: race,
        sessionType: 'race',
        order: [{ driverId: driver, position: 1 }],
        standings: [
          { userId: stranger, rank: 1, topFive: 20, h2h: 3, weekend: 30 },
          { userId: viewer, rank: 2, topFive: 12, h2h: 2, weekend: 23 },
          { userId: friend, rank: 3, topFive: 5, h2h: 1, weekend: 11 },
        ],
        source: 'openf1-position',
        updatedAt: Date.now(),
      });
    });

    const recap = await t
      .withIdentity({ subject: 'viewer' })
      .query(api.home.getRaceRecap, {});

    expect(recap?.status).toBe('live');
    expect(recap?.live?.sessionType).toBe('race');
    expect(recap?.playerCount).toBe(3);
    expect(recap?.viewer).toMatchObject({
      points: 23,
      top5Points: 12,
      h2hPoints: 2,
      rank: 2,
      fieldSize: 3,
    });
    // Nothing settled enough to report a season move mid-session.
    expect(recap?.viewer?.seasonRank).toBeNull();
    expect(recap?.viewer?.seasonRankDelta).toBeNull();
    expect(recap?.friends.map((row) => row.username)).toEqual([
      'viewer',
      'friend',
    ]);
  });

  it('does not call a weekend scored on qualifying points alone', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const race = await addRace(ctx, {
        round: 16,
        name: 'Bahrain Grand Prix',
        slug: 'bahrain-2026',
        raceStartAt: Date.now() - HOUR,
        status: 'locked',
      });
      const viewer = await addUser(ctx, 'viewer');
      // Saturday's points, no race result, and nothing reporting live.
      await addRaceScore(ctx, { userId: viewer, raceId: race, top5Points: 9 });
    });

    const recap = await t
      .withIdentity({ subject: 'viewer' })
      .query(api.home.getRaceRecap, {});

    expect(recap?.status).toBe('pending');
  });

  it('stops calling a race live once its result is published', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const race = await addRace(ctx, {
        round: 16,
        name: 'Bahrain Grand Prix',
        slug: 'bahrain-2026',
        raceStartAt: Date.now() - HOUR,
        status: 'finished',
      });
      const viewer = await addUser(ctx, 'viewer');
      const driver = await ctx.db.insert('drivers', {
        code: 'VER',
        displayName: 'Max Verstappen',
        number: 1,
        createdAt: 0,
        updatedAt: 0,
      });
      await ctx.db.insert('liveSnapshots', {
        raceId: race,
        sessionType: 'race',
        order: [{ driverId: driver, position: 1 }],
        standings: [
          { userId: viewer, rank: 1, topFive: 12, h2h: 2, weekend: 23 },
        ],
        source: 'openf1-position',
        updatedAt: Date.now(),
      });
      await publishRaceResult(ctx, race);
      await addRaceScore(ctx, { userId: viewer, raceId: race, top5Points: 14 });
    });

    const recap = await t
      .withIdentity({ subject: 'viewer' })
      .query(api.home.getRaceRecap, {});

    // The published result wins: the stale snapshot's 23 must not survive it.
    expect(recap?.status).toBe('scored');
    expect(recap?.viewer?.points).toBe(14);
  });
});
