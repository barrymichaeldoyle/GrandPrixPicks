import { v } from 'convex/values';
import { vOnEmailEventArgs } from '@convex-dev/resend';
import { getCountryCodeForRaceSlug } from '@grandprixpicks/shared/raceCountries';
import { SESSION_LABELS_FULL } from '@grandprixpicks/shared/sessions';
import { internal } from './_generated/api';
import { internalMutation } from './_generated/server';
import type { DeliverPayload } from './emails/deliverNotificationEmail';
import {
  buildRaceEmailUrl,
  buildWeekendLeaderboardEmailUrl,
} from './emails/urls';
import {
  healthyReminderPush,
  missingPicks,
  sessionLocks,
} from './lib/notificationEligibility';
import {
  shouldEmailReminder,
  wantsEmailResults,
} from './lib/notificationChannels';
const kind = v.union(
  v.literal('reminder'),
  v.literal('summary'),
  v.literal('signup'),
);
export const queue = internalMutation({
  args: {
    userId: v.id('users'),
    raceId: v.id('races'),
    kind,
    expectedLockAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const key = `${args.kind}:${args.raceId}:${args.userId}:${args.expectedLockAt ?? ''}`;
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
    cursor: v.optional(v.union(v.string(), v.null())),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const race = await ctx.db.get(args.raceId);
    if (!race || race.status === 'cancelled') {
      return null;
    }
    const page = await ctx.db
      .query('users')
      .paginate({ cursor: args.cursor ?? null, numItems: 100 });
    const first = sessionLocks(race)[0];
    // This entry point can also be invoked by older queued reminder jobs.
    if (
      args.kind === 'reminder' &&
      (!first ||
        first.lockAt <= Date.now() ||
        first.lockAt - Date.now() > 25 * 3600000)
    ) {
      return null;
    }
    for (const user of page.page) {
      if (user.email && !user.deletingAt) {
        await ctx.runMutation(internal.notificationEmails.queue, {
          userId: user._id,
          raceId: race._id,
          kind: args.kind,
          expectedLockAt: args.kind === 'reminder' ? first?.lockAt : undefined,
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
      if (!top5.length && !h2h.length) {
        return await cancel();
      }
      payload = {
        kind: 'summary',
        raceName: race.name,
        raceUrl: buildWeekendLeaderboardEmailUrl({
          appUrl,
          raceId: race._id,
          campaign: 'weekend_summary',
        }),
        round: race.round,
        countryCode,
        top5Points: top5.reduce((sum, row) => sum + row.points, 0),
        h2hPoints: h2h.reduce((sum, row) => sum + row.points, 0),
      };
    } else {
      const locks = sessionLocks(race);
      const first = locks[0];
      if (
        job.expectedLockAt !== undefined &&
        (first?.lockAt !== job.expectedLockAt || job.expectedLockAt <= now)
      ) {
        return await cancel();
      }
      if (
        !(await missingPicks(ctx, user._id, race, now)) ||
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
          lockAt: first.lockAt,
          sessions: locks
            .filter((lock) => lock.lockAt > now)
            .map((lock) => ({
              label: SESSION_LABELS_FULL[lock.sessionType],
              startAt: lock.lockAt,
              isSprint:
                lock.sessionType === 'sprint' ||
                lock.sessionType === 'sprint_quali',
            })),
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
    }
    return null;
  },
});
