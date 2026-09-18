/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { internal } from './_generated/api';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

const HOUR = 3600000;

async function seed(firstLockInHours: number, raceLockInHours: number) {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const userId = await ctx.db.insert('users', {
      clerkUserId: 'u',
      email: 'new@example.com',
      emailPredictionReminders: true,
      createdAt: now,
      updatedAt: now,
    });
    const raceId = await ctx.db.insert('races', {
      season: 2026,
      round: 1,
      name: 'Test',
      slug: 'test-2026',
      status: 'upcoming',
      qualiLockAt: now + firstLockInHours * HOUR,
      raceStartAt: now + raceLockInHours * HOUR,
      predictionLockAt: now + raceLockInHours * HOUR,
      createdAt: now,
      updatedAt: now,
    });
    return { userId, raceId };
  });
  return { t, ...ids };
}

function deferrals<T extends { name: string }>(rows: Array<T>) {
  return rows.filter(
    (row) => row.name === 'notifications:sendSignupPredictionNudgeForUser',
  );
}

describe('signup prediction nudge', () => {
  it('nudges when the first lock is comfortably away', async () => {
    const { t } = await seed(48, 72);
    await t.mutation(internal.notifications.sendSignupPredictionNudgeForUser, {
      userId: (await t.run((ctx) => ctx.db.query('users').first()))!._id,
    });
    const queued = await t.run((ctx) =>
      ctx.db.query('notificationEmails').collect(),
    );
    expect(queued).toHaveLength(1);
    expect(queued[0]).toMatchObject({ kind: 'signup' });
  });

  // The whole point of the fix: a mid-weekend signup used to get nothing at
  // all, because the nudge returned instead of waiting for the next round.
  it('defers to the next round instead of dropping when the lock is close', async () => {
    const { t, userId, raceId } = await seed(10, 30);
    await t.mutation(internal.notifications.sendSignupPredictionNudgeForUser, {
      userId,
    });
    expect(
      await t.run((ctx) => ctx.db.query('notificationEmails').collect()),
    ).toHaveLength(0);
    const scheduled = deferrals(
      await t.run((ctx) =>
        ctx.db.system.query('_scheduled_functions').collect(),
      ),
    );
    expect(scheduled).toHaveLength(1);
    const race = (await t.run((ctx) => ctx.db.get(raceId)))!;
    expect(scheduled[0].scheduledTime).toBe(race.predictionLockAt + HOUR);
    expect(scheduled[0].args[0]).toMatchObject({ userId, attempt: 1 });
  });

  it('gives up rather than following a new account around all season', async () => {
    const { t, userId } = await seed(10, 30);
    await t.mutation(internal.notifications.sendSignupPredictionNudgeForUser, {
      userId,
      attempt: 2,
    });
    expect(
      deferrals(
        await t.run((ctx) =>
          ctx.db.system.query('_scheduled_functions').collect(),
        ),
      ),
    ).toHaveLength(0);
  });

  it('stops once the account has made any pick, without re-arming', async () => {
    const { t, userId, raceId } = await seed(10, 30);
    await t.run((ctx) =>
      ctx.db.insert('predictions', {
        userId,
        raceId,
        sessionType: 'race',
        picks: [],
        submittedAt: Date.now(),
        updatedAt: Date.now(),
      }),
    );
    await t.mutation(internal.notifications.sendSignupPredictionNudgeForUser, {
      userId,
    });
    expect(
      deferrals(
        await t.run((ctx) =>
          ctx.db.system.query('_scheduled_functions').collect(),
        ),
      ),
    ).toHaveLength(0);
    expect(
      await t.run((ctx) => ctx.db.query('notificationEmails').collect()),
    ).toHaveLength(0);
  });
});
