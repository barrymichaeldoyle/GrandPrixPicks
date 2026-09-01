import { v } from 'convex/values';

import { internalMutation } from './_generated/server';
import { scheduleSessionLockNotifications } from './inAppNotifications';
import { scheduleReminder } from './notifications';

const SINGAPORE_2026_SPRINT_QUALIFYING = Date.parse(
  '2026-10-09T12:30:00Z',
);
const SINGAPORE_2026_SPRINT = Date.parse('2026-10-10T09:00:00Z');

/** Correct the two sprint sessions that were originally stored one day late. */
export const correctSingapore2026SprintSchedule = internalMutation({
  args: {},
  returns: v.object({ updated: v.boolean() }),
  handler: async (ctx) => {
    const race = await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', 'singapore-2026'))
      .first();

    if (!race) {
      throw new Error('singapore-2026 race not found');
    }

    if (
      race.sprintQualiStartAt === SINGAPORE_2026_SPRINT_QUALIFYING &&
      race.sprintQualiLockAt === SINGAPORE_2026_SPRINT_QUALIFYING &&
      race.sprintStartAt === SINGAPORE_2026_SPRINT &&
      race.sprintLockAt === SINGAPORE_2026_SPRINT
    ) {
      return { updated: false };
    }

    await ctx.db.patch(race._id, {
      sprintQualiStartAt: SINGAPORE_2026_SPRINT_QUALIFYING,
      sprintQualiLockAt: SINGAPORE_2026_SPRINT_QUALIFYING,
      sprintStartAt: SINGAPORE_2026_SPRINT,
      sprintLockAt: SINGAPORE_2026_SPRINT,
      updatedAt: Date.now(),
    });

    const updatedRace = await ctx.db.get(race._id);
    if (!updatedRace) {
      throw new Error('singapore-2026 race disappeared during migration');
    }

    await scheduleReminder(ctx, updatedRace);
    await scheduleSessionLockNotifications(ctx, updatedRace);
    return { updated: true };
  },
});
