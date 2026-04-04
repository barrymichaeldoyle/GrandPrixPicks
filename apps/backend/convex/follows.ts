import { v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { getViewer, requireViewer } from './lib/auth';

// The app currently treats follow relationships as a capped social graph rather than
// an infinite feed substrate. Keep the hard limit aligned with read-side bounds.
const MAX_FOLLOWS_PER_USER = 5000;

async function getExistingUsersForFollows(
  ctx: Parameters<typeof getViewer>[0],
  userIds: Id<'users'>[],
): Promise<Array<Doc<'users'>>> {
  const users = await Promise.all(userIds.map((userId) => ctx.db.get(userId)));
  return users.filter((user): user is Doc<'users'> => user != null);
}

export const follow = mutation({
  args: { followeeId: v.id('users') },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getViewer(ctx));

    if (args.followeeId === viewer._id) {
      throw new Error('Cannot follow yourself');
    }

    const target = await ctx.db.get(args.followeeId);
    if (!target) {
      throw new Error('User not found');
    }

    const existing = await ctx.db
      .query('follows')
      .withIndex('by_follower_followee', (q) =>
        q.eq('followerId', viewer._id).eq('followeeId', args.followeeId),
      )
      .unique();

    if (existing) {
      return existing._id;
    }

    const existingFollows = await ctx.db
      .query('follows')
      .withIndex('by_follower', (q) => q.eq('followerId', viewer._id))
      .take(MAX_FOLLOWS_PER_USER + 1);
    if (existingFollows.length >= MAX_FOLLOWS_PER_USER) {
      throw new Error('You have reached the maximum number of users you can follow');
    }

    return await ctx.db.insert('follows', {
      followerId: viewer._id,
      followeeId: args.followeeId,
      createdAt: Date.now(),
    });
  },
});

export const unfollow = mutation({
  args: { followeeId: v.id('users') },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getViewer(ctx));

    const existing = await ctx.db
      .query('follows')
      .withIndex('by_follower_followee', (q) =>
        q.eq('followerId', viewer._id).eq('followeeId', args.followeeId),
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

/** Returns IDs of all users the viewer follows. Used for batch follow-state lookups. */
export const getViewerFollowedIds = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return [];
    }
    const follows = await ctx.db
      .query('follows')
      .withIndex('by_follower', (q) => q.eq('followerId', viewer._id))
      .take(MAX_FOLLOWS_PER_USER);
    return follows.map((f) => f.followeeId as string);
  },
});

export const isFollowing = query({
  args: { followeeId: v.id('users') },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return false;
    }

    const existing = await ctx.db
      .query('follows')
      .withIndex('by_follower_followee', (q) =>
        q.eq('followerId', viewer._id).eq('followeeId', args.followeeId),
      )
      .unique();

    return existing !== null;
  },
});

export const getFollowCounts = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const followerIds: Id<'users'>[] = [];
    for await (const follow of ctx.db
      .query('follows')
      .withIndex('by_followee', (q) => q.eq('followeeId', args.userId))) {
      followerIds.push(follow.followerId);
    }

    const followingRecords = await ctx.db
      .query('follows')
      .withIndex('by_follower', (q) => q.eq('followerId', args.userId))
      .take(MAX_FOLLOWS_PER_USER);

    // Only count follows where the related user still exists (matches listFollowers/listFollowing)
    const followerUsers = await getExistingUsersForFollows(ctx, followerIds);
    const followingUsers = await getExistingUsersForFollows(
      ctx,
      followingRecords.map((f) => f.followeeId),
    );

    return {
      followerCount: followerUsers.length,
      followingCount: followingUsers.length,
    };
  },
});

/** List users who follow the given user. Requires viewer (logged in). */
export const listFollowers = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return null;
    }

    const followerIds: Id<'users'>[] = [];
    for await (const follow of ctx.db
      .query('follows')
      .withIndex('by_followee', (q) => q.eq('followeeId', args.userId))) {
      followerIds.push(follow.followerId);
    }

    const users = await getExistingUsersForFollows(ctx, followerIds);

    return users
      .map((u) => ({
        _id: u._id,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
      }));
  },
});

/** List users that the given user follows. Requires viewer (logged in). */
export const listFollowing = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return null;
    }

    const follows = await ctx.db
      .query('follows')
      .withIndex('by_follower', (q) => q.eq('followerId', args.userId))
      .take(MAX_FOLLOWS_PER_USER);

    const users = await Promise.all(
      follows.map((f) => ctx.db.get(f.followeeId)),
    );

    return users
      .filter((u): u is NonNullable<typeof u> => u != null)
      .map((u) => ({
        _id: u._id,
        username: u.username,
        displayName: u.displayName,
        avatarUrl: u.avatarUrl,
      }));
  },
});
