/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api } from './_generated/api';
import { bestLapOrder } from './liveClassification';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

const HOUR = 60 * 60 * 1000;

type Ctx = Parameters<Parameters<ReturnType<typeof convexTest>['run']>[0]>[0];

describe('bestLapOrder', () => {
  it('keeps each driver best lap and ranks timed drivers', () => {
    expect(
      bestLapOrder([
        { driver_number: 4, lap_duration: 82.1 },
        { driver_number: 1, lap_duration: 81.9 },
        { driver_number: 4, lap_duration: 81.7 },
        { driver_number: 1, lap_duration: null },
      ]),
    ).toEqual([
      { driverNumber: 4, bestLapSeconds: 81.7 },
      { driverNumber: 1, bestLapSeconds: 81.9 },
    ]);
  });
});

describe('liveClassification.current', () => {
  async function seedLiveQualifying(ctx: Ctx) {
    const raceId = await ctx.db.insert('races', {
      season: 2026,
      round: 14,
      name: 'Spanish Grand Prix',
      slug: 'madrid-2026',
      raceStartAt: Date.now() + HOUR,
      predictionLockAt: Date.now() + HOUR,
      status: 'upcoming',
      createdAt: 0,
      updatedAt: 0,
    });
    await ctx.db.insert('liveClassifications', {
      raceId,
      raceName: 'Spanish Grand Prix',
      raceSlug: 'madrid-2026',
      sessionType: 'quali',
      entries: [
        {
          position: 1,
          driverNumber: 44,
          code: 'HAM',
          displayName: 'Lewis Hamilton',
          team: 'Ferrari',
          bestLapSeconds: 92.079,
        },
      ],
      updatedAt: Date.now(),
    });
    return raceId;
  }

  it('shows the running order while the session is unpublished', async () => {
    const t = convexTest(schema, modules);
    await t.run(seedLiveQualifying);

    const live = await t.query(api.liveClassification.current, {});

    expect(live?.sessionType).toBe('quali');
  });

  it('stops once the session has been published', async () => {
    // The board and the published classification are the same session, and the
    // provisional one was sitting on top of the real one.
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const raceId = await seedLiveQualifying(ctx);
      const driverId = await ctx.db.insert('drivers', {
        code: 'HAM',
        displayName: 'Lewis Hamilton',
        createdAt: 0,
        updatedAt: 0,
      });
      await ctx.db.insert('results', {
        raceId,
        sessionType: 'quali',
        classification: [driverId],
        publishedAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    expect(await t.query(api.liveClassification.current, {})).toBeNull();
  });

  it('stops once practice has been published', async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      const raceId = await seedLiveQualifying(ctx);
      const row = await ctx.db.query('liveClassifications').first();
      await ctx.db.patch(row!._id, { sessionType: 'fp2' });
      await ctx.db.insert('practiceResults', {
        raceId,
        sessionType: 'fp2',
        openF1SessionKey: 9999,
        entries: [],
        publishedAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    expect(await t.query(api.liveClassification.current, {})).toBeNull();
  });
});
