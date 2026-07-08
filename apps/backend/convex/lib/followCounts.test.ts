import { describe, expect, it } from 'vitest';

import type { Id } from '../_generated/dataModel';
import {
  applyFollowEdgeDelta,
  computeFollowCountsForUser,
  decrementFollowerCount,
  decrementFollowingCount,
} from './followCounts';

function uid(id: string): Id<'users'> {
  return id as Id<'users'>;
}

type UserDoc = {
  _id: Id<'users'>;
  followerCount?: number;
  followingCount?: number;
};

type Edge = { followerId: Id<'users'>; followeeId: Id<'users'> };

/**
 * Minimal in-memory ctx matching the slice of the Convex API these helpers use:
 * db.get / db.patch on users, and a follows index query with .take().
 */
function makeCtx(users: UserDoc[], edges: Edge[] = []) {
  const byId = new Map(users.map((u) => [u._id as string, { ...u }]));
  const ctx = {
    db: {
      get: async (id: Id<'users'>) => byId.get(id as string) ?? null,
      patch: async (id: Id<'users'>, fields: Partial<UserDoc>) => {
        Object.assign(byId.get(id as string)!, fields);
      },
      query: (_table: 'follows') => ({
        withIndex: (
          _name: string,
          build: (q: {
            eq: (field: keyof Edge, value: Id<'users'>) => unknown;
          }) => unknown,
        ) => {
          let field: keyof Edge = 'followerId';
          let value: Id<'users'> | undefined;
          build({
            eq: (f, v) => {
              field = f;
              value = v;
              return {};
            },
          });
          return {
            take: async (n: number) =>
              edges.filter((e) => e[field] === value).slice(0, n),
          };
        },
      }),
    },
  };
  return { ctx, byId };
}

describe('follow count helpers', () => {
  it('increments both endpoints when an edge is created', async () => {
    const { ctx, byId } = makeCtx([
      { _id: uid('a'), followingCount: 2 },
      { _id: uid('b'), followerCount: 5 },
    ]);
    await applyFollowEdgeDelta(ctx as never, uid('a'), uid('b'), 1);
    expect(byId.get('a')!.followingCount).toBe(3);
    expect(byId.get('b')!.followerCount).toBe(6);
  });

  it('decrements both endpoints when an edge is removed, treating undefined as 0', async () => {
    const { ctx, byId } = makeCtx([
      { _id: uid('a'), followingCount: 1 },
      { _id: uid('b') }, // followerCount undefined -> 0, clamped
    ]);
    await applyFollowEdgeDelta(ctx as never, uid('a'), uid('b'), -1);
    expect(byId.get('a')!.followingCount).toBe(0);
    expect(byId.get('b')!.followerCount).toBe(0);
  });

  it('clamps at zero and never goes negative', async () => {
    const { ctx, byId } = makeCtx([{ _id: uid('a'), followerCount: 0 }]);
    await decrementFollowerCount(ctx as never, uid('a'));
    expect(byId.get('a')!.followerCount).toBe(0);
  });

  it('skips missing (already-deleted) users without throwing', async () => {
    const { ctx } = makeCtx([]);
    await expect(
      decrementFollowingCount(ctx as never, uid('ghost')),
    ).resolves.toBeUndefined();
    await expect(
      applyFollowEdgeDelta(ctx as never, uid('ghost'), uid('gone'), 1),
    ).resolves.toBeUndefined();
  });

  it('recomputes counts from edges, excluding edges to deleted users', async () => {
    // a follows b and c; b and d follow a. c is deleted (no user doc).
    const users = [{ _id: uid('a') }, { _id: uid('b') }, { _id: uid('d') }];
    const edges: Edge[] = [
      { followerId: uid('a'), followeeId: uid('b') },
      { followerId: uid('a'), followeeId: uid('c') }, // c deleted -> excluded
      { followerId: uid('b'), followeeId: uid('a') },
      { followerId: uid('d'), followeeId: uid('a') },
    ];
    const { ctx } = makeCtx(users, edges);
    const counts = await computeFollowCountsForUser(ctx as never, uid('a'));
    expect(counts).toEqual({ followerCount: 2, followingCount: 1 });
  });
});
