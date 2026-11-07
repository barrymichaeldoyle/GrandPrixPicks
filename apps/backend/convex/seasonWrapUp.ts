import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { internalMutation, internalQuery, mutation } from './_generated/server';
import { getViewer, requireAdmin } from './lib/auth';
import { calendarRaces } from './lib/calendarRaces';
import { wantsPushResults } from './lib/notificationChannels';
import { getCurrentSeason } from './lib/season';
import { addUserPushTargets, dispatchPushTargets } from './push';

/**
 * The season-end announcement: once the final round is scored, every player
 * who scored this season is pointed at their recap page, by bell, push and
 * email.
 *
 * This deliberately does not hang off `publishResultsCore`. A results publish
 * fires per session and can run again as a rescore, and the invariant there
 * is that a republish stays silent. The season recap is a once-per-season
 * event with its own key in `notificationCampaigns`, checked by a cron, so a
 * reconciliation of the final race can neither fire it twice nor fire it at
 * all before the season is actually complete.
 */

/** More rounds than any season has had; the calendar read is bounded by it. */
const MAX_ROUNDS = 40;

/**
 * How long after the final race's result is published before the recap goes
 * out. The reconciler's first check against the official classification runs
 * three hours after publish, so waiting that long means the numbers in the
 * email are the ones a stewards' decision in the paddock would already have
 * moved.
 */
export const SEASON_RECAP_GRACE_MS = 3 * 60 * 60 * 1000;

const FANOUT_PAGE_SIZE = 100;

export function seasonRecapCampaignKey(season: number): string {
  return `season_recap:${season}`;
}

export function seasonRecapPath(username: string): string {
  return `/p/${encodeURIComponent(username)}/season`;
}

/** Bell and push copy; the email has its own in `deliverNotificationEmail`. */
export function seasonRecapCopy(season: number) {
  return {
    title: `Your ${season} season recap is ready`,
    body: 'Your points, rank, best weekend and most-backed driver, in one place.',
  };
}

type DueWrapUp = {
  season: number;
  finalRace: Doc<'races'>;
};

/**
 * Whether the current season is finished and far enough past its last result
 * to announce. `null` while any calendar race is still to run, while the final
 * race's result is younger than the grace period, or once this season's recap
 * has already gone out.
 */
export async function findDueSeasonWrapUp(
  ctx: Pick<QueryCtx, 'db'>,
  now: number,
): Promise<DueWrapUp | null> {
  const season = await getCurrentSeason(ctx);
  const races = calendarRaces(
    await ctx.db
      .query('races')
      .withIndex('by_season_round', (q) => q.eq('season', season))
      .take(MAX_ROUNDS),
  ).filter((race) => race.status !== 'cancelled');
  if (races.length === 0 || races.some((race) => race.status !== 'finished')) {
    return null;
  }
  const finalRace = races.reduce((last, race) =>
    race.round > last.round ? race : last,
  );
  const result = await ctx.db
    .query('results')
    .withIndex('by_race_session', (q) =>
      q.eq('raceId', finalRace._id).eq('sessionType', 'race'),
    )
    .unique();
  if (!result || result.publishedAt + SEASON_RECAP_GRACE_MS > now) {
    return null;
  }
  const campaign = await ctx.db
    .query('notificationCampaigns')
    .withIndex('by_key', (q) => q.eq('key', seasonRecapCampaignKey(season)))
    .unique();
  if (campaign) {
    return null;
  }
  return { season, finalRace };
}

/** Who the recap is for: someone with a scored weekend this season. */
async function scoredThisSeason(
  ctx: Pick<QueryCtx, 'db'>,
  userId: Id<'users'>,
  season: number,
): Promise<boolean> {
  const standing = await ctx.db
    .query('seasonStandings')
    .withIndex('by_user_season', (q) =>
      q.eq('userId', userId).eq('season', season),
    )
    .unique();
  return standing !== null && standing.raceCount > 0;
}

async function startWrapUp(ctx: MutationCtx, due: DueWrapUp): Promise<void> {
  // The campaign row is the once-only guard, written in the same transaction
  // that schedules the first page, so two overlapping ticks cannot both start.
  await ctx.db.insert('notificationCampaigns', {
    key: seasonRecapCampaignKey(due.season),
    cancelled: false,
    createdAt: Date.now(),
  });
  await ctx.scheduler.runAfter(0, internal.seasonWrapUp.fanout, {
    season: due.season,
    raceId: due.finalRace._id,
  });
}

/** Hourly cron. Does nothing until the season is complete, then fires once. */
export const announceIfDue = internalMutation({
  args: {},
  returns: v.union(v.number(), v.null()),
  handler: async (ctx) => {
    const due = await findDueSeasonWrapUp(ctx, Date.now());
    if (!due) {
      return null;
    }
    await startWrapUp(ctx, due);
    return due.season;
  },
});

/**
 * One page of the roster per transaction. For each player who scored this
 * season: a bell notification linking to their recap, a push if they take
 * results pushes, and an email job if they take results emails. The email is
 * keyed on the final race so `notificationEmails.queue` dedupes it.
 */
export const fanout = internalMutation({
  args: {
    season: v.number(),
    raceId: v.id('races'),
    cursor: v.optional(v.union(v.string(), v.null())),
    notified: v.optional(v.number()),
  },
  returns: v.object({ notified: v.number(), done: v.boolean() }),
  handler: async (ctx, args) => {
    const page = await ctx.db.query('users').paginate({
      numItems: FANOUT_PAGE_SIZE,
      cursor: args.cursor ?? null,
    });
    const copy = seasonRecapCopy(args.season);
    const now = Date.now();
    let notified = args.notified ?? 0;

    for (const user of page.page) {
      if (
        !user.username ||
        user.deletingAt !== undefined ||
        !(await scoredThisSeason(ctx, user._id, args.season))
      ) {
        continue;
      }
      const linkPath = seasonRecapPath(user.username);
      await ctx.db.insert('inAppNotifications', {
        userId: user._id,
        type: 'season_recap',
        title: copy.title,
        body: copy.body,
        linkPath,
        createdAt: now,
      });
      notified += 1;

      if (wantsPushResults(user)) {
        // Per player rather than per page: the destination is their own page.
        const targets = { subscriptions: [], tokens: [] };
        await addUserPushTargets(ctx, targets, user._id);
        await dispatchPushTargets(ctx, targets, {
          title: copy.title,
          body: copy.body,
          url: `${linkPath}?utm_source=push&utm_medium=push&utm_campaign=season_recap`,
          category: 'results',
          eventKey: `${seasonRecapCampaignKey(args.season)}:${user._id}`,
        });
      }
      if (user.email) {
        await ctx.runMutation(internal.notificationEmails.queue, {
          userId: user._id,
          raceId: args.raceId,
          kind: 'season_recap',
        });
      }
    }

    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.seasonWrapUp.fanout, {
        season: args.season,
        raceId: args.raceId,
        cursor: page.continueCursor,
        notified,
      });
    }
    return { notified, done: page.isDone };
  },
});

/**
 * Dry run for the operator: is the recap due, and how many players would it
 * reach. Reads nothing it would not read for real and writes nothing.
 */
export const inspect = internalQuery({
  args: {},
  returns: v.object({
    season: v.number(),
    due: v.boolean(),
    alreadySent: v.boolean(),
    recipients: v.number(),
  }),
  handler: async (ctx) => {
    const season = await getCurrentSeason(ctx);
    const due = await findDueSeasonWrapUp(ctx, Date.now());
    const campaign = await ctx.db
      .query('notificationCampaigns')
      .withIndex('by_key', (q) => q.eq('key', seasonRecapCampaignKey(season)))
      .unique();
    let recipients = 0;
    for await (const standing of ctx.db
      .query('seasonStandings')
      .withIndex('by_season_points', (q) => q.eq('season', season))) {
      if (standing.raceCount > 0) {
        recipients += 1;
      }
    }
    return {
      season,
      due: due !== null,
      alreadySent: campaign !== null,
      recipients,
    };
  },
});

/**
 * Admin override for the day the cron is not trusted: sends the recap now if
 * it is due. It cannot send early (the season must be complete) and it cannot
 * send twice (the campaign key is still the guard).
 */
export const adminAnnounceSeasonRecap = mutation({
  args: {},
  returns: v.union(v.number(), v.null()),
  handler: async (ctx) => {
    requireAdmin(await getViewer(ctx));
    const due = await findDueSeasonWrapUp(ctx, Date.now());
    if (!due) {
      return null;
    }
    await startWrapUp(ctx, due);
    return due.season;
  },
});
