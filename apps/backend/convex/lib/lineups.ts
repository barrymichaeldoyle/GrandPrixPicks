import { coversRound } from '@grandprixpicks/shared/teams';

import type { Doc, Id } from '../_generated/dataModel';
import type { DatabaseReader } from '../_generated/server';

export { coversRound };

/** Enough for a full grid across a season of mid-season swaps. */
const MAX_STINTS_PER_SEASON = 64;

export type Stint = Doc<'driverTeamStints'>;

/**
 * Every team stint in a season, indexed by driver.
 *
 * One read for the whole grid rather than a per-driver lookup: callers
 * resolving a championship walk thousands of classification entries and would
 * otherwise re-query for each one.
 */
export async function loadStintsForSeason(
  ctx: { db: DatabaseReader },
  season: number,
): Promise<Map<string, Stint[]>> {
  const rows = await ctx.db
    .query('driverTeamStints')
    .withIndex('by_season', (q) => q.eq('season', season))
    .take(MAX_STINTS_PER_SEASON);

  const byDriver = new Map<string, Stint[]>();
  for (const stint of rows) {
    const key = stint.driverId as string;
    const existing = byDriver.get(key);
    if (existing) {
      existing.push(stint);
      continue;
    }
    byDriver.set(key, [stint]);
  }
  return byDriver;
}

/**
 * The team a driver drove for in `round`, or null if they were not racing.
 *
 * Stints never overlap, so the first match is the only match.
 */
export function teamForRound(
  stints: ReadonlyMap<string, Stint[]>,
  driverId: Id<'drivers'> | string,
  round: number,
): string | null {
  const forDriver = stints.get(driverId as string);
  if (!forDriver) {
    return null;
  }
  return forDriver.find((stint) => coversRound(stint, round))?.team ?? null;
}

/**
 * Resolve a whole roster as it stood in `round`: only the drivers who were
 * racing, each carrying the team they drove for at the time rather than
 * whatever `drivers.team` says today.
 *
 * This is what keeps a past race page honest. Lawson's round-9 result belongs
 * to Racing Bulls and should render in Racing Bulls colours even after he has
 * moved to Red Bull, and Hadjar must stay visible on the rounds he actually
 * raced while dropping out of the pool for the rounds he is injured for.
 *
 * A driver with no stint at all is treated as racing throughout, so a
 * deployment whose backfill has not run yet degrades to the old behaviour
 * instead of serving an empty grid.
 */
export function rosterForRound<T extends { _id: Id<'drivers'> }>(
  drivers: ReadonlyArray<T>,
  stints: ReadonlyMap<string, Stint[]>,
  round: number,
): Array<T & { team: string | null }> {
  return drivers
    .map((driver) => {
      const hasStints = (stints.get(driver._id as string)?.length ?? 0) > 0;
      if (!hasStints) {
        const current = (driver as { team?: string | null }).team ?? null;
        return { ...driver, team: current };
      }
      const team = teamForRound(stints, driver._id, round);
      return team === null ? null : { ...driver, team };
    })
    .filter((entry): entry is T & { team: string | null } => entry !== null);
}
