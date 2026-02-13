'use node';

import { render } from '@react-email/render';
import { v } from 'convex/values';

import { internalAction } from '../_generated/server';
import { resend } from '../lib/email';
import type { PredictionReminderProps } from './PredictionReminderEmail';
import { PredictionReminderEmail } from './PredictionReminderEmail';

export const sendBatch = internalAction({
  args: {
    recipients: v.array(
      v.object({
        email: v.string(),
      }),
    ),
    raceName: v.string(),
    timeUntilLock: v.string(),
    raceSlug: v.string(),
  },
  handler: async (ctx, args) => {
    const appUrl = process.env.APP_URL ?? 'https://grandprixpicks.com';
    const fromAddress =
      process.env.EMAIL_FROM ?? 'Grand Prix Picks <noreply@grandprixpicks.com>';

    const props: PredictionReminderProps = {
      raceName: args.raceName,
      timeUntilLock: args.timeUntilLock,
      raceUrl: `${appUrl}/races/${args.raceSlug}`,
      settingsUrl: `${appUrl}/settings`,
    };

    const html = await render(PredictionReminderEmail(props));

    let sent = 0;
    let failed = 0;

    for (const recipient of args.recipients) {
      try {
        await resend.sendEmail(ctx, {
          from: fromAddress,
          to: recipient.email,
          subject: `${args.raceName} — picks lock in ${args.timeUntilLock}!`,
          html,
        });
        sent++;
      } catch (e) {
        console.error(`Failed to send reminder to ${recipient.email}:`, e);
        failed++;
      }
    }

    return { sent, failed };
  },
});
