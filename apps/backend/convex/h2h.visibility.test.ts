/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api } from './_generated/api';
import { canViewH2HPicksForSession } from './h2h';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

describe('canViewH2HPicksForSession', () => {
  const lockTime = 1_000_000;

  it('allows owners before lock', () => {
    expect(
      canViewH2HPicksForSession({
        isOwner: true,
        lockTime,
        now: lockTime - 1,
      }),
    ).toBe(true);
  });

  it('blocks non-owners before lock', () => {
    expect(
      canViewH2HPicksForSession({
        isOwner: false,
        lockTime,
        now: lockTime - 1,
      }),
    ).toBe(false);
  });

  it('blocks non-owners when lock time is missing', () => {
    expect(
      canViewH2HPicksForSession({
        isOwner: false,
        lockTime: undefined,
        now: lockTime + 1,
      }),
    ).toBe(false);
  });

  it('allows non-owners after lock', () => {
    expect(
      canViewH2HPicksForSession({
        isOwner: false,
        lockTime,
        now: lockTime,
      }),
    ).toBe(true);
  });
});

it('keeps owner H2H queries visible and visitor queries locked until the session lock', async () => {
  const t = convexTest(schema, modules);
  const { userId, raceId } = await t.run(async (ctx) => {
    const userId = await ctx.db.insert('users', {
      clerkUserId: 'owner',
      createdAt: 0,
      updatedAt: 0,
    });
    const raceId = await ctx.db.insert('races', {
      season: 2026,
      round: 1,
      name: 'Race',
      slug: 'race',
      status: 'upcoming',
      raceStartAt: Date.now() + 3_600_000,
      predictionLockAt: Date.now() + 3_600_000,
      createdAt: 0,
      updatedAt: 0,
    });
    const driverIds = [];
    for (const code of ['AAA', 'BBB']) {
      driverIds.push(
        await ctx.db.insert('drivers', {
          code,
          displayName: code,
          team: 'McLaren',
          createdAt: 0,
          updatedAt: 0,
        }),
      );
    }
    const matchupId = await ctx.db.insert('h2hMatchups', {
      season: 2026,
      team: 'McLaren',
      driver1Id: driverIds[0],
      driver2Id: driverIds[1],
      fromRound: 1,
      createdAt: 0,
      updatedAt: 0,
    });
    await ctx.db.insert('h2hPredictions', {
      userId,
      raceId,
      sessionType: 'race',
      matchupId,
      predictedWinnerId: driverIds[0],
      submittedAt: 1,
      updatedAt: 1,
    });
    return { userId, raceId };
  });
  const owner = t.withIdentity({ subject: 'owner' });
  expect(
    await owner.query(api.h2h.getUserH2HPicksByRace, { userId }),
  ).toHaveLength(1);
  expect(
    (await owner.query(api.h2h.getUserH2HDetailedPicks, { userId, raceId }))
      ?.race,
  ).toHaveLength(1);
  expect(
    await owner.query(api.h2h.getH2HPicksForFeedItem, {
      userId,
      raceId,
      sessionType: 'race',
    }),
  ).toHaveLength(1);
  expect(await t.query(api.h2h.getUserH2HPicksByRace, { userId })).toEqual([]);
  expect(
    (await t.query(api.h2h.getUserH2HDetailedPicks, { userId, raceId }))?.race,
  ).toBeNull();
  expect(
    await t.query(api.h2h.getH2HPicksForFeedItem, {
      userId,
      raceId,
      sessionType: 'race',
    }),
  ).toBeNull();
  await t.run((ctx) =>
    ctx.db.patch('races', raceId, { predictionLockAt: Date.now() - 1 }),
  );
  expect(await t.query(api.h2h.getUserH2HPicksByRace, { userId })).toHaveLength(
    1,
  );
  expect(
    (await t.query(api.h2h.getUserH2HDetailedPicks, { userId, raceId }))?.race,
  ).toHaveLength(1);
  expect(
    await t.query(api.h2h.getH2HPicksForFeedItem, {
      userId,
      raceId,
      sessionType: 'race',
    }),
  ).toHaveLength(1);
});
