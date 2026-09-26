/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api, internal } from './_generated/api';
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

describe('liveClassification.refresh', () => {
  afterEach(() => vi.unstubAllGlobals());

  async function seedQualifyingUnderway(t: ReturnType<typeof convexTest>) {
    const qualiStartAt = Date.now() - 2 * 60_000;
    await t.run(async (ctx) => {
      await ctx.db.insert('races', {
        season: 2026,
        round: 17,
        name: 'Azerbaijan Grand Prix',
        slug: 'azerbaijan-2026',
        raceStartAt: Date.now() + 24 * HOUR,
        predictionLockAt: qualiStartAt,
        qualiStartAt,
        status: 'upcoming',
        createdAt: 0,
        updatedAt: 0,
      });
    });
    return qualiStartAt;
  }

  function stubOpenF1(qualiStartAt: number, laps: Response) {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: URL | string) => {
        const url = new URL(String(input));
        if (url.pathname === '/v1/sessions') {
          return Response.json([
            {
              session_key: 9001,
              session_name: 'Qualifying',
              date_start: new Date(qualiStartAt).toISOString(),
            },
          ]);
        }
        if (url.pathname === '/v1/laps') {
          return laps;
        }
        if (url.pathname === '/v1/drivers') {
          return Response.json([]);
        }
        throw new Error(`Unexpected OpenF1 request: ${url.pathname}`);
      }),
    );
  }

  it('waits quietly while OpenF1 has no laps for the session yet', async () => {
    const t = convexTest(schema, modules);
    const qualiStartAt = await seedQualifyingUnderway(t);
    stubOpenF1(
      qualiStartAt,
      Response.json({ detail: 'No results found.' }, { status: 404 }),
    );

    await expect(
      t.action(internal.liveClassification.refresh, {}),
    ).resolves.toBeNull();
    const rows = await t.run((ctx) =>
      ctx.db.query('liveClassifications').collect(),
    );
    expect(rows).toEqual([]);
  });

  it('still fails on a real OpenF1 outage', async () => {
    const t = convexTest(schema, modules);
    const qualiStartAt = await seedQualifyingUnderway(t);
    stubOpenF1(qualiStartAt, new Response('upstream down', { status: 500 }));

    await expect(
      t.action(internal.liveClassification.refresh, {}),
    ).rejects.toThrow(/HTTP 500/);
  });
});
