import { v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { getViewer, requireViewer } from './lib/auth';

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
      .collect();
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
    const followerRecords = await ctx.db
      .query('follows')
      .withIndex('by_followee', (q) => q.eq('followeeId', args.userId))
      .collect();

    const followingRecords = await ctx.db
      .query('follows')
      .withIndex('by_follower', (q) => q.eq('followerId', args.userId))
      .collect();

    // Only count follows where the related user still exists (matches listFollowers/listFollowing)
    const followerUsers = await Promise.all(
      followerRecords.map((f) => ctx.db.get(f.followerId)),
    );
    const followingUsers = await Promise.all(
      followingRecords.map((f) => ctx.db.get(f.followeeId)),
    );

    return {
      followerCount: followerUsers.filter((u) => u != null).length,
      followingCount: followingUsers.filter((u) => u != null).length,
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

    const follows = await ctx.db
      .query('follows')
      .withIndex('by_followee', (q) => q.eq('followeeId', args.userId))
      .collect();

    const users = await Promise.all(
      follows.map((f) => ctx.db.get(f.followerId)),
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
      .collect();

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
