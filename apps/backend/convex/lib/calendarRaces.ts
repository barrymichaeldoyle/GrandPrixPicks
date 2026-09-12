import type { Doc } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';

type DbCtx = Pick<QueryCtx, 'db'> | Pick<MutationCtx, 'db'>;

const SYNTHETIC_SLUG_PREFIXES = ['scenario-race-', 'social-race-'] as const;

/**
 * Leftover Playwright / seed fixtures. Their lock times sit on `Date.now()`,
 * so they steal getNextRace, season, and reminder fanout from the real
 * calendar whenever someone forgets to clear a scenario.
 */
export function isSyntheticRaceSlug(slug: string): boolean {
  return SYNTHETIC_SLUG_PREFIXES.some((prefix) => slug.startsWith(prefix));
}

export function calendarRaces<T extends { slug: string }>(
  races: Array<T>,
): Array<T> {
  return races.filter((race) => !isSyntheticRaceSlug(race.slug));
}

export async function loadNextUpcomingRace(
  ctx: DbCtx,
  now: number,
): Promise<Doc<'races'> | null> {
  const upcoming = await ctx.db
    .query('races')
    .withIndex('by_status_and_predictionLockAt', (q) =>
      q.eq('status', 'upcoming').gt('predictionLockAt', now),
    )
    .take(40);
  return calendarRaces(upcoming)[0] ?? null;
}

export async function loadCurrentLockedRace(
  ctx: DbCtx,
  now: number,
  graceMs: number,
): Promise<Doc<'races'> | null> {
  const locked = await ctx.db
    .query('races')
    .withIndex('by_status_and_predictionLockAt', (q) =>
      q.eq('status', 'locked').gt('predictionLockAt', now - graceMs),
    )
    .order('desc')
    .take(40);
  return calendarRaces(locked)[0] ?? null;
}

export async function loadLatestCalendarRace(
  ctx: DbCtx,
): Promise<Doc<'races'> | null> {
  const latest = await ctx.db
    .query('races')
    .withIndex('by_raceStartAt')
    .order('desc')
    .take(40);
  return calendarRaces(latest)[0] ?? null;
}

/**
 * Players predict the next real calendar race. Scenario fixtures are still
 * writable when someone opens them on purpose (admin apply / e2e), so those
 * leftovers cannot block Madrid.
 */
export function isRaceAcceptingPredictions(
  race: Pick<Doc<'races'>, '_id' | 'slug' | 'status' | 'predictionLockAt'>,
  nextCalendarRace: Pick<Doc<'races'>, '_id'> | null,
  now: number,
): boolean {
  if (race.status !== 'upcoming' || race.predictionLockAt <= now) {
    return false;
  }
  if (nextCalendarRace?._id === race._id) {
    return true;
  }
  return isSyntheticRaceSlug(race.slug);
}
