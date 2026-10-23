import { v } from 'convex/values';
import { vOnEmailEventArgs } from '@convex-dev/resend';
import { getCountryCodeForRaceSlug } from '@grandprixpicks/shared/raceCountries';
import { getRaceWriteup } from '@grandprixpicks/shared/raceWriteups';
import { SESSION_LABELS_FULL } from '@grandprixpicks/shared/sessions';
import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { internalMutation, query } from './_generated/server';
import type {
  DeliverPayload,
  LapsedLead,
} from './emails/deliverNotificationEmail';
import {
  buildRaceEmailUrl,
  buildWeekendLeaderboardEmailUrl,
  buildWriteupEmailUrl,
} from './emails/urls';
import { getViewer, requireAdmin } from './lib/auth';
import { loadNextUpcomingRace } from './lib/calendarRaces';
import {
  hasStartedWeekend,
  healthyReminderPush,
  missingPicks,
  sessionLocks,
} from './lib/notificationEligibility';
import {
  shouldEmailReminder,
  wantsEmailResults,
} from './lib/notificationChannels';
import { rankWithinRace, weekendLeader } from './lib/weekendRank';
import { loadNewsHeadlines } from './raceNews';
const kind = v.union(
  v.literal('reminder'),
  v.literal('summary'),
  v.literal('signup'),
);
/**
 * Tries before a job is abandoned. The dispatch cron re-runs every `queued`
 * row once a minute, so anything that fails the same way every time would
 * otherwise retry until the race is over.
 */
const MAX_ATTEMPTS = 5;
const sessionType = v.union(
  v.literal('quali'),
  v.literal('sprint_quali'),
  v.literal('sprint'),
  v.literal('race'),
);
export const queue = internalMutation({
  args: {
    userId: v.id('users'),
    raceId: v.id('races'),
    kind,
    expectedLockAt: v.optional(v.number()),
    sessionType: v.optional(sessionType),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    // The session belongs in the key, not just its lock time: two sessions
    // sharing a timestamp would otherwise dedupe each other away.
    const key = `${args.kind}:${args.raceId}:${args.userId}:${args.expectedLockAt ?? ''}:${args.sessionType ?? ''}`;
    if (
      await ctx.db
        .query('notificationEmails')
        .withIndex('by_key', (q) => q.eq('key', key))
        .unique()
    ) {
      return null;
    }
    const id = await ctx.db.insert('notificationEmails', {
      ...args,
      key,
      status: 'queued',
      createdAt: Date.now(),
    });
    await ctx.scheduler.runAfter(
      args.kind === 'summary' ? 10 * 60000 : 0,
      internal.notificationEmails.send,
      { id },
    );
    return null;
  },
});
export const fanout = internalMutation({
  args: {
    raceId: v.id('races'),
    kind,
    // Which deadline this fan-out is for. Omitted means the weekend's first
    // lock, which is what older queued jobs meant and all this used to do.
    sessionType: v.optional(sessionType),
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const race = await ctx.db.get(args.raceId);
    if (!race || race.status === 'cancelled') {
      return null;
    }
    const now = Date.now();
    const lock = sessionLocks(race).find(
      (s) => !args.sessionType || s.sessionType === args.sessionType,
    );
    if (
      args.kind === 'reminder' &&
      (!lock || lock.lockAt <= now || lock.lockAt - now > 25 * 3600000)
    ) {
      return null;
    }
    const page = await ctx.db
      .query('users')
      .paginate({ cursor: args.cursor ?? null, numItems: 100 });
    for (const user of page.page) {
      if (user.email && !user.deletingAt) {
        await ctx.runMutation(internal.notificationEmails.queue, {
          userId: user._id,
          raceId: race._id,
          kind: args.kind,
          expectedLockAt: args.kind === 'reminder' ? lock?.lockAt : undefined,
          sessionType: args.kind === 'reminder' ? args.sessionType : undefined,
        });
      }
    }
    if (!page.isDone) {
      await ctx.scheduler.runAfter(0, internal.notificationEmails.fanout, {
        ...args,
        cursor: page.continueCursor,
      });
    }
    return null;
  },
});
export const send = internalMutation({
  args: { id: v.id('notificationEmails') },
  returns: v.null(),
  handler: async (ctx, args) => {
    if (process.env.NOTIFICATION_DELIVERY_ENABLED !== 'true') {
      return null;
    }
    const job = await ctx.db.get(args.id);
    if (!job || job.status !== 'queued') {
      return null;
    }
    try {
      return await prepare(ctx, job);
    } catch (error) {
      // A throw here rolls back everything this mutation wrote, so the attempt
      // has to be recorded from the catch or it is never counted at all.
      await recordFailure(ctx, job, error);
      return null;
    }
  },
});

async function prepare(ctx: MutationCtx, job: Doc<'notificationEmails'>) {
  {
    const args = { id: job._id };
    const [user, race] = await Promise.all([
      ctx.db.get(job.userId),
      ctx.db.get(job.raceId),
    ]);
    async function cancel() {
      await ctx.db.patch(args.id, { status: 'cancelled' });
      return null;
    }
    if (
      !user?.email ||
      user.deletingAt ||
      user.emailSuppressed ||
      !race ||
      race.status === 'cancelled'
    ) {
      return await cancel();
    }
    const campaign = await ctx.db
      .query('notificationCampaigns')
      .withIndex('by_key', (q) => q.eq('key', `summary:${race._id}`))
      .unique();
    if (job.kind === 'summary' && campaign?.cancelled) {
      return await cancel();
    }
    const now = Date.now();
    const appUrl = process.env.APP_URL ?? 'https://grandprixpicks.com';
    const countryCode = getCountryCodeForRaceSlug(race.slug);
    let payload: DeliverPayload;
    if (job.kind === 'summary') {
      if (!wantsEmailResults(user)) {
        return await cancel();
      }
      const [top5, h2h] = await Promise.all([
        ctx.db
          .query('scores')
          .withIndex('by_user_race_session', (q) =>
            q.eq('userId', user._id).eq('raceId', race._id),
          )
          .take(4),
        ctx.db
          .query('h2hScores')
          .withIndex('by_user_race_session', (q) =>
            q.eq('userId', user._id).eq('raceId', race._id),
          )
          .take(4),
      ]);
      const upcoming = await loadNextUpcomingRace(ctx, now);
      const nextRace =
        upcoming && upcoming._id !== race._id
          ? {
              name: upcoming.name,
              raceUrl: buildRaceEmailUrl({
                appUrl,
                raceSlug: upcoming.slug,
                campaign: 'weekend_summary',
              }),
              lockAt:
                sessionLocks(upcoming)[0]?.lockAt ?? upcoming.predictionLockAt,
            }
          : null;
      const raceUrl = buildWeekendLeaderboardEmailUrl({
        appUrl,
        raceId: race._id,
        campaign: 'weekend_summary',
      });
      if (!top5.length && !h2h.length) {
        // Someone who has never been scored is the signup nudge's reader, not
        // this mail's. Someone who has, and sat this weekend out, gets the
        // recap: the alternative was that a lapsed player never saw a result
        // again, only deadlines.
        if (
          !(await ctx.db
            .query('scores')
            .withIndex('by_user', (q) => q.eq('userId', user._id))
            .first())
        ) {
          return await cancel();
        }
        const [podium, leader] = await Promise.all([
          podiumFor(ctx, race._id),
          weekendLeader(ctx, race._id),
        ]);
        const leaderUser = leader ? await ctx.db.get(leader.userId) : null;
        payload = {
          kind: 'recap',
          raceName: race.name,
          raceUrl,
          round: race.round,
          countryCode,
          podium,
          weekendWinner:
            leader && leaderUser?.username
              ? { name: leaderUser.username, points: leader.points }
              : null,
          nextRace,
        };
      } else {
        const [weekendRank, bestPick] = await Promise.all([
          rankWithinRace(ctx, race._id, user._id),
          bestPickOf(ctx, top5),
        ]);
        payload = {
          kind: 'summary',
          raceName: race.name,
          raceUrl,
          round: race.round,
          countryCode,
          top5Points: top5.reduce((sum, row) => sum + row.points, 0),
          h2hPoints: h2h.reduce((sum, row) => sum + row.points, 0),
          weekendRank,
          bestPick,
          nextRace,
        };
      }
    } else {
      const locks = sessionLocks(race);
      // The deadline this job was queued for, not simply the weekend's first:
      // one fan-out now runs before each lock, so a job can be about qualifying
      // on a weekend whose sprint sessions have already gone.
      const target = job.sessionType
        ? locks.find((lock) => lock.sessionType === job.sessionType)
        : locks[0];
      if (
        job.expectedLockAt !== undefined &&
        (target?.lockAt !== job.expectedLockAt || job.expectedLockAt <= now)
      ) {
        return await cancel();
      }
      const first = locks[0];
      if (
        // Only the opening deadline goes to the whole roster. A follow-up is
        // for people who started this weekend and have sessions left, not for
        // everyone who ignored the first mail.
        job.sessionType !== undefined &&
        target !== undefined &&
        first !== undefined &&
        target.sessionType !== first.sessionType &&
        !(await hasStartedWeekend(ctx, user._id, race._id))
      ) {
        return await cancel();
      }
      if (
        // Scoped to the session that is about to lock. Someone who has done
        // qualifying and not the race should not be chased about qualifying.
        !(await missingPicks(ctx, user._id, race, now, job.sessionType)) ||
        !shouldEmailReminder(user, await healthyReminderPush(ctx, user, now))
      ) {
        return await cancel();
      }
      const raceUrl = buildRaceEmailUrl({
        appUrl,
        raceSlug: race.slug,
        campaign:
          job.kind === 'signup' ? 'signup_nudge' : 'prediction_reminder',
      });
      if (job.kind === 'signup') {
        const prediction = await ctx.db
          .query('predictions')
          .withIndex('by_user', (q) => q.eq('userId', user._id))
          .first();
        if (prediction || !first || first.lockAt - now <= 25 * 3600000) {
          return await cancel();
        }
        payload = { kind: 'signup', raceName: race.name, raceUrl };
      } else {
        if (!first) {
          return await cancel();
        }
        // Only the sessions still open: a deadline that has passed is not an
        // action, and the reminder exists to name the ones that remain.
        payload = {
          kind: 'reminder',
          raceName: race.name,
          raceUrl,
          round: race.round,
          countryCode,
          lockAt: (target ?? first).lockAt,
          sessions: locks
            .filter((lock) => lock.lockAt > now)
            .map((lock) => ({
              label: SESSION_LABELS_FULL[lock.sessionType],
              startAt: lock.lockAt,
              isSprint:
                lock.sessionType === 'sprint' ||
                lock.sessionType === 'sprint_quali',
            })),
          // Only the weekend's opening mail: a follow-up about qualifying goes
          // to people who already started this weekend, who are not lapsed.
          lapsed:
            job.sessionType === undefined
              ? await lapsedLeadFor(ctx, user._id, race, appUrl)
              : undefined,
        };
      }
    }
    let token = user.unsubscribeToken;
    if (!token) {
      token = crypto.randomUUID() + crypto.randomUUID();
      await ctx.db.patch(user._id, { unsubscribeToken: token });
    }
    const site = process.env.CONVEX_SITE_URL;
    if (!site) {
      throw new Error('CONVEX_SITE_URL is required for email unsubscribe');
    }
    const category = job.kind === 'summary' ? 'results' : 'reminders';
    const unsubscribeUrl = `${site}/notifications/unsubscribe?token=${encodeURIComponent(token)}&category=${category}`;
    // Scheduling commits with this mutation, so flipping the job to `accepted`
    // here cannot hand the same job to Resend twice.
    await ctx.scheduler.runAfter(
      0,
      internal.emails.deliverNotificationEmail.deliver,
      {
        jobId: job._id,
        to: user.email,
        idempotencyKey: job.key,
        unsubscribeUrl,
        settingsUrl: `${appUrl}/settings`,
        logoUrl: `${appUrl}/logo-email.png`,
        timezone: user.timezone,
        payload,
      },
    );
    await ctx.db.patch(job._id, { status: 'accepted' });
    return null;
  }
}

/** The race podium by driver name, for the recap. Empty until it is in. */
async function podiumFor(ctx: QueryCtx, raceId: Id<'races'>) {
  const result = await ctx.db
    .query('results')
    .withIndex('by_race_session', (q) =>
      q.eq('raceId', raceId).eq('sessionType', 'race'),
    )
    .unique();
  const drivers = await Promise.all(
    (result?.classification ?? []).slice(0, 3).map((id) => ctx.db.get(id)),
  );
  return drivers.flatMap((driver) => (driver ? [driver.displayName] : []));
}

/**
 * The pick that earned the most in this weekend's Top 5, named for the email.
 * Ties go to the earlier session, which is the order the weekend was played.
 */
async function bestPickOf(ctx: QueryCtx, scores: Array<Doc<'scores'>>) {
  let best:
    | {
        driverId: Id<'drivers'>;
        predictedPosition: number;
        actualPosition: number | null;
        points: number;
        sessionLabel: string;
      }
    | undefined;
  for (const score of scores) {
    for (const item of score.breakdown ?? []) {
      if (item.points > 0 && (!best || item.points > best.points)) {
        best = {
          driverId: item.driverId,
          predictedPosition: item.predictedPosition,
          actualPosition: item.actualPosition ?? null,
          points: item.points,
          sessionLabel: SESSION_LABELS_FULL[score.sessionType],
        };
      }
    }
  }
  if (!best) {
    return null;
  }
  const driver = await ctx.db.get(best.driverId);
  if (!driver) {
    return null;
  }
  return {
    driverName: driver.displayName,
    predictedPosition: best.predictedPosition,
    actualPosition: best.actualPosition,
    points: best.points,
    sessionLabel: best.sessionLabel,
  };
}

/**
 * Builds the lapsed lead for someone who has played before and skipped the
 * previous round. Anyone else, including a brand-new account (that is the
 * signup nudge's job) and someone who played last time, gets `undefined` and
 * the ordinary deadline-first reminder.
 */
async function lapsedLeadFor(
  ctx: QueryCtx,
  userId: Id<'users'>,
  race: Doc<'races'>,
  appUrl: string,
): Promise<LapsedLead | undefined> {
  const previous = await ctx.db
    .query('races')
    .withIndex('by_season_round', (q) =>
      q.eq('season', race.season).eq('round', race.round - 1),
    )
    .unique();
  if (!previous || previous.status === 'cancelled') {
    return undefined;
  }
  const playedPrevious = await ctx.db
    .query('predictions')
    .withIndex('by_user_race_session', (q) =>
      q.eq('userId', userId).eq('raceId', previous._id),
    )
    .first();
  if (playedPrevious) {
    return undefined;
  }
  // Their most recent weekend, wherever it was: the proof this is their game.
  let lastPrediction: Doc<'predictions'> | null = null;
  for await (const prediction of ctx.db
    .query('predictions')
    .withIndex('by_user', (q) => q.eq('userId', userId))) {
    if (
      !lastPrediction ||
      prediction.submittedAt > lastPrediction.submittedAt
    ) {
      lastPrediction = prediction;
    }
  }
  if (!lastPrediction) {
    return undefined;
  }
  const lastRace = await ctx.db.get(lastPrediction.raceId);
  let lastPlayed = null;
  if (lastRace) {
    const [scores, rank] = await Promise.all([
      ctx.db
        .query('scores')
        .withIndex('by_user_race_session', (q) =>
          q.eq('userId', userId).eq('raceId', lastRace._id),
        )
        .take(4),
      rankWithinRace(ctx, lastRace._id, userId),
    ]);
    lastPlayed = {
      raceName: lastRace.name,
      points: scores.reduce((sum, row) => sum + row.points, 0),
      position: rank?.position ?? null,
      totalPlayers: rank?.totalPlayers ?? null,
    };
  }
  const [headline] = (await loadNewsHeadlines(ctx, race, 1)).items;
  const writeup = getRaceWriteup(race.slug);
  return {
    headline: headline?.headline ?? null,
    sourceName: headline?.sourceName ?? null,
    writeupUrl: writeup
      ? buildWriteupEmailUrl({
          appUrl,
          path: writeup.to,
          campaign: 'prediction_reminder',
        })
      : null,
    lastPlayed,
  };
}

/**
 * Counts one failed try and stops the job once it has had enough of them.
 * Anything short of the ceiling goes back on the queue for the dispatch cron.
 */
async function recordFailure(
  ctx: MutationCtx,
  job: Doc<'notificationEmails'>,
  error: unknown,
) {
  const attempts = (job.attempts ?? 0) + 1;
  await ctx.db.patch(job._id, {
    attempts,
    error: error instanceof Error ? error.message : String(error),
    status: attempts >= MAX_ATTEMPTS ? 'failed' : 'queued',
  });
}

/** Called by the render action when it could not hand the mail to Resend. */
export const markDeliveryFailed = internalMutation({
  args: { id: v.id('notificationEmails'), error: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const job = await ctx.db.get(args.id);
    // `send` optimistically marks the job `accepted` because scheduling the
    // action commits with it. Only the action knows the render or the handoff
    // then failed, so without this the mail is silently lost.
    if (job) {
      await recordFailure(ctx, job, args.error);
    }
    return null;
  },
});

/** Called by the render action right after Resend accepts the send. */
export const recordEmailId = internalMutation({
  args: { id: v.id('notificationEmails'), emailId: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { emailId: args.emailId });
    return null;
  },
});

export const unsubscribe = internalMutation({
  args: {
    token: v.string(),
    category: v.union(v.literal('results'), v.literal('reminders')),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_unsubscribeToken', (q) =>
        q.eq('unsubscribeToken', args.token),
      )
      .unique();
    if (!user) {
      return false;
    }
    await ctx.db.patch(
      user._id,
      args.category === 'results'
        ? { emailResults: false }
        : { emailPredictionReminders: false },
    );
    return true;
  },
});
export const onEmailEvent = internalMutation({
  args: vOnEmailEventArgs,
  returns: v.null(),
  handler: async (ctx, args) => {
    if (
      args.event.type === 'email.bounced' ||
      args.event.type === 'email.complained'
    ) {
      for (const address of Array.isArray(args.event.data.to)
        ? args.event.data.to
        : [args.event.data.to]) {
        const users = await ctx.db
          .query('users')
          .withIndex('by_email', (q) => q.eq('email', address))
          .take(100);
        for (const user of users) {
          await ctx.db.patch(user._id, { emailSuppressed: true });
        }
      }
    } else if (
      args.event.type === 'email.opened' ||
      args.event.type === 'email.clicked'
    ) {
      const job = await ctx.db
        .query('notificationEmails')
        .withIndex('by_emailId', (q) => q.eq('emailId', args.id))
        .unique();
      // First touch only: a job can be opened or clicked many times, and the
      // engagement query only needs "did this happen at all, and how soon."
      if (job) {
        if (args.event.type === 'email.opened' && !job.openedAt) {
          await ctx.db.patch(job._id, { openedAt: Date.now() });
        }
        if (args.event.type === 'email.clicked' && !job.clickedAt) {
          await ctx.db.patch(job._id, { clickedAt: Date.now() });
        }
      }
    }
    return null;
  },
});

/**
 * Per-kind open/click engagement for one race's accepted email jobs. Scoped
 * to a race (not a rolling window) so the read stays bounded by that race's
 * actual audience instead of the whole table.
 */
export const engagementStats = query({
  args: { raceId: v.id('races') },
  returns: v.array(
    v.object({
      kind,
      accepted: v.number(),
      opened: v.number(),
      clicked: v.number(),
    }),
  ),
  handler: async (ctx, args) => {
    requireAdmin(await getViewer(ctx));
    const kinds = ['reminder', 'summary', 'signup'] as const;
    const stats = [];
    for (const jobKind of kinds) {
      const jobs = await ctx.db
        .query('notificationEmails')
        .withIndex('by_race_and_kind', (q) =>
          q.eq('raceId', args.raceId).eq('kind', jobKind),
        )
        .take(5000);
      let accepted = 0;
      let opened = 0;
      let clicked = 0;
      for (const job of jobs) {
        if (job.status !== 'accepted') {
          continue;
        }
        accepted += 1;
        if (job.openedAt) {
          opened += 1;
        }
        if (job.clickedAt) {
          clicked += 1;
        }
      }
      stats.push({ kind: jobKind, accepted, opened, clicked });
    }
    return stats;
  },
});
