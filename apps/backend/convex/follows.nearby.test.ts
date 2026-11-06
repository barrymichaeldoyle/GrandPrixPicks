/// <reference types="vite/client" />
import { convexTest } from 'convex-test';
import { describe, expect, it } from 'vitest';

import { api } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { pickNearbyRows } from './follows';
import schema from './schema';

const modules = import.meta.glob('./**/*.{ts,tsx}');

type Row = { userId: Id<'users'>; name: string };

function row(name: string): Row {
  return { userId: name as Id<'users'>, name };
}

describe('pickNearbyRows', () => {
  const board = ['p1', 'p2', 'p3', 'p4', 'p5', 'p6', 'p7'].map(row);

  it('alternates above and below the viewer, nearest first', () => {
    const picked = pickNearbyRows(board, 3, () => true, 4);
    expect(picked.map((r) => `${r.name}:${r.position}`)).toEqual([
      'p3:above',
      'p5:below',
      'p2:above',
      'p6:below',
    ]);
  });

  it('skips excluded rows and keeps walking outward', () => {
    const picked = pickNearbyRows(board, 3, (r) => r.name !== 'p3', 3);
    expect(picked.map((r) => r.name)).toEqual(['p2', 'p5', 'p1']);
  });

  it('runs out below and keeps filling from above', () => {
    const picked = pickNearbyRows(board, 6, () => true, 3);
    expect(picked.map((r) => r.name)).toEqual(['p6', 'p5', 'p4']);
  });

  it('offers the top of the board to an unranked viewer', () => {
    const picked = pickNearbyRows(board, -1, (r) => r.name !== 'p1', 2);
    expect(picked.map((r) => `${r.name}:${r.position}`)).toEqual([
      'p2:top',
      'p3:top',
    ]);
  });
});

async function seedBoard() {
  const t = convexTest(schema, modules);
  const ids = await t.run(async (ctx) => {
    const now = Date.now();
    const users: Record<string, Id<'users'>> = {};
    for (const [name, points] of [
      ['leader', 300],
      ['second', 250],
      ['above', 120],
      ['viewer', 100],
      ['below', 90],
      ['nameless', 80],
      ['last', 10],
    ] as const) {
      const userId = await ctx.db.insert('users', {
        clerkUserId: name,
        username: name === 'nameless' ? undefined : name,
        displayName: name,
        createdAt: now,
        updatedAt: now,
      });
      users[name] = userId;
      await ctx.db.insert('seasonStandings', {
        userId,
        season: 2026,
        totalPoints: points,
        raceCount: 1,
        username: name === 'nameless' ? undefined : name,
        displayName: name,
        updatedAt: now,
      });
    }
    await ctx.db.insert('races', {
      name: 'Brazilian Grand Prix',
      slug: 'brazil-2026',
      season: 2026,
      round: 20,
      status: 'upcoming',
      raceStartAt: now + 86_400_000,
      predictionLockAt: now + 80_000_000,
      createdAt: now,
      updatedAt: now,
    });
    return users;
  });
  return { t, ids };
}

describe('getPlayersNearYou', () => {
  it('returns the ranked neighbours, skipping the followed and the nameless', async () => {
    const { t, ids } = await seedBoard();
    await t.run((ctx) =>
      ctx.db.insert('follows', {
        followerId: ids.viewer!,
        followeeId: ids.above!,
        createdAt: Date.now(),
      }),
    );

    const near = await t
      .withIdentity({ subject: 'viewer' })
      .query(api.follows.getPlayersNearYou, { limit: 3 });

    expect(near.map((p) => [p.username, p.rank, p.position])).toEqual([
      ['second', 2, 'above'],
      ['below', 5, 'below'],
      ['leader', 1, 'above'],
    ]);
    expect(near[1]?.points).toBe(90);
  });

  it('offers the top of the board to a player with no standing yet', async () => {
    const { t } = await seedBoard();
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert('users', {
        clerkUserId: 'rookie',
        username: 'rookie',
        createdAt: now,
        updatedAt: now,
      });
    });

    const near = await t
      .withIdentity({ subject: 'rookie' })
      .query(api.follows.getPlayersNearYou, { limit: 2 });

    expect(near.map((p) => [p.username, p.position])).toEqual([
      ['leader', 'top'],
      ['second', 'top'],
    ]);
  });

  it('is empty signed out', async () => {
    const { t } = await seedBoard();
    expect(await t.query(api.follows.getPlayersNearYou, {})).toEqual([]);
  });
});

describe('follow notifies the person followed', () => {
  it('writes one new_follower row, once, linking to the follower', async () => {
    const { t, ids } = await seedBoard();
    const viewer = t.withIdentity({ subject: 'viewer' });

    await viewer.mutation(api.follows.follow, { followeeId: ids.below! });
    await viewer.mutation(api.follows.unfollow, { followeeId: ids.below! });
    await viewer.mutation(api.follows.follow, { followeeId: ids.below! });

    const rows = await t.run((ctx) =>
      ctx.db
        .query('inAppNotifications')
        .withIndex('by_user_created', (q) => q.eq('userId', ids.below!))
        .collect(),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      type: 'new_follower',
      actorUserId: ids.viewer,
      actorUsername: 'viewer',
      linkPath: '/p/viewer',
    });
    expect(rows[0]?.readAt).toBeUndefined();
  });

  it('shows up under the followers filter', async () => {
    const { t, ids } = await seedBoard();
    await t
      .withIdentity({ subject: 'viewer' })
      .mutation(api.follows.follow, { followeeId: ids.below! });

    const below = t.withIdentity({ subject: 'below' });
    const page = await below.query(api.inAppNotifications.getMyNotifications, {
      paginationOpts: { numItems: 10, cursor: null },
      filter: 'followers',
    });
    expect(page.page.map((n) => n.type)).toEqual(['new_follower']);

    const counts = await below.query(
      api.inAppNotifications.getMyNotificationCounts,
      {},
    );
    expect(counts?.counts.followers).toEqual({ total: 1, unread: 1 });
  });
});
