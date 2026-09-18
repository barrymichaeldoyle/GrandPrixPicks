/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');
const HOUR = 3600000;

beforeEach(() => {
  vi.stubEnv('NOTIFICATION_DELIVERY_ENABLED', 'true');
  vi.stubEnv('CONVEX_SITE_URL', 'https://test.convex.site');
  return () => vi.unstubAllEnvs();
});

// A sprint weekend, mid-weekend: sprint quali and the sprint have locked, and
// qualifying is the next deadline 20h out.
async function sprintWeekendInProgress() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert('users', {
      clerkUserId: 'u',
      email: 'mail-only@example.com',
      emailPredictionReminders: true,
      createdAt: now,
      updatedAt: now,
    });
    const raceId = await ctx.db.insert('races', {
      season: 2026,
      round: 1,
      name: 'Test Grand Prix',
      slug: 'test-2026',
      status: 'upcoming',
      hasSprint: true,
      sprintQualiLockAt: now - 30 * HOUR,
      sprintLockAt: now - 6 * HOUR,
      qualiLockAt: now + 20 * HOUR,
      predictionLockAt: now + 44 * HOUR,
      raceStartAt: now + 44 * HOUR,
      createdAt: now,
      updatedAt: now,
    });
    return { userId, raceId };
  });
  return { t, ...ids };
}

/** A follow-up deadline only reaches people who already started the weekend. */
async function startWeekend(
  t: Awaited<ReturnType<typeof sprintWeekendInProgress>>['t'],
  userId: Id<'users'>,
  raceId: Id<'races'>,
) {
  await t.run((ctx) =>
    ctx.db.insert('predictions', {
      userId,
      raceId,
      sessionType: 'sprint_quali',
      picks: [],
      submittedAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
}

describe('per-session reminder email', () => {
  it('reaches an email-only reader before qualifying, not just the first lock', async () => {
    const { t, userId, raceId } = await sprintWeekendInProgress();
    await startWeekend(t, userId, raceId);
    await t.mutation(internal.notificationEmails.fanout, {
      raceId,
      kind: 'reminder',
      sessionType: 'quali',
    });
    const [job] = await t.run((ctx) =>
      ctx.db.query('notificationEmails').collect(),
    );
    expect(job).toMatchObject({ kind: 'reminder', sessionType: 'quali' });

    await t.mutation(internal.notificationEmails.send, { id: job._id });
    expect((await t.run((ctx) => ctx.db.get(job._id)))?.status).toBe(
      'accepted',
    );
    const [scheduled] = await t.run((ctx) =>
      ctx.db.system
        .query('_scheduled_functions')
        .filter((q) =>
          q.eq(q.field('name'), 'emails/deliverNotificationEmail:deliver'),
        )
        .collect(),
    );
    // Only the deadlines still open, and the one it was queued for leads.
    expect(scheduled.args[0]).toMatchObject({
      payload: {
        kind: 'reminder',
        sessions: [{ label: 'Qualifying' }, { label: 'Race' }],
      },
    });
  });

  // The old fan-out keyed everything off the weekend's first lock, so once
  // sprint quali had gone it refused to send anything at all.
  it('no longer refuses because the weekend already started', async () => {
    const { t, raceId } = await sprintWeekendInProgress();
    await t.mutation(internal.notificationEmails.fanout, {
      raceId,
      kind: 'reminder',
      sessionType: 'sprint_quali',
    });
    expect(
      await t.run((ctx) => ctx.db.query('notificationEmails').collect()),
    ).toHaveLength(0);
  });

  it('does not chase a reader about a session they have already picked', async () => {
    const { t, userId, raceId } = await sprintWeekendInProgress();
    await startWeekend(t, userId, raceId);
    await t.run((ctx) =>
      ctx.db.insert('predictions', {
        userId,
        raceId,
        sessionType: 'quali',
        picks: [],
        submittedAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    await t.mutation(internal.notificationEmails.fanout, {
      raceId,
      kind: 'reminder',
      sessionType: 'quali',
    });
    const [job] = await t.run((ctx) =>
      ctx.db.query('notificationEmails').collect(),
    );
    await t.mutation(internal.notificationEmails.send, { id: job._id });
    expect((await t.run((ctx) => ctx.db.get(job._id)))?.status).toBe(
      'cancelled',
    );
  });

  it('leaves alone a reader who never opened this weekend', async () => {
    const { t, raceId } = await sprintWeekendInProgress();
    await t.mutation(internal.notificationEmails.fanout, {
      raceId,
      kind: 'reminder',
      sessionType: 'quali',
    });
    const [job] = await t.run((ctx) =>
      ctx.db.query('notificationEmails').collect(),
    );
    await t.mutation(internal.notificationEmails.send, { id: job._id });
    expect((await t.run((ctx) => ctx.db.get(job._id)))?.status).toBe(
      'cancelled',
    );
  });
});
