'use node';

import { render } from '@react-email/render';
import { v } from 'convex/values';

import { internalAction } from '../_generated/server';
import { resend } from '../lib/email';
import type { ResultsEmailProps } from './ResultsEmail';
import { ResultsEmail } from './ResultsEmail';

export const sendBatch = internalAction({
  args: {
    recipients: v.array(
      v.object({
        email: v.string(),
        sessionPoints: v.number(),
        bestPick: v.union(
          v.object({
            code: v.string(),
            position: v.number(),
            points: v.number(),
          }),
          v.null(),
        ),
        globalRank: v.number(),
        globalTotal: v.number(),
        leagueRanks: v.array(
          v.object({
            leagueName: v.string(),
            rank: v.number(),
            total: v.number(),
          }),
        ),
      }),
    ),
    raceName: v.string(),
    raceId: v.string(),
    sessionLabel: v.string(),
    round: v.number(),
    countryCode: v.union(v.string(), v.null()),
    hasSprint: v.boolean(),
  },
  handler: async (ctx, args) => {
    const appUrl = process.env.APP_URL ?? 'https://grandprixpicks.com';
    const fromAddress =
      process.env.EMAIL_FROM ?? 'Grand Prix Picks <noreply@grandprixpicks.com>';

    let sent = 0;
    let failed = 0;

    for (const recipient of args.recipients) {
      const props: ResultsEmailProps = {
        raceName: args.raceName,
        sessionLabel: args.sessionLabel,
        sessionPoints: recipient.sessionPoints,
        bestPick: recipient.bestPick,
        globalRank: recipient.globalRank,
        globalTotal: recipient.globalTotal,
        leagueRanks: recipient.leagueRanks,
        raceUrl: `${appUrl}/races/${args.raceId}`,
        settingsUrl: `${appUrl}/settings`,
        logoUrl: `${appUrl}/logo-email.png`,
        round: args.round,
        countryCode: args.countryCode,
        hasSprint: args.hasSprint,
      };

      const html = await render(ResultsEmail(props));
      const subject = `You scored ${recipient.sessionPoints}/25 in ${args.raceName} ${args.sessionLabel}`;

      try {
        await resend.sendEmail(ctx, {
          from: fromAddress,
          to: recipient.email,
          subject,
          html,
        });
        sent++;
      } catch (e) {
        console.error(`Failed to send result email to ${recipient.email}:`, e);
        failed++;
      }
    }

    return { sent, failed };
  },
});
