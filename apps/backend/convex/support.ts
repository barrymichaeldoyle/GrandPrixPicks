import { ConvexError, v } from 'convex/values';

import { internal } from './_generated/api';
import { mutation } from './_generated/server';
import { getOrCreateViewer, requireViewer } from './lib/auth';

const HOUR_MS = 60 * 60 * 1000;
/** Player reports share the table and count towards this too. */
const MAX_REQUESTS_PER_HOUR = 5;

/** Longest derived subject, well inside the stored field's 200. */
const DERIVED_SUBJECT_MAX = 80;

/**
 * A subject for a message that was never asked for one.
 *
 * The in-app feedback widget is a single box on purpose: a second field is the
 * difference between a thought sent and a thought abandoned. Support requests
 * still need a subject to be triageable in an inbox, so it comes from the first
 * line of what they wrote, which is what a person would have typed anyway.
 */
export function deriveSubject(message: string): string {
  const firstLine = message.split('\n')[0]!.trim() || message.trim();

  return firstLine.length > DERIVED_SUBJECT_MAX
    ? `${firstLine.slice(0, DERIVED_SUBJECT_MAX - 1).trimEnd()}\u2026`
    : firstLine;
}

export const submitRequest = mutation({
  args: {
    /** Omitted by the feedback widget; see {@link deriveSubject}. */
    subject: v.optional(v.string()),
    message: v.string(),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));
    const now = Date.now();

    const message = args.message.trim();

    if (!message || message.length > 5000) {
      throw new Error('Message must be between 1 and 5000 characters');
    }

    const subject = args.subject?.trim() || deriveSubject(message);

    if (!subject || subject.length > 200) {
      throw new Error('Subject must be between 1 and 200 characters');
    }

    // Every request emails the support inbox, so one account in a loop could
    // flood it and spend the Resend quota.
    const recent = await ctx.db
      .query('supportRequests')
      .withIndex('by_user', (q) => q.eq('userId', viewer._id))
      .order('desc')
      .take(MAX_REQUESTS_PER_HOUR);
    if (
      recent.length === MAX_REQUESTS_PER_HOUR &&
      recent.every((request) => now - request.createdAt < HOUR_MS)
    ) {
      throw new ConvexError(
        `You’ve sent ${MAX_REQUESTS_PER_HOUR} messages in the last hour. Try again later.`,
      );
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

    await ctx.scheduler.runAfter(
      0,
      internal.emails.sendSupportEmail.sendNewSupportRequest,
      {
        userId: viewer._id,
        email: viewer.email,
        displayName: viewer.displayName,
        username: viewer.username,
        category: args.category?.trim() || undefined,
        subject,
        message,
        createdAt: now,
      },
    );

    return { success: true };
  },
});
