/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import schema from './schema';

const modules = import.meta.glob('./**/*.{ts,tsx}');

vi.mock('./lib/email', () => ({ sendEmail: vi.fn(async () => 'email-id') }));
const HOUR = 3600000;

beforeEach(() => {
  vi.stubEnv('NOTIFICATION_DELIVERY_ENABLED', 'true');
  vi.stubEnv('CONVEX_SITE_URL', 'https://test.convex.site');
  return () => vi.unstubAllEnvs();
});

/**
 * Three rounds: Monza is scored, Madrid is finished, Baku opens in 20h. The
 * reader played Monza (12 points, beaten by one other player), skipped Madrid.
 */
async function seasonWithALapsedReader() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    function user(email: string) {
      return ctx.db.insert('users', {
        clerkUserId: email,
        email,
        emailPredictionReminders: true,
        emailResults: true,
        createdAt: now,
        updatedAt: now,
      });
    }
    const [lapsedId, rivalId] = await Promise.all([
      user('lapsed@example.com'),
      user('rival@example.com'),
    ]);
    function race(
      round: number,
      slug: string,
      name: string,
      status: 'finished' | 'upcoming',
      lockAt: number,
    ) {
      return ctx.db.insert('races', {
        season: 2026,
        round,
        name,
        slug,
        status,
        qualiLockAt: lockAt,
        predictionLockAt: lockAt + 24 * HOUR,
        raceStartAt: lockAt + 24 * HOUR,
        createdAt: now,
        updatedAt: now,
      });
    }
    const monzaId = await race(
      13,
      'italy-2026',
      'Italian Grand Prix',
      'finished',
      now - 30 * 24 * HOUR,
    );
    const madridId = await race(
      14,
      'madrid-2026',
      'Madrid Grand Prix',
      'finished',
      now - 16 * 24 * HOUR,
    );
    // The real registry has a Baku write-up, which is what the lead links to.
    const bakuId = await race(
      15,
      'azerbaijan-2026',
      'Azerbaijan Grand Prix',
      'upcoming',
      now + 20 * HOUR,
    );
    const driverId = await ctx.db.insert('drivers', {
      code: 'NOR',
      displayName: 'Lando Norris',
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('predictions', {
      userId: lapsedId,
      raceId: monzaId,
      sessionType: 'race',
      picks: [driverId],
      submittedAt: now - 31 * 24 * HOUR,
      updatedAt: now - 31 * 24 * HOUR,
    });
    for (const [userId, points] of [
      [lapsedId, 12],
      [rivalId, 20],
    ] as const) {
      await ctx.db.insert('scores', {
        userId,
        raceId: monzaId,
        sessionType: 'race',
        points,
        breakdown: [
          {
            driverId,
            predictedPosition: 2,
            actualPosition: 2,
            points: 5,
          },
        ],
        createdAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.insert('raceNews', {
      raceId: bakuId,
      key: 'baku-wind',
      headline: 'Baku forecast: 40 km/h gusts for qualifying',
      body: 'Wind is the story.',
      sourceName: 'FIA',
      sourceUrl: 'https://example.com/wind',
      category: 'general',
      affectsSessions: [],
      active: true,
      publishedAt: now - HOUR,
      updatedAt: now - HOUR,
    });
    return { lapsedId, rivalId, monzaId, madridId, bakuId };
  });
  return { t, ...ids };
}

async function scheduledDeliveries(
  t: Awaited<ReturnType<typeof seasonWithALapsedReader>>['t'],
) {
  return await t.run((ctx) =>
    ctx.db.system
      .query('_scheduled_functions')
      .filter((q) =>
        q.eq(q.field('name'), 'emails/deliverNotificationEmail:deliver'),
      )
      .collect(),
  );
}

async function sendReminder(
  t: Awaited<ReturnType<typeof seasonWithALapsedReader>>['t'],
  userId: Id<'users'>,
  raceId: Id<'races'>,
) {
  await t.mutation(internal.notificationEmails.queue, {
    userId,
    raceId,
    kind: 'reminder',
  });
  const [job] = await t.run((ctx) =>
    ctx.db.query('notificationEmails').collect(),
  );
  await t.mutation(internal.notificationEmails.send, { id: job._id });
  return job;
}

describe('the opening reminder for a reader who skipped the last round', () => {
  it('leads with the weekend news, the write-up and their last result', async () => {
    const { t, lapsedId, bakuId } = await seasonWithALapsedReader();
    await sendReminder(t, lapsedId, bakuId);
    const [delivery] = await scheduledDeliveries(t);
    expect(delivery.args[0]).toMatchObject({
      payload: {
        kind: 'reminder',
        lapsed: {
          headline: 'Baku forecast: 40 km/h gusts for qualifying',
          sourceName: 'FIA',
          writeupUrl: expect.stringContaining(
            '/f1-2026-azerbaijan-grand-prix-predictions?',
          ),
          lastPlayed: {
            raceName: 'Italian Grand Prix',
            points: 12,
            position: 2,
            totalPlayers: 2,
          },
        },
      },
    });
  });

  it('stays deadline-first for a reader who played the previous round', async () => {
    const { t, rivalId, madridId, bakuId } = await seasonWithALapsedReader();
    await t.run((ctx) =>
      ctx.db.insert('predictions', {
        userId: rivalId,
        raceId: madridId,
        sessionType: 'race',
        picks: [],
        submittedAt: Date.now() - 17 * 24 * HOUR,
        updatedAt: Date.now() - 17 * 24 * HOUR,
      }),
    );
    await sendReminder(t, rivalId, bakuId);
    const [delivery] = await scheduledDeliveries(t);
    const payload = delivery.args[0].payload as { lapsed?: unknown };
    expect(payload.lapsed).toBeUndefined();
  });

  it('leaves a brand-new account to the signup nudge', async () => {
    const { t, bakuId } = await seasonWithALapsedReader();
    const newId = await t.run((ctx) =>
      ctx.db.insert('users', {
        clerkUserId: 'new',
        email: 'new@example.com',
        emailPredictionReminders: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    await sendReminder(t, newId, bakuId);
    const [delivery] = await scheduledDeliveries(t);
    const payload = delivery.args[0].payload as { lapsed?: unknown };
    expect(payload.lapsed).toBeUndefined();
  });
});

describe('the weekend summary', () => {
  it('carries the next lock without scores, rank or a best pick', async () => {
    const { t, lapsedId, monzaId } = await seasonWithALapsedReader();
    await t.mutation(internal.notificationEmails.queue, {
      userId: lapsedId,
      raceId: monzaId,
      kind: 'summary',
    });
    const [job] = await t.run((ctx) =>
      ctx.db.query('notificationEmails').collect(),
    );
    await t.mutation(internal.notificationEmails.send, { id: job._id });
    const [delivery] = await scheduledDeliveries(t);
    const payload = delivery.args[0].payload as Record<string, unknown>;
    expect(payload).toMatchObject({
      kind: 'summary',
      raceName: 'Italian Grand Prix',
      nextRace: {
        name: 'Azerbaijan Grand Prix',
        raceUrl: expect.stringContaining('/races/azerbaijan-2026?'),
      },
    });
    expect(payload).not.toHaveProperty('top5Points');
    expect(payload).not.toHaveProperty('h2hPoints');
    expect(payload).not.toHaveProperty('weekendRank');
    expect(payload).not.toHaveProperty('bestPick');
  });
});

describe('the recap for a player who scored this season but sat this weekend out', () => {
  it('sends a spoiler-free recap with the next lock instead of nothing', async () => {
    const { t, lapsedId, rivalId, madridId } = await seasonWithALapsedReader();
    await t.run(async (ctx) => {
      const now = Date.now();
      const names = ['Max Verstappen', 'Lando Norris', 'Charles Leclerc'];
      const ids = [];
      for (const displayName of names) {
        ids.push(
          await ctx.db.insert('drivers', {
            code: displayName.slice(0, 3).toUpperCase(),
            displayName,
            createdAt: now,
            updatedAt: now,
          }),
        );
      }
      await ctx.db.insert('results', {
        raceId: madridId,
        sessionType: 'race',
        classification: ids,
        publishedAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(rivalId, { username: 'rival' });
      await ctx.db.insert('scores', {
        userId: rivalId,
        raceId: madridId,
        sessionType: 'race',
        points: 17,
        createdAt: now,
        updatedAt: now,
      });
    });
    await t.mutation(internal.notificationEmails.queue, {
      userId: lapsedId,
      raceId: madridId,
      kind: 'summary',
    });
    const [job] = await t.run((ctx) =>
      ctx.db.query('notificationEmails').collect(),
    );
    await t.mutation(internal.notificationEmails.send, { id: job._id });
    expect((await t.run((ctx) => ctx.db.get(job._id)))?.status).toBe(
      'accepted',
    );
    const [delivery] = await scheduledDeliveries(t);
    const payload = delivery.args[0].payload as Record<string, unknown>;
    expect(payload).toMatchObject({
      kind: 'recap',
      raceName: 'Madrid Grand Prix',
      nextRace: { name: 'Azerbaijan Grand Prix' },
    });
    expect(payload).not.toHaveProperty('podium');
    expect(payload).not.toHaveProperty('weekendWinner');
  });

  it('still sends nothing to an account that has never been scored', async () => {
    const { t, madridId } = await seasonWithALapsedReader();
    const newId = await t.run((ctx) =>
      ctx.db.insert('users', {
        clerkUserId: 'new',
        email: 'new@example.com',
        emailResults: true,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    await t.mutation(internal.notificationEmails.queue, {
      userId: newId,
      raceId: madridId,
      kind: 'summary',
    });
    const [job] = await t.run((ctx) =>
      ctx.db.query('notificationEmails').collect(),
    );
    await t.mutation(internal.notificationEmails.send, { id: job._id });
    expect((await t.run((ctx) => ctx.db.get(job._id)))?.status).toBe(
      'cancelled',
    );
    expect(await scheduledDeliveries(t)).toHaveLength(0);
  });
});
