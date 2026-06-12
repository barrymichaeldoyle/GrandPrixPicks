import { v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { getViewer, requireAdmin } from './lib/auth';

const MAX_ANNOUNCEMENT_LENGTH = 500;

/**
 * Active site-wide banner, or null. Public — shown to signed-out users too.
 * Deliberately does NOT filter by the startsAt/expiresAt window: queries only
 * re-run on data changes, so time-based filtering here would never make the
 * banner appear/disappear for connected clients. The client checks the window.
 */
export const getActive = query({
  args: {},
  handler: async (ctx) => {
    const announcement = await ctx.db
      .query('announcements')
      .withIndex('by_active', (q) => q.eq('active', true))
      .first();
    if (!announcement) {
      return null;
    }
    return {
      _id: announcement._id,
      message: announcement.message,
      startsAt: announcement.startsAt ?? null,
      expiresAt: announcement.expiresAt ?? null,
      updatedAt: announcement.updatedAt,
    };
  },
});

/** Current announcement (active or not) for the admin compose UI. */
export const adminGetAnnouncement = query({
  args: {},
  handler: async (ctx) => {
    requireAdmin(await getViewer(ctx));
    return await ctx.db.query('announcements').first();
  },
});

/**
 * Publishes (or replaces) the site-wide banner message, with an optional show
 * window — e.g. schedule a "results will be late" notice to appear only once
 * the session was expected to finish.
 */
export const adminSetAnnouncement = mutation({
  args: {
    message: v.string(),
    startsAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    requireAdmin(await getViewer(ctx));

    const message = args.message.trim();
    if (message.length === 0) {
      throw new Error('Announcement message cannot be empty');
    }
    if (message.length > MAX_ANNOUNCEMENT_LENGTH) {
      throw new Error(
        `Announcement message must be at most ${MAX_ANNOUNCEMENT_LENGTH} characters`,
      );
    }
    const now = Date.now();
    if (args.expiresAt !== undefined && args.expiresAt <= now) {
      throw new Error('Auto-hide time must be in the future');
    }
    if (
      args.startsAt !== undefined &&
      args.expiresAt !== undefined &&
      args.expiresAt <= args.startsAt
    ) {
      throw new Error('Auto-hide time must be after the show-from time');
    }

    const existing = await ctx.db.query('announcements').first();
    if (existing) {
      // replace (not patch) so clearing a window actually removes the fields
      await ctx.db.replace(existing._id, {
        message,
        active: true,
        startsAt: args.startsAt,
        expiresAt: args.expiresAt,
        createdAt: existing.createdAt,
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert('announcements', {
      message,
      active: true,
      startsAt: args.startsAt,
      expiresAt: args.expiresAt,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/** Takes the site-wide banner down. */
export const adminClearAnnouncement = mutation({
  args: {},
  handler: async (ctx) => {
    requireAdmin(await getViewer(ctx));

    const existing = await ctx.db.query('announcements').first();
    if (existing && existing.active) {
      await ctx.db.patch(existing._id, {
        active: false,
        updatedAt: Date.now(),
      });
    }
  },
});
