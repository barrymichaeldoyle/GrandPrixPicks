'use node';

import { render } from '@react-email/render';
import { v } from 'convex/values';

import { internalAction } from '../_generated/server';
import { resend } from '../lib/email';
import type { SessionResultsPostRaceMadePredictionsEmailProps } from './SessionResultsPostRaceMadePredictionsEmail';
import { SessionResultsPostRaceMadePredictionsEmail } from './SessionResultsPostRaceMadePredictionsEmail';
import type { SessionResultsPostRaceMissedPredictionsEmailProps } from './SessionResultsPostRaceMissedPredictionsEmail';
import { SessionResultsPostRaceMissedPredictionsEmail } from './SessionResultsPostRaceMissedPredictionsEmail';
import type { SessionResultsPostRaceMissingH2HPredictionsEmailProps } from './SessionResultsPostRaceMissingH2HPredictionsEmail';
import { SessionResultsPostRaceMissingH2HPredictionsEmail } from './SessionResultsPostRaceMissingH2HPredictionsEmail';
import type { SessionResultsPreRaceMadePredictionsEmailProps } from './SessionResultsPreRaceMadePredictionsEmail';
import { SessionResultsPreRaceMadePredictionsEmail } from './SessionResultsPreRaceMadePredictionsEmail';
import type { SessionResultsPreRaceMissedPredictionsEmailProps } from './SessionResultsPreRaceMissedPredictionsEmail';
import { SessionResultsPreRaceMissedPredictionsEmail } from './SessionResultsPreRaceMissedPredictionsEmail';
import type { SessionResultsPreRaceMissingH2HPredictionsEmailProps } from './SessionResultsPreRaceMissingH2HPredictionsEmail';
import { SessionResultsPreRaceMissingH2HPredictionsEmail } from './SessionResultsPreRaceMissingH2HPredictionsEmail';

export const sendBatch = internalAction({
  args: {
    recipients: v.array(
      v.object({
        email: v.string(),
        variant: v.union(
          v.literal('pre_race_ready'),
          v.literal('pre_race_missing_h2h'),
          v.literal('pre_race_missed'),
          v.literal('post_race_ready'),
          v.literal('post_race_missing_h2h'),
          v.literal('post_race_missed'),
        ),
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
        racePredictionCtaLabel: v.optional(v.string()),
      }),
    ),
    raceName: v.string(),
    raceSlug: v.string(),
    sessionLabel: v.string(),
    round: v.number(),
    countryCode: v.union(v.string(), v.null()),
    hasSprint: v.boolean(),
    nextRaceName: v.optional(v.string()),
    nextRaceSlug: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const appUrl = process.env.APP_URL ?? 'https://grandprixpicks.com';
    const fromAddress =
      process.env.EMAIL_FROM ?? 'Grand Prix Picks <noreply@grandprixpicks.com>';

    let sent = 0;
    let failed = 0;

    for (const recipient of args.recipients) {
      const sharedProps = {
        raceName: args.raceName,
        sessionLabel: args.sessionLabel,
        settingsUrl: `${appUrl}/settings#notifications`,
        logoUrl: `${appUrl}/logo-email.png`,
        round: args.round,
        countryCode: args.countryCode,
        hasSprint: args.hasSprint,
      };
      const resultsUrl = `${appUrl}/races/${args.raceSlug}?utm_source=email&utm_medium=email&utm_campaign=results`;
      const racePredictionUrl = `${appUrl}/races/${args.raceSlug}?utm_source=email&utm_medium=email&utm_campaign=results_race_cta`;
      const nextRaceUrl = args.nextRaceSlug
        ? `${appUrl}/races/${args.nextRaceSlug}?utm_source=email&utm_medium=email&utm_campaign=results_next_race_cta`
        : undefined;

      const preRaceReadyProps: SessionResultsPreRaceMadePredictionsEmailProps =
        {
          ...sharedProps,
          raceUrl: resultsUrl,
          racePredictionUrl,
          racePredictionCtaLabel: recipient.racePredictionCtaLabel,
        };
      const preRaceMissingH2HProps: SessionResultsPreRaceMissingH2HPredictionsEmailProps =
        {
          ...sharedProps,
          raceUrl: resultsUrl,
          racePredictionUrl,
          racePredictionCtaLabel: recipient.racePredictionCtaLabel,
        };
      const preRaceMissedProps: SessionResultsPreRaceMissedPredictionsEmailProps =
        {
          ...sharedProps,
          raceUrl: racePredictionUrl,
        };
      const postRaceReadyProps: SessionResultsPostRaceMadePredictionsEmailProps =
        {
          ...sharedProps,
          raceUrl: resultsUrl,
          nextRaceName: args.nextRaceName,
          nextRaceUrl,
        };
      const postRaceMissingH2HProps: SessionResultsPostRaceMissingH2HPredictionsEmailProps =
        {
          ...sharedProps,
          raceUrl: resultsUrl,
          nextRaceName: args.nextRaceName,
          nextRaceUrl,
        };
      const postRaceMissedProps: SessionResultsPostRaceMissedPredictionsEmailProps =
        {
          ...sharedProps,
          raceUrl: resultsUrl,
          nextRaceName: args.nextRaceName,
          nextRaceUrl,
        };

      let html: string;
      switch (recipient.variant) {
        case 'pre_race_ready':
          html = await render(
            SessionResultsPreRaceMadePredictionsEmail(preRaceReadyProps),
          );
          break;
        case 'pre_race_missing_h2h':
          html = await render(
            SessionResultsPreRaceMissingH2HPredictionsEmail(
              preRaceMissingH2HProps,
            ),
          );
          break;
        case 'pre_race_missed':
          html = await render(
            SessionResultsPreRaceMissedPredictionsEmail(preRaceMissedProps),
          );
          break;
        case 'post_race_ready':
          html = await render(
            SessionResultsPostRaceMadePredictionsEmail(postRaceReadyProps),
          );
          break;
        case 'post_race_missing_h2h':
          html = await render(
            SessionResultsPostRaceMissingH2HPredictionsEmail(
              postRaceMissingH2HProps,
            ),
          );
          break;
        case 'post_race_missed':
          html = await render(
            SessionResultsPostRaceMissedPredictionsEmail(postRaceMissedProps),
          );
          break;
      }

      const subject =
        recipient.variant === 'pre_race_ready' ||
        recipient.variant === 'pre_race_missing_h2h' ||
        recipient.variant === 'post_race_ready' ||
        recipient.variant === 'post_race_missing_h2h'
          ? `${args.sessionLabel} results are ready for ${args.raceName}`
          : recipient.variant === 'pre_race_missed'
            ? `${args.sessionLabel} is done. The race is still open`
            : args.nextRaceName
              ? `${args.sessionLabel} is done. ${args.nextRaceName} is open`
              : `${args.sessionLabel} is done in ${args.raceName}`;

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
