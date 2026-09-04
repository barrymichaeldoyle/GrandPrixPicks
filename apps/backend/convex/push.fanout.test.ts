/// <reference types="vite/client" />

import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

/**
 * One page of the roster, mirroring PUSH_FANOUT_PAGE_SIZE in push.ts. The tests
 * below deliberately cross this boundary: the whole point of the fan-out is
 * that it survives a roster larger than a single transaction can read.
 */
const PAGE_SIZE = 100;

type SeedUser = {
  /** Web-push subscription rows to create for this user. */
  subscriptions?: number;
  /** Expo token rows to create for this user. */
  tokens?: number;
  /** Whether the user has already submitted a Top 5 for the race. */
  predicted?: boolean;
  pushPredictionReminders?: boolean;
  pushPredictionLockReminders?: boolean;
  pushResults?: boolean;
};

type ScheduledJob = {
  name: string;
  args: Record<string, unknown>;
};

function makeTest() {
  return convexTest(schema, modules);
}

async function seed(
  t: ReturnType<typeof makeTest>,
  users: Array<SeedUser>,
  raceStatus: 'upcoming' | 'locked' | 'finished' = 'upcoming',
): Promise<Id<'races'>> {
  return await t.run(async (ctx) => {
    const now = 1_000;
    const raceId = await ctx.db.insert('races', {
      season: 2026,
      round: 1,
      name: 'Bahrain Grand Prix',
      slug: 'bahrain-2026',
      raceStartAt: now + 86_400_000,
      predictionLockAt: now + 80_000_000,
      status: raceStatus,
      createdAt: now,
      updatedAt: now,
    });

    const driverId = await ctx.db.insert('drivers', {
      code: 'VER',
      displayName: 'Max Verstappen',
      team: 'Red Bull Racing',
      createdAt: now,
      updatedAt: now,
    });

    for (const [index, spec] of users.entries()) {
      const userId = await ctx.db.insert('users', {
        clerkUserId: `clerk_${index}`,
        pushPredictionReminders: spec.pushPredictionReminders,
        pushPredictionLockReminders: spec.pushPredictionLockReminders,
        pushResults: spec.pushResults,
        createdAt: now,
        updatedAt: now,
      });

      for (let n = 0; n < (spec.subscriptions ?? 1); n += 1) {
        await ctx.db.insert('pushSubscriptions', {
          userId,
          endpoint: `https://fcm.googleapis.com/fcm/send/u${index}-${n}`,
          p256dh: 'p256dh',
          auth: 'auth',
          createdAt: now,
        });
      }

      for (let n = 0; n < (spec.tokens ?? 0); n += 1) {
        await ctx.db.insert('expoPushTokens', {
          userId,
          token: `ExponentPushToken[u${index}-${n}]`,
          createdAt: now,
        });
      }

      if (spec.predicted) {
        await ctx.db.insert('predictions', {
          userId,
          raceId,
          sessionType: 'race',
          picks: [driverId, driverId, driverId, driverId, driverId],
          submittedAt: now,
          updatedAt: now,
        });
      }
    }

    return raceId;
  });
}

/**
 * Read the scheduler queue rather than executing it. `pushNotifications` is a
 * `'use node'` action that talks to FCM and Expo for real, so draining the
 * queue would put the suite on the network. The queue itself is the contract
 * we care about: who was told what, and whether another page was booked.
 */
async function scheduled(
  t: ReturnType<typeof makeTest>,
): Promise<Array<ScheduledJob>> {
  return await t.run(async (ctx) => {
    const jobs: Array<ScheduledJob> = [];
    for await (const job of ctx.db.system.query('_scheduled_functions')) {
      jobs.push({
        name: job.name,
        args: (job.args[0] ?? {}) as Record<string, unknown>,
      });
    }
    return jobs;
  });
}

function matching(jobs: Array<ScheduledJob>, fn: string): Array<ScheduledJob> {
  return jobs.filter((job) => job.name.includes(fn));
}

/** Every endpoint the queued web-push batches would deliver to. */
function deliveredEndpoints(jobs: Array<ScheduledJob>): Array<string> {
  return matching(jobs, 'sendPushBatch').flatMap((job) =>
    (job.args.subscriptions as Array<{ endpoint: string }>).map(
      (s) => s.endpoint,
    ),
  );
}

function deliveredTokens(jobs: Array<ScheduledJob>): Array<string> {
  return matching(jobs, 'sendExpoPushBatch').flatMap(
    (job) => job.args.tokens as Array<string>,
  );
}

function campaignsFor(
  jobs: Array<ScheduledJob>,
  endpoint: string,
): Array<string> {
  return matching(jobs, 'sendPushBatch')
    .filter((job) =>
      (job.args.subscriptions as Array<{ endpoint: string }>).some(
        (s) => s.endpoint === endpoint,
      ),
    )
    .map(
      (job) =>
        new URL(job.args.url as string, 'https://x').searchParams.get(
          'utm_campaign',
        ) as string,
    );
}

describe('sendPushRemindersForRace', () => {
  it('pages a roster larger than one transaction and reaches everyone once', async () => {
    const t = makeTest();
    const roster = PAGE_SIZE + 25;
    const raceId = await seed(
      t,
      Array.from({ length: roster }, () => ({ subscriptions: 1, tokens: 1 })),
    );

    const first = await t.mutation(internal.push.sendPushRemindersForRace, {
      raceId,
      filterUnpredicted: false,
    });

    // The first transaction must stop at a page boundary and book the rest.
    expect(first.done).toBe(false);
    expect(first.queued).toBe(PAGE_SIZE * 2); // one subscription + one token each

    const afterFirst = await scheduled(t);
    const continuations = matching(afterFirst, 'sendPushRemindersForRace');
    expect(continuations).toHaveLength(1);
    expect(continuations[0].args.cursor).toEqual(expect.any(String));

    const second = await t.mutation(internal.push.sendPushRemindersForRace, {
      raceId,
      filterUnpredicted: false,
      cursor: continuations[0].args.cursor as string,
      queued: continuations[0].args.queued as number,
    });

    expect(second.done).toBe(true);
    // `queued` accumulates across pages, so the last page reports the total.
    expect(second.queued).toBe(roster * 2);

    const all = await scheduled(t);
    const endpoints = deliveredEndpoints(all);
    expect(endpoints).toHaveLength(roster);
    expect(new Set(endpoints).size).toBe(roster); // nobody told twice
    expect(deliveredTokens(all)).toHaveLength(roster);
  });

  it('splits the 24h send into a reminder and a lock warning', async () => {
    const t = makeTest();
    const raceId = await seed(t, [
      { predicted: false }, // u0 — needs the nudge
      { predicted: true }, // u1 — already in, warn about the lock
    ]);

    const result = await t.mutation(internal.push.sendPushRemindersForRace, {
      raceId,
      filterUnpredicted: false,
    });
    expect(result).toEqual({ queued: 2, done: true });

    const jobs = await scheduled(t);
    expect(
      campaignsFor(jobs, 'https://fcm.googleapis.com/fcm/send/u0-0'),
    ).toEqual(['prediction_reminder']);
    expect(
      campaignsFor(jobs, 'https://fcm.googleapis.com/fcm/send/u1-0'),
    ).toEqual(['lock_approaching']);
  });

  it('the 2h send skips anyone who already has picks in', async () => {
    const t = makeTest();
    const raceId = await seed(t, [{ predicted: false }, { predicted: true }]);

    const result = await t.mutation(internal.push.sendPushRemindersForRace, {
      raceId,
      filterUnpredicted: true,
    });
    expect(result).toEqual({ queued: 1, done: true });

    const jobs = await scheduled(t);
    expect(deliveredEndpoints(jobs)).toEqual([
      'https://fcm.googleapis.com/fcm/send/u0-0',
    ]);
    expect(
      campaignsFor(jobs, 'https://fcm.googleapis.com/fcm/send/u0-0'),
    ).toEqual(['last_chance']);
  });

  it('honours both reminder opt-outs independently', async () => {
    const t = makeTest();
    const raceId = await seed(t, [
      { predicted: false, pushPredictionReminders: false },
      { predicted: true, pushPredictionLockReminders: false },
      { predicted: false, pushPredictionReminders: true },
    ]);

    const result = await t.mutation(internal.push.sendPushRemindersForRace, {
      raceId,
      filterUnpredicted: false,
    });
    expect(result).toEqual({ queued: 1, done: true });

    expect(deliveredEndpoints(await scheduled(t))).toEqual([
      'https://fcm.googleapis.com/fcm/send/u2-0',
    ]);
  });

  it('stops paging if the weekend locks part-way through the fan-out', async () => {
    const t = makeTest();
    const raceId = await seed(
      t,
      Array.from({ length: PAGE_SIZE + 5 }, () => ({})),
    );

    const first = await t.mutation(internal.push.sendPushRemindersForRace, {
      raceId,
      filterUnpredicted: false,
    });
    expect(first.done).toBe(false);

    const cursor = matching(await scheduled(t), 'sendPushRemindersForRace')[0]
      .args.cursor as string;

    // Picks close before the continuation runs. Reminding the remaining page
    // now would point them at a race they can no longer pick.
    await t.run(async (ctx) => {
      await ctx.db.patch(raceId, { status: 'locked' });
    });

    const second = await t.mutation(internal.push.sendPushRemindersForRace, {
      raceId,
      filterUnpredicted: false,
      cursor,
      queued: first.queued,
    });

    expect(second).toEqual({
      queued: PAGE_SIZE,
      done: true,
      reason: 'Race not upcoming',
    });
    expect(deliveredEndpoints(await scheduled(t))).toHaveLength(PAGE_SIZE);
  });

  it('queues nothing when no one has a device registered', async () => {
    const t = makeTest();
    const raceId = await seed(t, [{ subscriptions: 0, tokens: 0 }]);

    const result = await t.mutation(internal.push.sendPushRemindersForRace, {
      raceId,
      filterUnpredicted: false,
    });

    expect(result).toEqual({ queued: 0, done: true });
    expect(await scheduled(t)).toEqual([]);
  });
});

describe('sendPushResultsForSession', () => {
  it('pages the roster and delivers to every device exactly once', async () => {
    const t = makeTest();
    const roster = PAGE_SIZE + 10;
    const raceId = await seed(
      t,
      Array.from({ length: roster }, () => ({ subscriptions: 2 })),
      'finished',
    );

    const first = await t.mutation(internal.push.sendPushResultsForSession, {
      raceId,
      sessionType: 'race',
    });
    expect(first.done).toBe(false);

    const continuation = matching(
      await scheduled(t),
      'sendPushResultsForSession',
    )[0];
    const second = await t.mutation(internal.push.sendPushResultsForSession, {
      raceId,
      sessionType: 'race',
      cursor: continuation.args.cursor as string,
      queued: continuation.args.queued as number,
    });

    expect(second.done).toBe(true);
    expect(second.queued).toBe(roster * 2);

    const endpoints = deliveredEndpoints(await scheduled(t));
    expect(endpoints).toHaveLength(roster * 2);
    expect(new Set(endpoints).size).toBe(roster * 2);
  });

  it('respects the results opt-out', async () => {
    const t = makeTest();
    const raceId = await seed(
      t,
      [{ pushResults: false }, { pushResults: true }, {}],
      'finished',
    );

    const result = await t.mutation(internal.push.sendPushResultsForSession, {
      raceId,
      sessionType: 'race',
    });

    // u1 opted in explicitly, u2 left the default (push is opt-out).
    expect(result).toEqual({ queued: 2, done: true });
    expect(deliveredEndpoints(await scheduled(t)).sort()).toEqual([
      'https://fcm.googleapis.com/fcm/send/u1-0',
      'https://fcm.googleapis.com/fcm/send/u2-0',
    ]);
  });

  it('skips a race that no longer exists', async () => {
    const t = makeTest();
    const raceId = await seed(t, [{}], 'finished');
    await t.run(async (ctx) => {
      await ctx.db.delete(raceId);
    });

    const result = await t.mutation(internal.push.sendPushResultsForSession, {
      raceId,
      sessionType: 'race',
    });

    expect(result).toEqual({ queued: 0, done: true, reason: 'Race not found' });
    expect(await scheduled(t)).toEqual([]);
  });
});
