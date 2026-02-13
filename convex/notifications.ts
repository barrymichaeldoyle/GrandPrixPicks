import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { internalMutation } from './_generated/server';

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;
const BATCH_SIZE = 50;

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
