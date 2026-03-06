import { SESSION_LABELS_FULL } from '@grandprixpicks/shared/sessions';
import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { internalMutation, mutation } from './_generated/server';
import { getViewer, requireAdmin } from './lib/auth';
import {
  getPredictionReminderChannel,
  getResultsNotificationChannel,
  includesEmail,
  includesPush,
} from './lib/notificationChannels';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const BATCH_SIZE = 50;

/** Map race slug prefix to ISO 3166-1 alpha-2 country code (mirrors RaceCard.tsx). */
const SLUG_TO_COUNTRY: Record<string, string> = {
  australia: 'au',
  australian: 'au',
  china: 'cn',
  chinese: 'cn',
  japan: 'jp',
  japanese: 'jp',
  bahrain: 'bh',
  'saudi-arabia': 'sa',
  'saudi-arabian': 'sa',
  saudi: 'sa',
  miami: 'us',
  canada: 'ca',
  monaco: 'mc',
  spain: 'es',
  madrid: 'es',
  austria: 'at',
  britain: 'gb',
  belgium: 'be',
  hungary: 'hu',
  netherlands: 'nl',
  italy: 'it',
  'emilia-romagna': 'it',
  imola: 'it',
  singapore: 'sg',
  usa: 'us',
  'united-states': 'us',
  mexico: 'mx',
  brazil: 'br',
  qatar: 'qa',
  'abu-dhabi': 'ae',
  uae: 'ae',
  portugal: 'pt',
  'las-vegas': 'us',
  azerbaijan: 'az',
};

function getCountryCodeForRace(slug: string): string | null {
  const key = slug.replace(/-\d{4}$/, '').toLowerCase();
  return SLUG_TO_COUNTRY[key] ?? null;
}

/**
 * Scheduled mutation: sends prediction reminder emails for a race.
 * Called by the scheduler 24h before the first session locks.
 */
export const sendPredictionReminders = internalMutation({
  args: { raceId: v.id('races') },
  handler: async (ctx, args) => {
    const race = await ctx.db.get(args.raceId);
    if (!race || race.status !== 'upcoming') {
      return { skipped: true, reason: 'Race not upcoming' };
    }

    // Find users with email set and reminders enabled (default true)
    const allUsers = await ctx.db.query('users').collect();
    const eligibleUsers = allUsers.filter(
      (u) => u.email && includesEmail(getPredictionReminderChannel(u)),
    );

    // Find users who already have predictions for this race
    const predictions = await ctx.db
      .query('predictions')
      .withIndex('by_race_session', (q) => q.eq('raceId', args.raceId))
      .collect();
    const usersWithPredictions = new Set(predictions.map((p) => p.userId));

    // Filter to users who haven't predicted
    const recipients = eligibleUsers
      .filter((u) => !usersWithPredictions.has(u._id))
      .map((u) => ({
        email: u.email!,
        timezone: u.timezone,
        locale: u.locale,
      }));

    if (recipients.length === 0) {
      return { skipped: true, reason: 'No eligible recipients' };
    }

    // Build session schedule for the email
    const sessions: Array<{
      label: string;
      startAt: number;
      isSprint: boolean;
    }> = [];
    if (race.hasSprint) {
      if (race.sprintQualiStartAt) {
        sessions.push({
          label: 'Sprint Qualifying',
          startAt: race.sprintQualiStartAt,
          isSprint: true,
        });
      }
      if (race.sprintStartAt) {
        sessions.push({
          label: 'Sprint',
          startAt: race.sprintStartAt,
          isSprint: true,
        });
      }
    }
    if (race.qualiStartAt) {
      sessions.push({
        label: 'Qualifying',
        startAt: race.qualiStartAt,
        isSprint: false,
      });
    }
    sessions.push({
      label: 'Race',
      startAt: race.raceStartAt,
      isSprint: false,
    });

    // Schedule send action in batches of BATCH_SIZE
    let scheduled = 0;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      await ctx.scheduler.runAfter(
        0,
        internal.emails.sendReminderEmails.sendBatch,
        {
          recipients: batch,
          raceName: race.name,
          timeUntilLock: '24 hours',
          raceId: race._id,
          raceSlug: race.slug,
          sessions,
          round: race.round,
          countryCode: getCountryCodeForRace(race.slug),
          hasSprint: race.hasSprint ?? false,
        },
      );
      scheduled++;
    }

    return { recipientCount: recipients.length, batchesScheduled: scheduled };
  },
});

/**
 * Schedule (or reschedule) the 24h prediction reminder for a race.
 * Called from seedRaces after each race is created/updated.
 */
const sessionTypeValidator = v.union(
  v.literal('quali'),
  v.literal('sprint_quali'),
  v.literal('sprint'),
  v.literal('race'),
);
type SessionType = 'quali' | 'sprint_quali' | 'sprint' | 'race';

function requiredSessionsForRace(hasSprint: boolean): Array<SessionType> {
  return hasSprint
    ? ['quali', 'sprint_quali', 'sprint', 'race']
    : ['quali', 'race'];
}

export function getIncompleteH2HNudgeEligibility(params: {
  raceStatus: string;
  predictionLockAt: number;
  now: number;
  requiredSessions: Array<SessionType>;
  top5Sessions: Set<SessionType>;
  h2hSessions: Set<SessionType>;
}):
  | { eligible: true }
  | {
      eligible: false;
      reason:
        | 'race_not_upcoming'
        | 'predictions_locked'
        | 'top5_incomplete'
        | 'h2h_complete';
    } {
  if (params.raceStatus !== 'upcoming') {
    return { eligible: false, reason: 'race_not_upcoming' };
  }
  if (params.predictionLockAt <= params.now) {
    return { eligible: false, reason: 'predictions_locked' };
  }

  const hasCompleteTop5 = params.requiredSessions.every((s) =>
    params.top5Sessions.has(s),
  );
  if (!hasCompleteTop5) {
    return { eligible: false, reason: 'top5_incomplete' };
  }

  const hasCompleteH2H = params.requiredSessions.every((s) =>
    params.h2hSessions.has(s),
  );
  if (hasCompleteH2H) {
    return { eligible: false, reason: 'h2h_complete' };
  }

  return { eligible: true };
}

export function getSignupPredictionNudgeEligibility(params: {
  hasPredictions: boolean;
  remindersEnabled: boolean;
  canEmail: boolean;
  canPush: boolean;
}):
  | { eligible: true }
  | {
      eligible: false;
      reason: 'already_predicted' | 'notifications_disabled' | 'no_channel';
    } {
  if (params.hasPredictions) {
    return { eligible: false, reason: 'already_predicted' };
  }
  if (!params.remindersEnabled) {
    return { eligible: false, reason: 'notifications_disabled' };
  }
  if (!params.canEmail && !params.canPush) {
    return { eligible: false, reason: 'no_channel' };
  }
  return { eligible: true };
}

/**
 * Scheduled mutation: gathers data and fans out result notification emails.
 * Called ~30s after scoring completes for a session.
 */
export const sendResultEmailsForSession = internalMutation({
  args: {
    raceId: v.id('races'),
    sessionType: sessionTypeValidator,
  },
  handler: async (ctx, args) => {
    // 1. Load race
    const race = await ctx.db.get(args.raceId);
    if (!race) {
      return { skipped: true, reason: 'Race not found' };
    }

    const sessionLabel = SESSION_LABELS_FULL[args.sessionType];

    // 2. Load all season standings, sorted desc by totalPoints → global rank
    const allStandings = await ctx.db
      .query('seasonStandings')
      .withIndex('by_season_points', (q) => q.eq('season', race.season))
      .collect();
    // Index sorts ascending; we need descending for ranking
    allStandings.sort((a, b) => b.totalPoints - a.totalPoints);

    // Build userId → globalRank map
    const globalRankMap = new Map<string, number>();
    for (let i = 0; i < allStandings.length; i++) {
      globalRankMap.set(allStandings[i].userId, i + 1);
    }
    const globalTotal = allStandings.length;

    // 3. Load all scores for this race+session
    const allScores = await ctx.db
      .query('scores')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )
      .collect();
    const scoreMap = new Map<string, Doc<'scores'>>();
    for (const s of allScores) {
      scoreMap.set(s.userId, s);
    }

    // 4. Load league memberships and league docs
    // Group memberships by userId
    const allLeagueMembers = await ctx.db.query('leagueMembers').collect();

    // Build userId → leagueId[] map
    const userLeagues = new Map<string, Array<Id<'leagues'>>>();
    // Build leagueId → userId set for ranking
    const leagueMemberSets = new Map<string, Set<string>>();
    for (const m of allLeagueMembers) {
      const leagues = userLeagues.get(m.userId) ?? [];
      leagues.push(m.leagueId);
      userLeagues.set(m.userId, leagues);

      const members = leagueMemberSets.get(m.leagueId) ?? new Set();
      members.add(m.userId);
      leagueMemberSets.set(m.leagueId, members);
    }

    // Load league docs for names (deduplicated)
    const uniqueLeagueIds = new Set<Id<'leagues'>>();
    for (const ids of userLeagues.values()) {
      for (const id of ids) {
        uniqueLeagueIds.add(id);
      }
    }
    const leagueNames = new Map<string, string>();
    for (const leagueId of uniqueLeagueIds) {
      const league = await ctx.db.get(leagueId);
      if (league) {
        leagueNames.set(leagueId, league.name);
      }
    }

    // 5. Load all users, filter to eligible
    const allUsers = await ctx.db.query('users').collect();
    const eligibleUsers = allUsers.filter(
      (u) =>
        u.email &&
        includesEmail(getResultsNotificationChannel(u)) &&
        scoreMap.has(u._id),
    );

    if (eligibleUsers.length === 0) {
      return { skipped: true, reason: 'No eligible recipients' };
    }

    // Cache driver code lookups
    const driverCodeCache = new Map<string, string>();
    async function getDriverCode(driverId: Id<'drivers'>): Promise<string> {
      const cached = driverCodeCache.get(driverId);
      if (cached) {
        return cached;
      }
      const driver = await ctx.db.get(driverId);
      const code = driver?.code ?? '???';
      driverCodeCache.set(driverId, code);
      return code;
    }

    // 6. Build per-user payloads
    type RecipientPayload = {
      email: string;
      sessionPoints: number;
      bestPick: {
        code: string;
        position: number;
        points: number;
      } | null;
      globalRank: number;
      globalTotal: number;
      leagueRanks: Array<{
        leagueName: string;
        rank: number;
        total: number;
      }>;
    };

    const recipients: Array<RecipientPayload> = [];

    for (const user of eligibleUsers) {
      const score = scoreMap.get(user._id)!;

      // Best pick: highest-scoring pick with points >= 3
      let bestPick: RecipientPayload['bestPick'] = null;
      if (score.breakdown) {
        const candidates = score.breakdown
          .filter((b) => b.points >= 3)
          .sort((a, b) => b.points - a.points);
        if (candidates.length > 0) {
          const best = candidates[0];
          bestPick = {
            code: await getDriverCode(best.driverId),
            position: best.predictedPosition,
            points: best.points,
          };
        }
      }

      // Global rank
      const globalRank = globalRankMap.get(user._id) ?? globalTotal;

      // League ranks (cap at 3)
      const leagueRanks: RecipientPayload['leagueRanks'] = [];
      const userLeagueIds = userLeagues.get(user._id) ?? [];
      for (const leagueId of userLeagueIds.slice(0, 3)) {
        const leagueName = leagueNames.get(leagueId);
        if (!leagueName) {
          continue;
        }

        const memberSet = leagueMemberSets.get(leagueId);
        if (!memberSet) {
          continue;
        }

        // Filter standings to league members and find rank
        const leagueStandings = allStandings.filter((s) =>
          memberSet.has(s.userId),
        );
        const rank =
          leagueStandings.findIndex((s) => s.userId === user._id) + 1;
        leagueRanks.push({
          leagueName,
          rank: rank || leagueStandings.length,
          total: leagueStandings.length,
        });
      }

      recipients.push({
        email: user.email!,
        sessionPoints: score.points,
        bestPick,
        globalRank,
        globalTotal,
        leagueRanks,
      });
    }

    // 7. Batch recipients into groups of 50 → schedule sendBatch
    const countryCode = getCountryCodeForRace(race.slug);
    let scheduled = 0;
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      await ctx.scheduler.runAfter(
        0,
        internal.emails.sendResultEmails.sendBatch,
        {
          recipients: batch,
          raceName: race.name,
          raceId: race._id,
          sessionLabel,
          round: race.round,
          countryCode,
          hasSprint: race.hasSprint ?? false,
        },
      );
      scheduled++;
    }

    return { recipientCount: recipients.length, batchesScheduled: scheduled };
  },
});

/**
 * Scheduled mutation: nudge a single user if they completed Top 5 picks but still
 * haven't completed H2H for the same weekend.
 */
export const sendIncompleteH2HNudgeForUser = internalMutation({
  args: {
    raceId: v.id('races'),
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const [race, user] = await Promise.all([
      ctx.db.get(args.raceId),
      ctx.db.get(args.userId),
    ]);

    if (!race) {
      return { skipped: true, reason: 'Race not found' };
    }
    if (!user) {
      return { skipped: true, reason: 'User not found' };
    }

    const now = Date.now();
    const requiredSessions = requiredSessionsForRace(race.hasSprint ?? false);

    const [top5Rows, h2hRows] = await Promise.all([
      ctx.db
        .query('predictions')
        .withIndex('by_user_race_session', (q) =>
          q.eq('userId', args.userId).eq('raceId', args.raceId),
        )
        .collect(),
      ctx.db
        .query('h2hPredictions')
        .withIndex('by_user_race_session', (q) =>
          q.eq('userId', args.userId).eq('raceId', args.raceId),
        )
        .collect(),
    ]);

    const top5Sessions = new Set(
      top5Rows.map((p) => p.sessionType as SessionType),
    );
    const h2hSessions = new Set(
      h2hRows.map((p) => p.sessionType as SessionType),
    );

    const eligibility = getIncompleteH2HNudgeEligibility({
      raceStatus: race.status,
      predictionLockAt: race.predictionLockAt,
      now,
      requiredSessions,
      top5Sessions,
      h2hSessions,
    });
    if (!eligibility.eligible) {
      return { skipped: true, reason: eligibility.reason };
    }

    const racePath = `/races/${race.slug}`;
    let emailQueued = false;
    let pushQueued = 0;

    const reminderChannel = getPredictionReminderChannel(user);

    if (user.email && includesEmail(reminderChannel)) {
      await ctx.scheduler.runAfter(
        0,
        internal.emails.sendReminderEmails.sendH2HNudge,
        {
          email: user.email,
          raceName: race.name,
          racePath,
        },
      );
      emailQueued = true;
    }

    const subscriptions = await ctx.db
      .query('pushSubscriptions')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    if (includesPush(reminderChannel) && subscriptions.length > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.pushNotifications.sendPushBatch,
        {
          subscriptions: subscriptions.map((s) => ({
            endpoint: s.endpoint,
            p256dh: s.p256dh,
            auth: s.auth,
          })),
          title: `🏎️ ${race.name}`,
          body: 'Top 5 submitted. Finish your teammate H2H picks.',
          url: `${racePath}?utm_source=push&utm_medium=push&utm_campaign=h2h_nudge`,
        },
      );
      pushQueued = subscriptions.length;
    }

    return { ok: true, emailQueued, pushQueued };
  },
});

/**
 * Scheduled mutation: 1h after signup, nudge users who still haven't made
 * any Top 5 prediction.
 */
export const sendSignupPredictionNudgeForUser = internalMutation({
  args: {
    userId: v.id('users'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { skipped: true, reason: 'User not found' };
    }

    const reminderChannel = getPredictionReminderChannel(user);

    const firstPrediction = await ctx.db
      .query('predictions')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .first();
    const hasPredictions = firstPrediction !== null;

    const subscriptions = await ctx.db
      .query('pushSubscriptions')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();

    const remindersEnabled =
      includesEmail(reminderChannel) || includesPush(reminderChannel);
    const canEmail = Boolean(user.email) && includesEmail(reminderChannel);
    const canPush = includesPush(reminderChannel) && subscriptions.length > 0;

    const eligibility = getSignupPredictionNudgeEligibility({
      hasPredictions,
      remindersEnabled,
      canEmail,
      canPush,
    });
    if (!eligibility.eligible) {
      return { skipped: true, reason: eligibility.reason };
    }

    const now = Date.now();
    const nextRace = await ctx.db
      .query('races')
      .withIndex('by_predictionLockAt', (q) => q.gt('predictionLockAt', now))
      .first();

    const hasUpcomingRace = Boolean(nextRace && nextRace.status === 'upcoming');
    const raceName = hasUpcomingRace ? nextRace!.name : null;
    const racePath = hasUpcomingRace ? `/races/${nextRace!.slug}` : '/races';

    let emailQueued = false;
    let pushQueued = 0;

    if (canEmail && user.email) {
      await ctx.scheduler.runAfter(
        0,
        internal.emails.sendReminderEmails.sendSignupNudge,
        {
          email: user.email,
          raceName,
          racePath,
        },
      );
      emailQueued = true;
    }

    if (canPush) {
      await ctx.scheduler.runAfter(
        0,
        internal.pushNotifications.sendPushBatch,
        {
          subscriptions: subscriptions.map((s) => ({
            endpoint: s.endpoint,
            p256dh: s.p256dh,
            auth: s.auth,
          })),
          title: '🏎️ Make your first prediction',
          body: hasUpcomingRace
            ? `You still need to submit picks for ${nextRace!.name}.`
            : 'You still need to submit your first picks.',
          url: `${racePath}?utm_source=push&utm_medium=push&utm_campaign=signup_nudge`,
        },
      );
      pushQueued = subscriptions.length;
    }

    return { ok: true, emailQueued, pushQueued };
  },
});

/**
 * Internal mutation: batch H2H reminder emails for users who completed Top 5
 * but still haven't submitted all H2H picks for the race.
 */
export const sendH2HRemindersForRace = internalMutation({
  args: { raceId: v.id('races') },
  handler: async (ctx, args) => {
    const race = await ctx.db.get(args.raceId);
    if (!race || race.status !== 'upcoming') {
      return { skipped: true, reason: 'Race not upcoming' };
    }
    if (race.predictionLockAt <= Date.now()) {
      return { skipped: true, reason: 'Predictions locked' };
    }

    const requiredSessions = requiredSessionsForRace(race.hasSprint ?? false);

    const allUsers = await ctx.db.query('users').collect();
    const eligibleUsers = allUsers.filter(
      (u) => u.email && includesEmail(getPredictionReminderChannel(u)),
    );

    const allPredictions = await ctx.db
      .query('predictions')
      .withIndex('by_race_session', (q) => q.eq('raceId', args.raceId))
      .collect();
    const top5ByUser = new Map<string, Set<SessionType>>();
    for (const p of allPredictions) {
      const sessions = top5ByUser.get(p.userId) ?? new Set<SessionType>();
      sessions.add(p.sessionType as SessionType);
      top5ByUser.set(p.userId, sessions);
    }

    const allH2HPredictions = await ctx.db
      .query('h2hPredictions')
      .withIndex('by_race_session', (q) => q.eq('raceId', args.raceId))
      .collect();
    const h2hByUser = new Map<string, Set<SessionType>>();
    for (const p of allH2HPredictions) {
      const sessions = h2hByUser.get(p.userId) ?? new Set<SessionType>();
      sessions.add(p.sessionType as SessionType);
      h2hByUser.set(p.userId, sessions);
    }

    const racePath = `/races/${race.slug}`;
    let scheduled = 0;
    for (const user of eligibleUsers) {
      const top5Sessions = top5ByUser.get(user._id) ?? new Set<SessionType>();
      const h2hSessions = h2hByUser.get(user._id) ?? new Set<SessionType>();

      const hasCompleteTop5 = requiredSessions.every((s) =>
        top5Sessions.has(s),
      );
      if (!hasCompleteTop5) {
        continue;
      }

      const hasCompleteH2H = requiredSessions.every((s) => h2hSessions.has(s));
      if (hasCompleteH2H) {
        continue;
      }

      await ctx.scheduler.runAfter(
        0,
        internal.emails.sendReminderEmails.sendH2HNudge,
        { email: user.email!, raceName: race.name, racePath },
      );
      scheduled++;
    }

    return { scheduled };
  },
});

/**
 * Public admin mutation: manually trigger Top 5 and H2H reminder emails
 * for an upcoming race. Useful when the scheduled 24h reminder was missed
 * or you want to send a last-minute nudge.
 */
export const adminTriggerReminders = mutation({
  args: { raceId: v.id('races') },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    requireAdmin(viewer);

    const race = await ctx.db.get(args.raceId);
    if (!race) {
      throw new Error('Race not found');
    }
    if (race.status !== 'upcoming') {
      throw new Error('Race is not upcoming');
    }

    await ctx.scheduler.runAfter(
      0,
      internal.notifications.sendPredictionReminders,
      { raceId: args.raceId },
    );
    await ctx.scheduler.runAfter(
      0,
      internal.notifications.sendH2HRemindersForRace,
      { raceId: args.raceId },
    );

    return { triggered: true };
  },
});

/**
 * CLI-runnable internal mutation: sends Top 5 + H2H reminder emails for the
 * next upcoming race without requiring an authenticated context.
 * Usage: npx convex run notifications:triggerRemindersForNextRace --prod
 */
export const triggerRemindersForNextRace = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const race = await ctx.db
      .query('races')
      .withIndex('by_predictionLockAt', (q) => q.gt('predictionLockAt', now))
      .filter((q) => q.eq(q.field('status'), 'upcoming'))
      .first();

    if (!race) {
      return { skipped: true, reason: 'No upcoming race found' };
    }

    await ctx.scheduler.runAfter(
      0,
      internal.notifications.sendPredictionReminders,
      { raceId: race._id },
    );
    await ctx.scheduler.runAfter(
      0,
      internal.notifications.sendH2HRemindersForRace,
      { raceId: race._id },
    );

    return { triggered: true, raceName: race.name, raceId: race._id };
  },
});

export async function scheduleReminder(
  ctx: MutationCtx,
  race: Doc<'races'>,
): Promise<void> {
  // Compute the first session lock time for this weekend
  const firstLockTime = race.hasSprint
    ? race.sprintQualiLockAt
    : race.qualiLockAt;

  if (!firstLockTime) {
    return;
  }

  const reminderTime = firstLockTime - TWENTY_FOUR_HOURS_MS;

  // Don't schedule if reminder time is in the past
  if (reminderTime <= Date.now()) {
    return;
  }

  // Cancel existing scheduled reminder if present
  if (race.reminderScheduledId) {
    try {
      await ctx.scheduler.cancel(
        race.reminderScheduledId as Id<'_scheduled_functions'>,
      );
    } catch {
      // Already ran or was cancelled — safe to ignore
    }
  }

  // Schedule the new reminder
  const scheduledId = await ctx.scheduler.runAt(
    reminderTime,
    internal.notifications.sendPredictionReminders,
    { raceId: race._id },
  );

  // Store the scheduled function ID on the race
  await ctx.db.patch(race._id, {
    reminderScheduledId: scheduledId as unknown as string,
  });

  // Schedule push notifications alongside email reminder
  // 24h push: all subscribed users
  const push24hTime = firstLockTime - TWENTY_FOUR_HOURS_MS;
  if (push24hTime > Date.now()) {
    await ctx.scheduler.runAt(
      push24hTime,
      internal.push.sendPushRemindersForRace,
      { raceId: race._id, filterUnpredicted: false },
    );
  }

  // 2h push: only users who haven't made any predictions yet
  const push2hTime = firstLockTime - TWO_HOURS_MS;
  if (push2hTime > Date.now()) {
    await ctx.scheduler.runAt(
      push2hTime,
      internal.push.sendPushRemindersForRace,
      { raceId: race._id, filterUnpredicted: true },
    );
  }
}
