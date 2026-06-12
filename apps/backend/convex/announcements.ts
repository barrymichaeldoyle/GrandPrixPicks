import { v } from 'convex/values';

import { mutation, query } from './_generated/server';
import { getViewer, requireAdmin } from './lib/auth';

const MAX_ANNOUNCEMENT_LENGTH = 500;

/** Active site-wide banner, or null. Public — shown to signed-out users too. */
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

/** Publishes (or replaces) the site-wide banner message. */
export const adminSetAnnouncement = mutation({
  args: { message: v.string() },
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
    const existing = await ctx.db.query('announcements').first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        message,
        active: true,
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert('announcements', {
      message,
      active: true,
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
