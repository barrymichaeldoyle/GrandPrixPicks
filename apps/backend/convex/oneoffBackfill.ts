import { v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import { internalMutation } from './_generated/server';

/**
 * ONE-OFF — CLI/dashboard only, not part of the public API.
 *
 * Backfills a single user's `quali` prediction for a target race by copying
 * their picks from a source race's `quali` session. Built to help a player who
 * missed the prediction deadline; the normal `submitPrediction` path refuses
 * locked / non-upcoming sessions by design.
 *
 * Defaults to a DRY RUN (no writes). Pass {"dryRun": false} to actually write.
 * Refuses to run if the target session already has published results, so it
 * can't silently desync a score (clear `requireUnscored` to override).
 *
 * Run via:
 *   npx convex run --prod oneoffBackfill:backfillQualiFromPreviousRace \
 *     '{"username":"dominic"}'                       # dry run
 *   npx convex run --prod oneoffBackfill:backfillQualiFromPreviousRace \
 *     '{"username":"dominic","dryRun":false}'        # commit
 *
 * Safe to delete (and redeploy) after the backfill is done.
 */
export const backfillQualiFromPreviousRace = internalMutation({
  args: {
    username: v.string(),
    sourceSlug: v.optional(v.string()), // default 'spain-2026'
    targetSlug: v.optional(v.string()), // default 'austria-2026'
    dryRun: v.optional(v.boolean()), // default true
    requireUnscored: v.optional(v.boolean()), // default true
  },
  handler: async (ctx, args) => {
    const sourceSlug = args.sourceSlug ?? 'spain-2026';
    const targetSlug = args.targetSlug ?? 'austria-2026';
    const dryRun = args.dryRun ?? true;
    const requireUnscored = args.requireUnscored ?? true;
    const sessionType = 'quali' as const;

    const user = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', args.username))
      .unique();
    if (!user) {
      throw new Error(`No user with username "${args.username}"`);
    }

    const sourceRace = await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', sourceSlug))
      .unique();
    if (!sourceRace) {
      throw new Error(`No race with slug "${sourceSlug}"`);
    }

    const targetRace = await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', targetSlug))
      .unique();
    if (!targetRace) {
      throw new Error(`No race with slug "${targetSlug}"`);
    }

    const sourcePrediction = await ctx.db
      .query('predictions')
      .withIndex('by_user_race_session', (q) =>
        q
          .eq('userId', user._id)
          .eq('raceId', sourceRace._id)
          .eq('sessionType', sessionType),
      )
      .unique();
    if (!sourcePrediction) {
      throw new Error(
        `${args.username} has no ${sessionType} prediction for ${sourceSlug}`,
      );
    }

    const existingTarget = await ctx.db
      .query('predictions')
      .withIndex('by_user_race_session', (q) =>
        q
          .eq('userId', user._id)
          .eq('raceId', targetRace._id)
          .eq('sessionType', sessionType),
      )
      .unique();

    const targetResult = await ctx.db
      .query('results')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', targetRace._id).eq('sessionType', sessionType),
      )
      .unique();
    if (targetResult && requireUnscored) {
      throw new Error(
        `${targetSlug} ${sessionType} already has published results — refusing ` +
          `to backfill silently. A prediction inserted now would NOT be scored ` +
          `unless you re-publish results. Pass {"requireUnscored": false} only ` +
          `if you intend to re-run scoring afterward.`,
      );
    }

    // Resolve driver codes for a readable preview.
    const codes = async (ids: Array<Id<'drivers'>>) =>
      Promise.all(
        ids.map(async (id) => (await ctx.db.get(id))?.code ?? '???'),
      );

    const summary = {
      dryRun,
      user: { id: user._id, username: user.username, displayName: user.displayName },
      sourceRace: sourceRace.name,
      targetRace: targetRace.name,
      sessionType,
      picks: sourcePrediction.picks,
      pickCodes: await codes(sourcePrediction.picks),
      targetAlreadyHadPrediction: Boolean(existingTarget),
      targetAlreadyScored: Boolean(targetResult),
    };

    if (dryRun) {
      return { ...summary, wrote: false, note: 'DRY RUN — no changes written' };
    }

    const now = Date.now();
    if (existingTarget) {
      await ctx.db.patch(existingTarget._id, {
        picks: sourcePrediction.picks,
        updatedAt: now,
      });
      return { ...summary, wrote: true, action: 'patched', predictionId: existingTarget._id };
    }

    const predictionId = await ctx.db.insert('predictions', {
      userId: user._id,
      raceId: targetRace._id,
      sessionType,
      picks: sourcePrediction.picks,
      submittedAt: now,
      updatedAt: now,
    });
    return { ...summary, wrote: true, action: 'inserted', predictionId };
  },
});
