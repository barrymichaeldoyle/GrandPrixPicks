/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { api, internal } from './_generated/api';
import { bestLapOrder, qualifyingOrder } from './liveClassification';
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

describe('qualifyingOrder', () => {
  const Q1_END = '2026-10-10T13:18:00+00:00';
  const Q2_END = '2026-10-10T13:35:00+00:00';
  const phase1 = { date: '2026-10-10T13:00:00+00:00', qualifying_phase: 1 };
  const phase2 = { date: '2026-10-10T13:19:00+00:00', qualifying_phase: 2 };
  const phase3 = { date: '2026-10-10T13:36:00+00:00', qualifying_phase: 3 };
  function chequer(date: string) {
    return { date, flag: 'CHEQUERED' };
  }
  function lap(
    driver: number,
    lapNumber: number,
    start: string,
    duration: number | null,
  ) {
    return {
      driver_number: driver,
      lap_number: lapNumber,
      date_start: start,
      lap_duration: duration,
    };
  }
  // Ten cars reach Q3, so a twelve-car grid loses one in each of Q1 and Q2.
  const grid = Array.from({ length: 12 }, (_, index) => index + 1);
  const q1Laps = grid.map((driver) =>
    lap(driver, 2, '2026-10-10T13:05:00+00:00', 90 + driver / 10),
  );

  it('returns null without segment data, so practice ordering applies', () => {
    expect(qualifyingOrder(q1Laps, [], 12)).toBeNull();
  });

  it('marks the bottom of Q1 as out once the flag falls', () => {
    const order = qualifyingOrder(q1Laps, [phase1, chequer(Q1_END)], 12);

    expect(order?.phase).toBe(1);
    expect(order?.entries.at(-1)).toEqual({
      driverNumber: 12,
      bestLapSeconds: 91.2,
      knockedOutIn: 1,
    });
    expect(order?.entries.filter((entry) => entry.knockedOutIn)).toHaveLength(
      1,
    );
  });

  it('ranks Q2 by Q2 laps and keeps Q1 knockouts below, even when faster', () => {
    const order = qualifyingOrder(
      [
        ...q1Laps,
        // Car 12 tops Q1 with a lap quicker than anything in Q2 so far.
        lap(12, 3, '2026-10-10T13:10:00+00:00', 80),
        lap(5, 4, '2026-10-10T13:20:00+00:00', 89.5),
        lap(2, 4, '2026-10-10T13:20:30+00:00', 89.9),
      ],
      [phase1, chequer(Q1_END), phase2],
      12,
    );

    expect(order?.phase).toBe(2);
    expect(order?.entries.map((entry) => entry.driverNumber)).toEqual([
      5, 2, 12, 1, 3, 4, 6, 7, 8, 9, 10, 11,
    ]);
    // Car 12 was the quickest in Q1, so the Q1 knockout is car 11.
    expect(order?.entries.at(-1)).toMatchObject({
      driverNumber: 11,
      knockedOutIn: 1,
    });
    // No Q2 lap yet: still through, below the Q2 times, in Q1 order.
    expect(order?.entries[2]).toEqual({
      driverNumber: 12,
      bestLapSeconds: null,
    });
  });

  it('keeps showing Q1 until Q2 opens, ignoring the in-laps between', () => {
    const order = qualifyingOrder(
      [...q1Laps, lap(5, 3, '2026-10-10T13:18:30+00:00', 122.8)],
      [phase1, chequer(Q1_END)],
      12,
    );

    expect(order?.phase).toBe(1);
    expect(order?.entries[0]).toEqual({
      driverNumber: 1,
      bestLapSeconds: 90.1,
    });
  });

  it('ignores deleted laps and pit-out laps', () => {
    const order = qualifyingOrder(
      [
        ...q1Laps,
        lap(12, 3, '2026-10-10T13:10:00+00:00', 80),
        {
          ...lap(11, 1, '2026-10-10T13:01:00+00:00', 70),
          is_pit_out_lap: true,
        },
      ],
      [
        phase1,
        {
          date: '2026-10-10T13:11:00+00:00',
          message:
            'CAR 12 (BOT) TIME 1:20.000 DELETED - TRACK LIMITS AT TURN 4 LAP 3 21:10:00',
        },
      ],
      12,
    );

    expect(order?.entries.slice(-2).map((entry) => entry.driverNumber)).toEqual(
      [11, 12],
    );
  });

  it('lists Q2 knockouts above Q1 knockouts during Q3', () => {
    const order = qualifyingOrder(
      [
        ...q1Laps,
        ...grid
          .slice(0, 11)
          .map((driver) =>
            lap(driver, 4, '2026-10-10T13:22:00+00:00', 89 + driver / 10),
          ),
        lap(3, 6, '2026-10-10T13:40:00+00:00', 88),
      ],
      [phase1, chequer(Q1_END), phase2, chequer(Q2_END), phase3],
      12,
    );

    expect(order?.phase).toBe(3);
    expect(
      order?.entries.map((entry) => [
        entry.driverNumber,
        entry.knockedOutIn ?? 0,
      ]),
    ).toEqual([
      [3, 0],
      [1, 0],
      [2, 0],
      [4, 0],
      [5, 0],
      [6, 0],
      [7, 0],
      [8, 0],
      [9, 0],
      [10, 0],
      [11, 2],
      [12, 1],
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

describe('liveClassification.activeTask', () => {
  it('finds a rescheduled session among future and historical races', async () => {
    const t = convexTest(schema, modules);
    const now = Date.UTC(2026, 9, 4, 10);
    const raceId = await t.run(async (ctx) => {
      for (let round = 1; round <= 40; round++) {
        await ctx.db.insert('races', {
          season: 2027,
          round,
          name: 'Future',
          slug: `future-${round}`,
          raceStartAt: now + 100 * HOUR,
          predictionLockAt: now + 100 * HOUR,
          fp1StartAt: now + 90 * HOUR,
          status: 'upcoming',
          createdAt: 0,
          updatedAt: 0,
        });
      }
      // Session time is the source of truth even when the main race was moved.
      return ctx.db.insert('races', {
        season: 2026,
        round: 1,
        name: 'Rescheduled',
        slug: 'rescheduled',
        raceStartAt: now - 30 * 24 * HOUR,
        predictionLockAt: now - 30 * 24 * HOUR,
        sprintQualiStartAt: now - HOUR,
        status: 'locked',
        createdAt: 0,
        updatedAt: 0,
      });
    });
    expect(
      await t.query(internal.liveClassification.activeTask, { now }),
    ).toMatchObject({ raceId, sessionType: 'sprint_quali' });
    expect(
      await t.query(internal.liveClassification.activeTask, {
        now: now + HOUR,
      }),
    ).toBeNull();
  });

  it('keeps qualifying active for two hours and practice for ninety minutes', async () => {
    const t = convexTest(schema, modules);
    const now = Date.UTC(2026, 9, 4, 10);
    const raceId = await t.run((ctx) =>
      ctx.db.insert('races', {
        season: 2026,
        round: 1,
        name: 'Timed',
        slug: 'timed',
        status: 'locked',
        raceStartAt: now + HOUR,
        predictionLockAt: now + HOUR,
        fp1StartAt: now - 91 * 60_000,
        qualiStartAt: now - 119 * 60_000,
        createdAt: 0,
        updatedAt: 0,
      }),
    );
    expect(
      await t.query(internal.liveClassification.activeTask, { now }),
    ).toMatchObject({ raceId, sessionType: 'quali' });
    expect(
      await t.query(internal.liveClassification.activeTask, {
        now: now + 2 * 60_000,
      }),
    ).toBeNull();
  });
});
