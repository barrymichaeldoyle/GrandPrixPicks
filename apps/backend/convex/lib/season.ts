import type { QueryCtx } from '../_generated/server';

/**
 * Only reachable with no races in the database at all, which in practice means
 * a fresh deployment before seeding. Every other path answers from data.
 */
const FALLBACK_SEASON = 2026;

/**
 * Which season the app is currently in, derived from the calendar rather than
 * declared in a constant.
 *
 * The next race that has not locked yet is the best answer: during a season it
 * is that season, and the moment the first race of the next one is scheduled
 * the whole app rolls over on its own. Between the last race of a season and
 * the first of the next there is no upcoming race, so it falls back to the
 * latest race that exists, which keeps a completed season showing its own
 * standings through the winter instead of an empty next one.
 *
 * Deliberately not a hardcoded year. A constant has to be remembered every
 * January, and the thing that gets forgotten is never the obvious page.
 */
export async function getCurrentSeason(
  ctx: Pick<QueryCtx, 'db'>,
): Promise<number> {
  const now = Date.now();
  const nextUpcomingRace = await ctx.db
    .query('races')
    .withIndex('by_status_and_predictionLockAt', (q) =>
      q.eq('status', 'upcoming').gt('predictionLockAt', now),
    )
    .first();
  if (nextUpcomingRace) {
    return nextUpcomingRace.season;
  }

  const latestRace = await ctx.db
    .query('races')
    .withIndex('by_raceStartAt')
    .order('desc')
    .first();
  return latestRace?.season ?? FALLBACK_SEASON;
}
