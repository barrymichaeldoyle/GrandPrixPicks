'use node';

import { v } from 'convex/values';

import { internalAction } from '../_generated/server';
import { resend } from '../lib/email';

export const sendNewSupportRequest = internalAction({
  args: {
    userId: v.string(),
    email: v.optional(v.string()),
    displayName: v.optional(v.string()),
    username: v.optional(v.string()),
    category: v.optional(v.string()),
    subject: v.string(),
    message: v.string(),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    const toAddress =
      process.env.SUPPORT_EMAIL ?? 'barry@barrymichaeldoyle.com';
    const fromAddress =
      process.env.EMAIL_FROM ?? 'Grand Prix Picks <noreply@grandprixpicks.com>';

    const submittedAt = new Date(args.createdAt).toISOString();
    const submitter =
      args.displayName ?? args.username ?? args.email ?? 'Unknown user';
    const categoryLine = args.category ? `<p><strong>Category:</strong> ${args.category}</p>` : '';

    const html = `
      <h1>New Support Request</h1>
      <p><strong>Subject:</strong> ${args.subject}</p>
      ${categoryLine}
      <p><strong>From:</strong> ${submitter}</p>
      <p><strong>User ID:</strong> ${args.userId}</p>
      <p><strong>Email:</strong> ${args.email ?? 'Not provided'}</p>
      <p><strong>Submitted At:</strong> ${submittedAt}</p>
      <hr />
      <pre style="white-space: pre-wrap; font-family: sans-serif;">${args.message}</pre>
    `;

    await resend.sendEmail(ctx, {
      from: fromAddress,
      to: toAddress,
      subject: `[Support] ${args.subject}`,
      html,
    });

    return { sent: true };
  },
});
