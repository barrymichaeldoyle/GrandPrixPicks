/// <reference types="vite/client" />
import rateLimiter from '@convex-dev/rate-limiter/test';
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { refreshResultNotificationPoints } from './inAppNotifications';
import schema from './schema';

const modules = import.meta.glob('./**/*.ts');

function setup() {
  const t = convexTest(schema, modules);
  rateLimiter.register(t);
  return t;
}

async function seed(
  t: ReturnType<typeof setup>,
  { top5, h2h }: { top5?: number; h2h?: number },
) {
  return await t.run(async (ctx) => {
    const now = Date.now();
    const raceId = await ctx.db.insert('races', {
      season: 2026,
      round: 18,
      name: 'United States Grand Prix',
      slug: 'usa-2026',
      status: 'upcoming',
      predictionLockAt: now,
      raceStartAt: now,
      createdAt: now,
      updatedAt: now,
    });
    const userId = await ctx.db.insert('users', {
      clerkUserId: 'user_points',
      createdAt: now,
      updatedAt: now,
    });
    if (top5 !== undefined) {
      await ctx.db.insert('scores', {
        userId,
        raceId,
        sessionType: 'quali',
        points: top5,
        createdAt: now,
        updatedAt: now,
      });
    }
    if (h2h !== undefined) {
      await ctx.db.insert('h2hScores', {
        userId,
        raceId,
        sessionType: 'quali',
        points: h2h,
        correctPicks: h2h,
        totalPicks: 11,
        createdAt: now,
        updatedAt: now,
      });
    }
    return { raceId, userId };
  });
}

async function resultNotifications(
  t: ReturnType<typeof setup>,
  userId: Id<'users'>,
) {
  return await t.run((ctx) =>
    ctx.db
      .query('inAppNotifications')
      .withIndex('by_user_created', (q) => q.eq('userId', userId))
      .collect(),
  );
}

describe('result notification points', () => {
  it('reports the session total, Top 5 plus team-mate picks', async () => {
    const t = setup();
    const { raceId, userId } = await seed(t, { top5: 6, h2h: 7 });

    await t.mutation(internal.inAppNotifications.createResultsNotification, {
      userId,
      raceId,
      sessionType: 'quali',
      raceName: 'United States Grand Prix',
      raceSlug: 'usa-2026',
    });

    const [notification] = await resultNotifications(t, userId);
    expect(notification.points).toBe(13);
  });

  it('catches up silently when the duels are scored after the notice', async () => {
    const t = setup();
    const { raceId, userId } = await seed(t, { top5: 6 });
    await t.mutation(internal.inAppNotifications.createResultsNotification, {
      userId,
      raceId,
      sessionType: 'quali',
      raceName: 'United States Grand Prix',
      raceSlug: 'usa-2026',
    });
    const [before] = await resultNotifications(t, userId);
    expect(before.points).toBe(6);
    await t.run((ctx) => ctx.db.patch(before._id, { readAt: 123 }));

    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert('h2hScores', {
        userId,
        raceId,
        sessionType: 'quali',
        points: 7,
        correctPicks: 7,
        totalPicks: 11,
        createdAt: now,
        updatedAt: now,
      });
      await refreshResultNotificationPoints(ctx, userId, raceId, 'quali');
    });

    const [after] = await resultNotifications(t, userId);
    expect(after.points).toBe(13);
    // Read state and position are the player's; a points catch-up keeps both.
    expect(after.readAt).toBe(123);
    expect(after.createdAt).toBe(before.createdAt);
  });

  it('backfills notices written with the Top 5 points alone', async () => {
    const t = setup();
    const { raceId, userId } = await seed(t, { top5: 6, h2h: 7 });
    await t.run((ctx) =>
      ctx.db.insert('inAppNotifications', {
        userId,
        type: 'results_published',
        raceId,
        sessionType: 'quali',
        raceName: 'United States Grand Prix',
        raceSlug: 'usa-2026',
        points: 6,
        createdAt: Date.now(),
      }),
    );

    await t.mutation(
      internal.inAppNotifications.backfillResultNotificationPoints,
      {},
    );

    const [notification] = await resultNotifications(t, userId);
    expect(notification.points).toBe(13);
  });
});
