import { v } from 'convex/values';

import { internal } from './_generated/api';
import { internalMutation } from './_generated/server';
import {
  DEFAULT_REACTION_TYPE,
  normalizeReactionCounts,
} from './lib/reactions';

const BATCH_SIZE = 100;

/**
 * Widen/migrate step for rev rows created before typed reactions existed.
 * Safe to rerun: already-typed rows are left untouched.
 */
export const backfillReactionTypes = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const page = await ctx.db.query('revs').paginate({
      cursor: args.cursor ?? null,
      numItems: BATCH_SIZE,
    });
    let migrated = 0;

    for (const reaction of page.page) {
      if (reaction.reactionType === undefined) {
        await ctx.db.patch(reaction._id, {
          reactionType: DEFAULT_REACTION_TYPE,
        });
        migrated += 1;
      }
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.reactionMigrations.backfillReactionTypes,
        { cursor: page.continueCursor },
      );
    }

    return { migrated, complete: page.isDone };
  },
});

/**
 * Backfill the denormalized breakdown. Before this field existed every rev
 * represented the default 🔥 reaction, so the aggregate remains authoritative.
 */
export const backfillFeedReactionCounts = internalMutation({
  args: { cursor: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const page = await ctx.db.query('feedEvents').paginate({
      cursor: args.cursor ?? null,
      numItems: BATCH_SIZE,
    });
    let migrated = 0;

    for (const event of page.page) {
      if (event.reactionCounts === undefined) {
        await ctx.db.patch(event._id, {
          reactionCounts: normalizeReactionCounts(undefined, event.revCount),
        });
        migrated += 1;
      }
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(
        0,
        internal.reactionMigrations.backfillFeedReactionCounts,
        { cursor: page.continueCursor },
      );
    }

    return { migrated, complete: page.isDone };
  },
});
