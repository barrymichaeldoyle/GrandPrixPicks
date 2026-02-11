import { v } from 'convex/values';

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

    // TODO: Wire up email notification to support once email provider is configured.

    return { success: true };
  },
});

