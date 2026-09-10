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
        timezone: v.optional(v.string()),
        locale: v.optional(v.string()),
      }),
    ),
    raceName: v.string(),
    timeUntilLock: v.string(),
    raceId: v.string(),
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
  },
  returns: v.object({ sent: v.number(), failed: v.number() }),
  handler: async (_ctx, args) => ({
    sent: 0,
    failed:
      'recipients' in args && Array.isArray(args.recipients)
        ? args.recipients.length
        : 1,
  }),
});
export const sendH2HNudge = internalAction({
  args: {
    email: v.string(),
    raceName: v.string(),
    racePath: v.string(),
  },
  returns: v.object({ sent: v.number(), failed: v.number() }),
  handler: async (_ctx, args) => ({
    sent: 0,
    failed:
      'recipients' in args && Array.isArray(args.recipients)
        ? args.recipients.length
        : 1,
  }),
});
export const sendSignupNudge = internalAction({
  args: {
    email: v.string(),
    raceName: v.union(v.string(), v.null()),
    racePath: v.string(),
  },
  returns: v.object({ sent: v.number(), failed: v.number() }),
  handler: async (_ctx, args) => ({
    sent: 0,
    failed:
      'recipients' in args && Array.isArray(args.recipients)
        ? args.recipients.length
        : 1,
  }),
});
