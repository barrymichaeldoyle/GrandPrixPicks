'use node';

import { render } from '@react-email/render';
import { v } from 'convex/values';

import { internalAction } from '../_generated/server';
import { resend } from '../lib/email';
import type { PredictionReminderProps } from './PredictionReminderEmail';
import { PredictionReminderEmail } from './PredictionReminderEmail';

function formatSessionTime(epochMs: number): { date: string; time: string } {
  const dt = new Date(epochMs);
  const date = new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(dt);
  const time = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    hour12: false,
  }).format(dt);
  return { date, time: `${time} UTC` };
}

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
    sessions: v.array(
      v.object({
        label: v.string(),
        startAt: v.number(),
        isSprint: v.boolean(),
      }),
    ),
    round: v.number(),
    countryCode: v.union(v.string(), v.null()),
    hasSprint: v.boolean(),
  },
  handler: async (ctx, args) => {
    const appUrl = process.env.APP_URL ?? 'https://grandprixpicks.com';
    const fromAddress =
      process.env.EMAIL_FROM ?? 'Grand Prix Picks <noreply@grandprixpicks.com>';

    const sessionSchedule = args.sessions.map((s) => {
      const { date, time } = formatSessionTime(s.startAt);
      return { label: s.label, date, time, isSprint: s.isSprint };
    });

    const props: PredictionReminderProps = {
      raceName: args.raceName,
      timeUntilLock: args.timeUntilLock,
      raceUrl: `${appUrl}/races/${args.raceSlug}`,
      settingsUrl: `${appUrl}/settings`,
      sessions: sessionSchedule,
      round: args.round,
      countryCode: args.countryCode,
      hasSprint: args.hasSprint,
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
