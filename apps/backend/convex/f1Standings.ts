import { currentPairings } from '@grandprixpicks/shared/teams';
import { v } from 'convex/values';

import type { DatabaseReader } from './_generated/server';
import { query } from './_generated/server';
import { loadStintsForSeason, teamForRound } from './lib/lineups';
import { getCurrentSeason } from './lib/season';
import { sortByConstructorStanding } from './lib/teammateBattles';

type ReadCtx = { db: DatabaseReader };

/**
 * Formula 1 World Championship standings, computed from the actual finishing
 * order we already store per session (`results.classification`). This is a
 * public, crawlable page distinct from `/leaderboard` (which ranks players of
 * the prediction game): here we rank the real drivers and constructors by the
 * official F1 points system.
 *
 * Only main-race and sprint sessions award championship points; qualifying and
 * sprint qualifying do not. The primitives here are session-agnostic, though,
 * because `qualifyingChampionship.ts` runs the same accumulator over Saturday
 * to answer "what if only qualifying counted" — see `tallyBy`.
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

/**
 * Every session type a championship can be scored over, and the table it pays.
 *
 * The two qualifying entries are not an official points system — F1 awards
 * nothing on Saturday. They exist so the alternative championship can be
 * stated in one line a reader will accept: a session that sets the grid for a
 * race pays the race table, and one that sets the grid for a sprint pays the
 * sprint table. Any other mapping needs defending in the copy as well as here.
 */
export const POINTS_TABLES = {
  race: RACE_POINTS,
  sprint: SPRINT_POINTS,
  quali: RACE_POINTS,
  sprint_quali: SPRINT_POINTS,
} as const satisfies Record<string, readonly number[]>;

export type ChampionshipSessionType = keyof typeof POINTS_TABLES;

export type ChampionshipSessionResult = {
  sessionType: ChampionshipSessionType;
  /** Championship round, which decides who a driver scored *for*. */
  round: number;
  /** Ordered driver ids, index 0 = P1. */
  classification: string[];
  /** Drivers who did not classify (DNF/DSQ). They score nothing. */
  dnfDriverIds?: string[];
};

export type DriverTally = {
  points: number;
  /**
   * Firsts in the headline session: race wins for the real championship, poles
   * for the qualifying one.
   */
  wins: number;
  /**
   * Top-`podiumDepth` finishes in the headline session: podiums (P1–P3) for the
   * real championship, front rows (P1–P2) for the qualifying one.
   */
  podiums: number;
  /**
   * How many times this driver finished in each headline-session position,
   * index 0 = P1. Drives the championship tie-break (see `compareCountback`).
   */
  headlinePositionCounts: number[];
};

export function emptyDriverTally(): DriverTally {
  return { points: 0, wins: 0, podiums: 0, headlinePositionCounts: [] };
}

/**
 * Which session type's finishing positions the headline counts and the
 * tie-break are read from, and how deep a "podium" runs.
 *
 * Defaulted to the real championship so every existing caller is unchanged.
 * The qualifying championship passes `quali` and a depth of 2, because the
 * Saturday equivalent of a podium is the front row.
 */
export type TallyOptions = {
  headlineSession?: ChampionshipSessionType;
  podiumDepth?: number;
};

const DEFAULT_TALLY_OPTIONS = {
  headlineSession: 'race',
  podiumDepth: 3,
} as const satisfies Required<TallyOptions>;

/**
 * F1's tie-break ("countback"): between drivers level on points, the one with
 * more wins is ahead; still level, more second places; then thirds, and so on
 * down the field. Returns a comparator result (negative = `a` ranks higher).
 *
 * Only headline-session finishes count, matching how `wins` and `podiums` are
 * tallied.
 */
export function compareCountback(a: DriverTally, b: DriverTally): number {
  const depth = Math.max(
    a.headlinePositionCounts.length,
    b.headlinePositionCounts.length,
  );
  for (let index = 0; index < depth; index++) {
    const diff =
      (b.headlinePositionCounts[index] ?? 0) -
      (a.headlinePositionCounts[index] ?? 0);
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
  options: TallyOptions = {},
): Map<string, DriverTally> {
  return tallyBy(sessions, (driverId) => driverId, options);
}

/**
 * Accumulate the same championship points, pooled by whatever key `keyFor`
 * returns for a driver in a given session. Returning null drops that driver
 * from that session's tally.
 *
 * The constructors' championship goes through this with the driver's team *in
 * that round*, which is the whole reason it exists: pooling by the driver's
 * current team instead would hand a mid-season switcher's entire back
 * catalogue to their new employer the moment they moved.
 */
export function tallyBy(
  sessions: ChampionshipSessionResult[],
  keyFor: (
    driverId: string,
    session: ChampionshipSessionResult,
  ) => string | null,
  options: TallyOptions = {},
): Map<string, DriverTally> {
  const { headlineSession, podiumDepth } = {
    ...DEFAULT_TALLY_OPTIONS,
    ...options,
  };
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
    const table = POINTS_TABLES[session.sessionType];
    const retired = new Set(session.dnfDriverIds ?? []);
    // Classifying position is counted independently of the array index:
    // retirements score nothing *and* must not consume a scoring position, so
    // a DNF listed mid-classification cannot demote everyone below it.
    let position = 0;

    for (const driverId of session.classification) {
      const key = keyFor(driverId, session);
      // A driver with no key here still occupies a classifying position — they
      // finished ahead of the people behind them — so advance the counter
      // before skipping, exactly as a retirement does not.
      const driver = key === null ? null : ensure(key);
      if (retired.has(driverId)) {
        continue;
      }
      position += 1;
      if (!driver) {
        continue;
      }
      driver.points += pointsForPosition(position, table);
      // Wins and podiums come from the headline session only, matching how F1
      // reports them: a sprint win is tracked separately from a Grand Prix win,
      // and by the same logic a sprint-qualifying pole is not a pole.
      if (session.sessionType === headlineSession) {
        driver.headlinePositionCounts[position - 1] =
          (driver.headlinePositionCounts[position - 1] ?? 0) + 1;
        if (position === 1) {
          driver.wins += 1;
        }
        if (position <= podiumDepth) {
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
    stats.headlinePositionCounts.forEach((count, index) => {
      current.headlinePositionCounts[index] =
        (current.headlinePositionCounts[index] ?? 0) + count;
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

/**
 * The constructors' championship as it actually stands, from our own results.
 *
 * Pulled out of `getF1Championship` so ordering-sensitive views can share it
 * rather than hand-maintaining a team order that goes stale the moment a race
 * is scored. Returns points per team; callers decide how to break ties.
 *
 * Cost is one pass over the season's races, their race/sprint results and the
 * driver roster, so call it once per query and reuse the map.
 */
export async function loadConstructorPoints(
  ctx: ReadCtx,
  season: number,
): Promise<Map<string, number>> {
  const { constructors } = await loadChampionship(ctx, season);
  return new Map(constructors.map((c) => [c.team, c.points]));
}

/**
 * Every published session of a season, with the roster and lineup facts needed
 * to attribute them, read in one pass.
 *
 * Both championships are computed from the same rows — the real one keeps
 * race and sprint, the qualifying one keeps quali and sprint qualifying — and
 * the page that shows the gap between them needs both. Collecting all four
 * session types once means that page costs the same reads as either table
 * alone, rather than walking the season twice.
 */
export async function loadSeasonResults(ctx: ReadCtx, season: number) {
  const races = await ctx.db
    .query('races')
    .withIndex('by_season_round', (q) => q.eq('season', season))
    .take(40);

  const orderedRaces = races
    .filter((race) => race.status !== 'cancelled')
    .sort((a, b) => a.round - b.round);

  const sessions: (ChampionshipSessionResult & { publishedAt: number })[] = [];

  for (const race of orderedRaces) {
    const raceResults = await ctx.db
      .query('results')
      .withIndex('by_race_session', (q) => q.eq('raceId', race._id))
      .take(8);

    for (const result of raceResults) {
      if (!(result.sessionType in POINTS_TABLES)) {
        continue;
      }
      sessions.push({
        sessionType: result.sessionType as ChampionshipSessionType,
        round: race.round,
        classification: result.classification as string[],
        dnfDriverIds: result.dnfDriverIds as string[] | undefined,
        publishedAt: result.publishedAt,
      });
    }
  }

  // Load the roster once, rather than a per-driver db.get.
  const drivers = await ctx.db
    .query('drivers')
    .withIndex('by_displayName')
    .take(60);

  const stints = await loadStintsForSeason(ctx, season);

  return {
    sessions,
    drivers,
    stints,
    driversById: new Map(
      drivers.map((driver) => [driver._id as string, driver]),
    ),
  };
}

export type SeasonResults = Awaited<ReturnType<typeof loadSeasonResults>>;

/**
 * Rank a season's sessions into a drivers' and a constructors' table.
 *
 * Shared by both championships: the only things that differ are which session
 * types are counted, which one is the headline (races, or qualifying), and how
 * deep the headline's "podium" runs.
 */
export function rankChampionship(
  data: SeasonResults,
  {
    sessionTypes,
    headlineSession,
    podiumDepth,
  }: {
    sessionTypes: readonly ChampionshipSessionType[];
    headlineSession: ChampionshipSessionType;
    podiumDepth: number;
  },
) {
  const { drivers, driversById, stints } = data;
  const counted = new Set<string>(sessionTypes);
  const sessions = data.sessions.filter((session) =>
    counted.has(session.sessionType),
  );

  const lastUpdated = sessions.reduce(
    (latest, session) => Math.max(latest, session.publishedAt),
    0,
  );
  const roundsScored = new Set(
    sessions
      .filter((session) => session.sessionType === headlineSession)
      .map((session) => session.round),
  ).size;

  const options = { headlineSession, podiumDepth };
  const tally = tallyDriverPoints(sessions, options);

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

  // Constructors are pooled per session by the team the driver drove for in
  // that round, not by the team on their driver row today. Without this a
  // mid-season move (Lawson to Red Bull for round 12) would silently carry his
  // eleven rounds of Racing Bulls points across with him.
  //
  // Drivers with no stint recorded fall back to their current team, so this
  // matches the old behaviour for every season seeded before stints existed.
  const teamTally = tallyBy(
    sessions,
    (driverId, session) => {
      const stintTeam = teamForRound(stints, driverId, session.round);
      if (stintTeam) {
        return stintTeam;
      }
      return driversById.get(driverId)?.team ?? null;
    },
    options,
  );

  const constructorStandings = rankConstructorStandings(
    [...teamTally.entries()].map(([team, stats]) => ({ team, stats })),
  );

  return {
    lastUpdated: lastUpdated || null,
    roundsScored,
    drivers: driverStandings,
    constructors: constructorStandings,
  };
}

export type ChampionshipTable = ReturnType<typeof rankChampionship>;

/** The session types that award real World Championship points. */
export const CHAMPIONSHIP_SESSIONS = ['race', 'sprint'] as const;

/**
 * Exported so a caller that needs both tables gets them from one pass. The
 * creator poll orders its picker by constructor points and then by driver
 * points, and loading those separately would scan the season's results twice.
 */
export async function loadChampionship(ctx: ReadCtx, season: number) {
  const data = await loadSeasonResults(ctx, season);
  return {
    season,
    ...rankChampionship(data, {
      sessionTypes: CHAMPIONSHIP_SESSIONS,
      headlineSession: 'race',
      podiumDepth: 3,
    }),
  };
}

export const getF1Championship = query({
  args: { season: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await loadChampionship(ctx, args.season ?? 2026);
  },
});

/**
 * The current grid's teams in championship order, and nothing else.
 *
 * Every server-side H2H view already sorts its rows this way, which is what
 * made the clients' loading states wrong: with no database of their own they
 * fall back to last season's order (`teamStandingsIndex`), so the placeholder
 * rows were drawn in one order and replaced by another, and the reader saw the
 * teams reshuffle. This query is the missing piece — small enough to hold a
 * live subscription open next to the real data, so the order is already known
 * before anything asks for it.
 *
 * Teams, not duels: who drives for whom is round-scoped and belongs to the
 * matchup rows. Only the order is wanted here.
 */
export const getConstructorOrder = query({
  args: { season: v.optional(v.number()) },
  handler: async (ctx, args): Promise<string[]> => {
    const season = args.season ?? (await getCurrentSeason(ctx));
    const points = await loadConstructorPoints(ctx, season);
    const teams = new Set<string>([
      ...currentPairings().map((pairing) => pairing.team),
      ...points.keys(),
    ]);
    return sortByConstructorStanding(
      [...teams].map((team) => ({ team })),
      points,
    ).map((entry) => entry.team);
  },
});
