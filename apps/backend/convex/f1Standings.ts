import { v } from 'convex/values';

import { query } from './_generated/server';

/**
 * Formula 1 World Championship standings, computed from the actual finishing
 * order we already store per session (`results.classification`). This is a
 * public, crawlable page distinct from `/leaderboard` (which ranks players of
 * the prediction game): here we rank the real drivers and constructors by the
 * official F1 points system.
 *
 * Only main-race and sprint sessions award championship points; qualifying and
 * sprint qualifying do not.
 */

// Official F1 points: main race scores the top 10, the sprint scores the top 8.
// Index 0 is P1. Positions outside the table score nothing.
export const RACE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1] as const;
export const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1] as const;

export function pointsForPosition(
  position: number,
  table: readonly number[],
): number {
  return position >= 1 && position <= table.length ? table[position - 1] : 0;
}

export type ChampionshipSessionResult = {
  sessionType: 'race' | 'sprint';
  /** Ordered driver ids, index 0 = P1. */
  classification: string[];
  /** Drivers who did not classify (DNF/DSQ). They score nothing. */
  dnfDriverIds?: string[];
};

export type DriverTally = {
  points: number;
  /** Wins in a main race (P1). */
  wins: number;
  /** Podium finishes in a main race (P1–P3). */
  podiums: number;
  /**
   * How many times this driver finished in each main-race position, index 0 =
   * P1. Drives the official championship tie-break (see `compareCountback`).
   */
  racePositionCounts: number[];
};

export function emptyDriverTally(): DriverTally {
  return { points: 0, wins: 0, podiums: 0, racePositionCounts: [] };
}

/**
 * F1's tie-break ("countback"): between drivers level on points, the one with
 * more wins is ahead; still level, more second places; then thirds, and so on
 * down the field. Returns a comparator result (negative = `a` ranks higher).
 *
 * Only main-race finishes count, matching how `wins` and `podiums` are tallied.
 */
export function compareCountback(a: DriverTally, b: DriverTally): number {
  const depth = Math.max(
    a.racePositionCounts.length,
    b.racePositionCounts.length,
  );
  for (let index = 0; index < depth; index++) {
    const diff =
      (b.racePositionCounts[index] ?? 0) - (a.racePositionCounts[index] ?? 0);
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
}

/**
 * Accumulate championship points per driver across every scoring session.
 * Pure (ids are plain strings) so it can be unit-tested without a database.
 */
export function tallyDriverPoints(
  sessions: ChampionshipSessionResult[],
): Map<string, DriverTally> {
  const tally = new Map<string, DriverTally>();
  function ensure(id: string): DriverTally {
    const existing = tally.get(id);
    if (existing) {
      return existing;
    }
    const created = emptyDriverTally();
    tally.set(id, created);
    return created;
  }

  for (const session of sessions) {
    const table = session.sessionType === 'race' ? RACE_POINTS : SPRINT_POINTS;
    const retired = new Set(session.dnfDriverIds ?? []);
    // Classifying position is counted independently of the array index:
    // retirements score nothing *and* must not consume a scoring position, so
    // a DNF listed mid-classification cannot demote everyone below it.
    let position = 0;

    for (const driverId of session.classification) {
      const driver = ensure(driverId);
      if (retired.has(driverId)) {
        continue;
      }
      position += 1;
      driver.points += pointsForPosition(position, table);
      // Wins and podiums are counted from main races only, matching how F1
      // reports them (sprint wins are tracked separately in the real world).
      if (session.sessionType === 'race') {
        driver.racePositionCounts[position - 1] =
          (driver.racePositionCounts[position - 1] ?? 0) + 1;
        if (position === 1) {
          driver.wins += 1;
        }
        if (position <= 3) {
          driver.podiums += 1;
        }
      }
    }
  }

  return tally;
}

export type ConstructorDriverEntry = {
  team: string | null;
  stats: DriverTally;
};

export type ConstructorStanding = {
  team: string;
  points: number;
  wins: number;
  position: number;
};

/**
 * Pool driver tallies by team and apply the Constructors' Championship
 * countback. Kept pure so other official-data views can use the same ordering.
 */
export function rankConstructorStandings(
  drivers: ReadonlyArray<ConstructorDriverEntry>,
): ConstructorStanding[] {
  const teamTally = new Map<string, DriverTally>();
  for (const { team, stats } of drivers) {
    if (!team) {
      continue;
    }
    const current = teamTally.get(team) ?? emptyDriverTally();
    current.points += stats.points;
    current.wins += stats.wins;
    current.podiums += stats.podiums;
    // A team's countback is its drivers' finishes pooled together, so the
    // constructors' tie-break follows the same "most P1s, then P2s…" rule.
    stats.racePositionCounts.forEach((count, index) => {
      current.racePositionCounts[index] =
        (current.racePositionCounts[index] ?? 0) + count;
    });
    teamTally.set(team, current);
  }

  return [...teamTally.entries()]
    .sort(
      ([teamA, statsA], [teamB, statsB]) =>
        statsB.points - statsA.points ||
        compareCountback(statsA, statsB) ||
        teamA.localeCompare(teamB),
    )
    .map(([team, stats], index) => ({
      team,
      points: stats.points,
      wins: stats.wins,
      position: index + 1,
    }));
}

export const getF1Championship = query({
  args: { season: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const season = args.season ?? 2026;

    const races = await ctx.db
      .query('races')
      .withIndex('by_season_round', (q) => q.eq('season', season))
      .take(40);

    const orderedRaces = races
      .filter((race) => race.status !== 'cancelled')
      .sort((a, b) => a.round - b.round);

    const sessions: ChampionshipSessionResult[] = [];
    let lastUpdated = 0;
    let roundsScored = 0;

    for (const race of orderedRaces) {
      const raceResults = await ctx.db
        .query('results')
        .withIndex('by_race_session', (q) => q.eq('raceId', race._id))
        .take(8);

      let scoredThisRound = false;
      for (const result of raceResults) {
        if (result.sessionType !== 'race' && result.sessionType !== 'sprint') {
          continue;
        }
        sessions.push({
          sessionType: result.sessionType,
          classification: result.classification as string[],
          dnfDriverIds: result.dnfDriverIds as string[] | undefined,
        });
        lastUpdated = Math.max(lastUpdated, result.publishedAt);
        if (result.sessionType === 'race') {
          scoredThisRound = true;
        }
      }
      if (scoredThisRound) {
        roundsScored += 1;
      }
    }

    // Load the roster once, rather than a per-driver db.get.
    const drivers = await ctx.db
      .query('drivers')
      .withIndex('by_displayName')
      .take(60);

    const tally = tallyDriverPoints(sessions);

    // List the whole grid, the way the official table does: a driver who has
    // not scored (or who debuts mid-season) still belongs in the standings on
    // zero, rather than vanishing until their first points finish.
    const rankedDrivers = drivers
      .map((driver) => ({
        driver,
        stats: tally.get(driver._id as string) ?? emptyDriverTally(),
      }))
      .sort(
        (a, b) =>
          b.stats.points - a.stats.points ||
          compareCountback(a.stats, b.stats) ||
          a.driver.displayName.localeCompare(b.driver.displayName),
      );

    const driverStandings = rankedDrivers.map(({ driver, stats }, index) => ({
      driverId: driver._id,
      code: driver.code,
      displayName: driver.displayName,
      team: driver.team ?? null,
      nationality: driver.nationality ?? null,
      number: driver.number ?? null,
      points: stats.points,
      wins: stats.wins,
      podiums: stats.podiums,
      position: index + 1,
    }));

    const constructorStandings = rankConstructorStandings(
      rankedDrivers.map(({ driver, stats }) => ({
        team: driver.team ?? null,
        stats,
      })),
    );

    return {
      season,
      lastUpdated: lastUpdated || null,
      roundsScored,
      drivers: driverStandings,
      constructors: constructorStandings,
    };
  },
});
