'use node';
import { v } from 'convex/values';
import { internalAction } from '../_generated/server';

// Compatibility for work queued before the notification policy rollout.
// Old payloads have no recipient identity or expiry and are intentionally retired.
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
    raceId: v.id('races'),
    sessionLabel: v.string(),
    round: v.number(),
    countryCode: v.union(v.string(), v.null()),
    nextRaceName: v.optional(v.string()),
    nextRaceSlug: v.optional(v.string()),
  },
  returns: v.object({ sent: v.number(), failed: v.number() }),
  handler: async (_ctx, args) => ({
    sent: 0,
    failed: 'recipients' in args ? args.recipients.length : 1,
  }),
});
