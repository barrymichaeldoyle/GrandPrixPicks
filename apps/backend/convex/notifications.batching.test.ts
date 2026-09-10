/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';
import { internal } from './_generated/api';
import schema from './schema';
const modules = import.meta.glob('./**/*.ts');
describe('notification email fan-out', () => {
  it('pages the roster and deduplicates separately enqueued campaign work', async () => {
    const t = convexTest(schema, modules);
    const raceId = await t.run(async (ctx) => {
      const now = Date.now();
      const id = await ctx.db.insert('races', {
        season: 2026,
        round: 1,
        name: 'Test',
        slug: 'test-2026',
        status: 'upcoming',
        qualiLockAt: now + 86400000,
        raceStartAt: now + 172800000,
        predictionLockAt: now + 172800000,
        createdAt: now,
        updatedAt: now,
      });
      for (let i = 0; i < 201; i++) {
        await ctx.db.insert('users', {
          clerkUserId: `u${i}`,
          email: `${i}@example.com`,
          createdAt: now,
          updatedAt: now,
        });
      }
      return id;
    });
    await t.mutation(internal.notificationEmails.fanout, {
      raceId,
      kind: 'reminder',
    });
    const first = await t.run((ctx) =>
      ctx.db.query('notificationEmails').collect(),
    );
    expect(first).toHaveLength(100);
    await t.mutation(internal.notificationEmails.fanout, {
      raceId,
      kind: 'reminder',
    });
    expect(
      await t.run((ctx) => ctx.db.query('notificationEmails').collect()),
    ).toHaveLength(100);
    const jobs = await t.run((ctx) =>
      ctx.db.system.query('_scheduled_functions').collect(),
    );
    expect(jobs.some((j) => j.name.includes('notificationEmails:fanout'))).toBe(
      true,
    );
  });
  it('does not send a separate email for qualifying results', async () => {
    const t = convexTest(schema, modules);
    const raceId = await t.run((ctx) =>
      ctx.db.insert('races', {
        season: 2026,
        round: 1,
        name: 'Test',
        slug: 'test',
        status: 'upcoming',
        raceStartAt: 1,
        predictionLockAt: 1,
        createdAt: 1,
        updatedAt: 1,
      }),
    );
    await t.mutation(internal.notifications.sendResultEmailsForSession, {
      raceId,
      sessionType: 'quali',
    });
    expect(
      await t.run((ctx) => ctx.db.query('notificationEmails').collect()),
    ).toHaveLength(0);
  });
});
