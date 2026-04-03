import { v } from 'convex/values';

import { internal } from './_generated/api';
import { mutation } from './_generated/server';
import { getOrCreateViewer, requireViewer } from './lib/auth';

export const submitRequest = mutation({
  args: {
    subject: v.string(),
    message: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));
    const now = Date.now();

    const subject = args.subject.trim();
    const message = args.message.trim();

    if (!subject || subject.length > 200) {
      throw new Error('Subject must be between 1 and 200 characters');
    }
    if (!message || message.length > 5000) {
      throw new Error('Message must be between 1 and 5000 characters');
    }

    await ctx.db.insert('supportRequests', {
      userId: viewer._id,
      subject,
      message,
      category: args.category?.trim() || undefined,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.emails.sendSupportEmail.sendNewSupportRequest, {
      userId: viewer._id,
      email: viewer.email,
      displayName: viewer.displayName,
      username: viewer.username,
      category: args.category?.trim() || undefined,
      subject,
      message,
      createdAt: now,
    });

    return { success: true };
  },
});
