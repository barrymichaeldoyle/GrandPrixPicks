import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { internalMutation } from './_generated/server';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
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
      (u) => u.email && (u.emailReminders ?? true),
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
      .map((u) => ({ email: u.email! }));

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
      if (race.sprintQualiStartAt)
        sessions.push({
          label: 'Sprint Quali',
          startAt: race.sprintQualiStartAt,
          isSprint: true,
        });
      if (race.sprintStartAt)
        sessions.push({
          label: 'Sprint',
          startAt: race.sprintStartAt,
          isSprint: true,
        });
    }
    if (race.qualiStartAt)
      sessions.push({
        label: 'Qualifying',
        startAt: race.qualiStartAt,
        isSprint: false,
      });
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
export async function scheduleReminder(
  ctx: MutationCtx,
  race: Doc<'races'>,
): Promise<void> {
  // Compute the first session lock time for this weekend
  const firstLockTime = race.hasSprint
    ? race.sprintQualiLockAt
    : race.qualiLockAt;

  if (!firstLockTime) return;

  const reminderTime = firstLockTime - TWENTY_FOUR_HOURS_MS;

  // Don't schedule if reminder time is in the past
  if (reminderTime <= Date.now()) return;

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
}
