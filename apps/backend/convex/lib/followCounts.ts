import type { Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';

// Keep aligned with the follow read-side bound (follows.ts MAX_FOLLOWS_PER_USER).
const FOLLOW_COUNT_SCAN_CAP = 5000;

/**
 * Denormalized follower/following counts live on the user document and are kept
 * in sync by follow/unfollow and account deletion. This module centralizes the
 * count math so every writer stays consistent, and provides the from-edges
 * recompute used by the backfill migration and dev seed.
 */

async function bumpUserCount(
  ctx: MutationCtx,
  userId: Id<'users'>,
  field: 'followerCount' | 'followingCount',
  delta: number,
): Promise<void> {
  const user = await ctx.db.get(userId);
  if (!user) {
    return;
  }
  const next = Math.max(0, (user[field] ?? 0) + delta);
  // Build the patch explicitly so the field key stays strongly typed.
  const patch =
    field === 'followerCount'
      ? { followerCount: next }
      : { followingCount: next };
  await ctx.db.patch(userId, { ...patch, updatedAt: Date.now() });
}

/**
 * Apply a follow-edge change to both endpoints: `delta` is +1 when an edge
 * `follower -> followee` is created, -1 when it is removed. Missing users
 * (already deleted) are skipped.
 */
export async function applyFollowEdgeDelta(
  ctx: MutationCtx,
  followerId: Id<'users'>,
  followeeId: Id<'users'>,
  delta: number,
): Promise<void> {
  await bumpUserCount(ctx, followerId, 'followingCount', delta);
  await bumpUserCount(ctx, followeeId, 'followerCount', delta);
}

/** Decrement the follower count of `userId` (a follower they had was removed). */
export async function decrementFollowerCount(
  ctx: MutationCtx,
  userId: Id<'users'>,
): Promise<void> {
  await bumpUserCount(ctx, userId, 'followerCount', -1);
}

/** Decrement the following count of `userId` (someone they followed was removed). */
export async function decrementFollowingCount(
  ctx: MutationCtx,
  userId: Id<'users'>,
): Promise<void> {
  await bumpUserCount(ctx, userId, 'followingCount', -1);
}

/**
 * Recompute a user's counts from the follows edges, counting only edges whose
 * counterpart user still exists (matching what the profile lists show). Used by
 * the backfill migration and the dev seed, not on hot read paths.
 */
export async function computeFollowCountsForUser(
  ctx: QueryCtx,
  userId: Id<'users'>,
): Promise<{ followerCount: number; followingCount: number }> {
  const followerEdges = await ctx.db
    .query('follows')
    .withIndex('by_followee', (q) => q.eq('followeeId', userId))
    .take(FOLLOW_COUNT_SCAN_CAP);
  const followingEdges = await ctx.db
    .query('follows')
    .withIndex('by_follower', (q) => q.eq('followerId', userId))
    .take(FOLLOW_COUNT_SCAN_CAP);

  const followerUsers = await Promise.all(
    followerEdges.map((edge) => ctx.db.get(edge.followerId)),
  );
  const followingUsers = await Promise.all(
    followingEdges.map((edge) => ctx.db.get(edge.followeeId)),
  );

  return {
    followerCount: followerUsers.filter((u) => u != null).length,
    followingCount: followingUsers.filter((u) => u != null).length,
  };
}
