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

    if (existing) return existing._id;

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

export const isFollowing = query({
  args: { followeeId: v.id('users') },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer) return false;

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
    const followers = await ctx.db
      .query('follows')
      .withIndex('by_followee', (q) => q.eq('followeeId', args.userId))
      .collect();

    const following = await ctx.db
      .query('follows')
      .withIndex('by_follower', (q) => q.eq('followerId', args.userId))
      .collect();

    return {
      followerCount: followers.length,
      followingCount: following.length,
    };
  },
});
