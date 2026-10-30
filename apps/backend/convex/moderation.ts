import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { mutation } from './_generated/server';
import { getOrCreateViewer, getViewer, requireViewer } from './lib/auth';
import { applyFollowEdgeDelta } from './lib/followCounts';

/**
 * Report and block: what App Store guideline 1.2 asks of an app where players
 * can see each other's names and photos. A report lands in the support inbox;
 * a block removes the pair from each other's feed and follow lists.
 */

/** Bounds the block list read for a league feed. More than this is not a use. */
export const MAX_BLOCKS_READ = 500;

async function findBlock(
  ctx: QueryCtx,
  blockerId: Id<'users'>,
  blockedId: Id<'users'>,
) {
  return await ctx.db
    .query('userBlocks')
    .withIndex('by_blocker_and_blocked', (q) =>
      q.eq('blockerId', blockerId).eq('blockedId', blockedId),
    )
    .unique();
}

/** Whether either of the two has blocked the other. */
export async function isBlockedEitherWay(
  ctx: QueryCtx,
  a: Id<'users'>,
  b: Id<'users'>,
): Promise<boolean> {
  return (
    (await findBlock(ctx, a, b)) !== null ||
    (await findBlock(ctx, b, a)) !== null
  );
}

/** Players hidden from the viewer: the ones they blocked and the ones who blocked them. */
export async function getHiddenUserIds(
  ctx: QueryCtx,
  viewerId: Id<'users'>,
): Promise<Set<Id<'users'>>> {
  const hidden = new Set<Id<'users'>>();
  const [blocked, blockedBy] = await Promise.all([
    ctx.db
      .query('userBlocks')
      .withIndex('by_blocker_and_blocked', (q) => q.eq('blockerId', viewerId))
      .take(MAX_BLOCKS_READ),
    ctx.db
      .query('userBlocks')
      .withIndex('by_blocked', (q) => q.eq('blockedId', viewerId))
      .take(MAX_BLOCKS_READ),
  ]);
  for (const row of blocked) {
    hidden.add(row.blockedId);
  }
  for (const row of blockedBy) {
    hidden.add(row.blockerId);
  }
  return hidden;
}

async function dropFollow(
  ctx: MutationCtx,
  followerId: Id<'users'>,
  followeeId: Id<'users'>,
) {
  const edge = await ctx.db
    .query('follows')
    .withIndex('by_follower_followee', (q) =>
      q.eq('followerId', followerId).eq('followeeId', followeeId),
    )
    .unique();
  if (edge) {
    await ctx.db.delete(edge._id);
    await applyFollowEdgeDelta(ctx, followerId, followeeId, -1);
  }
}

export const blockUser = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getViewer(ctx));
    if (args.userId === viewer._id) {
      throw new ConvexError('You cannot block yourself');
    }
    if (!(await ctx.db.get(args.userId))) {
      throw new ConvexError('User not found');
    }
    if (!(await findBlock(ctx, viewer._id, args.userId))) {
      await ctx.db.insert('userBlocks', {
        blockerId: viewer._id,
        blockedId: args.userId,
        createdAt: Date.now(),
      });
    }
    await dropFollow(ctx, viewer._id, args.userId);
    await dropFollow(ctx, args.userId, viewer._id);
    return null;
  },
});

export const unblockUser = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getViewer(ctx));
    const block = await findBlock(ctx, viewer._id, args.userId);
    if (block) {
      await ctx.db.delete(block._id);
    }
    return null;
  },
});

export const reportUser = mutation({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));
    const reported = await ctx.db.get(args.userId);
    if (!reported) {
      throw new ConvexError('User not found');
    }
    if (reported._id === viewer._id) {
      throw new ConvexError('You cannot report yourself');
    }

    const now = Date.now();
    const name = reported.username ? `@${reported.username}` : reported._id;
    const subject = `Player report: ${name}`;
    const message = [
      `Reported player: ${name}`,
      `User ID: ${reported._id}`,
      `Display name: ${reported.displayName ?? '(none)'}`,
      `Photo: ${reported.avatarUrl ?? '(none)'}`,
      reported.username
        ? `Profile: https://grandprixpicks.com/p/${reported.username}`
        : null,
    ]
      .filter((line) => line !== null)
      .join('\n');

    await ctx.db.insert('supportRequests', {
      userId: viewer._id,
      subject,
      message,
      category: 'player_report',
      reportedUserId: reported._id,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(
      0,
      internal.emails.sendSupportEmail.sendNewSupportRequest,
      {
        userId: viewer._id,
        email: viewer.email,
        displayName: viewer.displayName,
        username: viewer.username,
        category: 'player_report',
        subject,
        message,
        createdAt: now,
      },
    );
    return null;
  },
});
