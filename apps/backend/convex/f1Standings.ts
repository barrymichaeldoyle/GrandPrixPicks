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
  const resolved = { ...DEFAULT_TALLY_OPTIONS, ...options };
  const tally = new Map<string, DriverTally>();
  for (const session of sessions) {
    accumulateSession(tally, session, keyFor, resolved);
  }
  return tally;
}

/**
 * Fold one session into a running tally.
 *
 * Split out of `tallyBy` so a standings history can replay the season round by
 * round without re-walking the sessions it has already counted: the history
 * below snapshots this same map after each round.
 */
function accumulateSession(
  tally: Map<string, DriverTally>,
  session: ChampionshipSessionResult,
  keyFor: (
    driverId: string,
    session: ChampionshipSessionResult,
  ) => string | null,
  { headlineSession, podiumDepth }: Required<TallyOptions>,
): void {
  function ensure(id: string): DriverTally {
    const existing = tally.get(id);
    if (existing) {
      return existing;
    }
    const created = emptyDriverTally();
    tally.set(id, created);
    return created;
  }

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

/** One entrant's championship after a given round. */
export type RoundTally = {
  round: number;
  /** Points scored in this round alone, race and sprint together. */
  points: number;
  /**
   * How many of those came from the sprint, so a weekend can be read as the
   * two results it actually was. Zero on a weekend with no sprint.
   */
  sprintPoints: number;
  /** Points after this round. */
  cumulative: number;
  /** Championship position after this round. */
  position: number;
};

/**
 * Replay a season round by round, recording every entrant's running total and
 * position after each one.
 *
 * This is what the position-change column and the progression and bump charts
 * are drawn from, and it is deliberately the same accumulator the final table
 * uses: a history computed a second way would eventually disagree with the
 * table above it, and a table that contradicts its own chart is worse than no
 * chart.
 *
 * `entrants` is the full set of keys to rank, not just the ones who have
 * scored. A driver on zero still holds a position, and leaving them out until
 * their first points finish would make everyone below them appear to gain a
 * place the moment they score.
 *
 * `sortKey` breaks a tie the countback cannot, and has to match whatever the
 * final table uses (driver name, or team name) or a driver's last history row
 * would disagree with the position printed next to it.
 */
export function buildStandingsHistory(
  sessions: ChampionshipSessionResult[],
  keyFor: (
    driverId: string,
    session: ChampionshipSessionResult,
  ) => string | null,
  {
    entrants,
    sortKey,
    ...options
  }: TallyOptions & {
    entrants: readonly string[];
    sortKey: (key: string) => string;
  },
): Map<string, RoundTally[]> {
  const resolved = { ...DEFAULT_TALLY_OPTIONS, ...options };
  const rounds = [...new Set(sessions.map((session) => session.round))].sort(
    (a, b) => a - b,
  );

  const tally = new Map<string, DriverTally>();
  // The same accumulation over the supporting sessions alone (the sprint, for
  // the real championship), so each round can say where its points came from.
  const supporting = new Map<string, DriverTally>();
  const history = new Map<string, RoundTally[]>();
  for (const key of entrants) {
    tally.set(key, emptyDriverTally());
    supporting.set(key, emptyDriverTally());
    history.set(key, []);
  }

  let previous = new Map<string, number>();
  let previousSupporting = new Map<string, number>();

  for (const round of rounds) {
    for (const session of sessions) {
      if (session.round !== round) {
        continue;
      }
      accumulateSession(tally, session, keyFor, resolved);
      if (session.sessionType !== resolved.headlineSession) {
        accumulateSession(supporting, session, keyFor, resolved);
      }
    }

    const ranked = [...tally.entries()].sort(
      ([keyA, statsA], [keyB, statsB]) =>
        statsB.points - statsA.points ||
        compareCountback(statsA, statsB) ||
        sortKey(keyA).localeCompare(sortKey(keyB)),
    );

    ranked.forEach(([key, stats], index) => {
      history.get(key)?.push({
        round,
        points: stats.points - (previous.get(key) ?? 0),
        sprintPoints:
          (supporting.get(key)?.points ?? 0) -
          (previousSupporting.get(key) ?? 0),
        cumulative: stats.points,
        position: index + 1,
      });
    });

    previous = new Map(
      [...tally.entries()].map(([key, stats]) => [key, stats.points]),
    );
    previousSupporting = new Map(
      [...supporting.entries()].map(([key, stats]) => [key, stats.points]),
    );
  }

  return history;
}

/**
 * The finish that settled a tie on points, per entry, aligned to `ranked`.
 *
 * Entries level on points are separated by countback (most wins, then most
 * seconds, and so on), and the reader deserves to be told which one it was
 * rather than left to assume the table is arbitrary at that spot. `null` means
 * either that the entry is not tied, or that the tie survives the countback
 * entirely, which the table breaks alphabetically and no note can justify.
 */
export type CountbackNote = {
  /** Finishing position that decided it, 1-based: 1 is "on wins". */
  finishPosition: number;
  /** How many of those this entry has. */
  count: number;
};

export function countbackNotes(
  ranked: readonly { stats: DriverTally }[],
): (CountbackNote | null)[] {
  const notes: (CountbackNote | null)[] = ranked.map(() => null);

  let start = 0;
  while (start < ranked.length) {
    let end = start + 1;
    while (
      end < ranked.length &&
      ranked[end].stats.points === ranked[start].stats.points
    ) {
      end += 1;
    }
    const group = ranked.slice(start, end);
    if (group.length > 1) {
      const depth = Math.max(
        ...group.map((entry) => entry.stats.headlinePositionCounts.length),
      );
      for (let index = 0; index < depth; index++) {
        const counts = group.map(
          (entry) => entry.stats.headlinePositionCounts[index] ?? 0,
        );
        if (new Set(counts).size > 1) {
          counts.forEach((count, offset) => {
            notes[start + offset] = { finishPosition: index + 1, count };
          });
          break;
        }
      }
    }
    start = end;
  }

  return notes;
}

export type ConstructorDriverEntry = {
  team: string | null;
  stats: DriverTally;
};

export type ConstructorStanding = {
  team: string;
  points: number;
  wins: number;
  podiums: number;
  position: number;
  /**
   * The pooled tally this row was ranked on, kept so a caller can explain a
   * tie without re-deriving it. Stripped before the row reaches a client.
   */
  stats: DriverTally;
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
      podiums: stats.podiums,
      position: index + 1,
      stats,
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
 * When a session's classification last changed, for the standings' "Last
 * updated" line.
 *
 * Not `publishedAt`, which is deliberately frozen at the *first* publish and
 * never moved again (see `publishResultsCore`) — that is what "published"
 * means, and the race page relies on it. But points move on every subsequent
 * write too: a steward's penalty applied by hand, or the reconciler taking a
 * correction from the official classification hours or months later. Reading
 * `publishedAt` here dated the table to the original publish and left it
 * claiming to be weeks old within a minute of a correction landing, on a page
 * whose entire promise is being current — and told Google the same thing
 * through `dateModified`.
 *
 * `updatedAt` moves on any republish, including one that rewrites identical
 * points (a statuses-only backfill, an admin re-saving the same order). Dating
 * the table a few hours fresh in that case is the right way to be wrong: the
 * session really was rewritten, and the alternative needs a before-and-after
 * tally we do not keep. A recheck that finds nothing in sync touches only
 * `lastRecheckedAt`, so a quiet reconciliation pass never moves this.
 */
export function resultChangedAt(result: {
  publishedAt: number;
  updatedAt?: number;
}): number {
  return Math.max(result.publishedAt, result.updatedAt ?? 0);
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

  const sessions: (ChampionshipSessionResult & { changedAt: number })[] = [];

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
        changedAt: resultChangedAt(result),
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
    // The calendar itself, not just the rounds that have been scored: the
    // standings page dates itself by the last race's name and states how much
    // of the season is left, and both need the races nobody has driven yet.
    races: orderedRaces.map((race) => ({
      round: race.round,
      name: race.name,
      slug: race.slug,
      startAt: race.raceStartAt,
      hasSprint: race.hasSprint === true,
    })),
    driversById: new Map(
      drivers.map((driver) => [driver._id as string, driver]),
    ),
  };
}

export type SeasonRace = {
  round: number;
  name: string;
  slug: string;
  startAt: number;
  hasSprint: boolean;
};

/**
 * Championship points still on the table, and the rounds they are spread over.
 *
 * A session counts as gone once it has been scored, not once its date has
 * passed: a race that ran an hour ago but has not been published still has its
 * points to give as far as this page is concerned, which is the same rule the
 * rest of the table follows.
 */
export function remainingPoints(
  races: readonly SeasonRace[],
  scoredSessions: readonly {
    round: number;
    sessionType: ChampionshipSessionType;
  }[],
  sessionTypes: readonly ChampionshipSessionType[],
): number {
  const scored = new Set(
    scoredSessions.map((session) => `${session.round}:${session.sessionType}`),
  );
  const sprintOnly = new Set<ChampionshipSessionType>([
    'sprint',
    'sprint_quali',
  ]);

  let total = 0;
  for (const race of races) {
    for (const sessionType of sessionTypes) {
      if (sprintOnly.has(sessionType) && !race.hasSprint) {
        continue;
      }
      if (scored.has(`${race.round}:${sessionType}`)) {
        continue;
      }
      total += POINTS_TABLES[sessionType][0];
    }
  }
  return total;
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
    includeHistory = false,
  }: {
    sessionTypes: readonly ChampionshipSessionType[];
    headlineSession: ChampionshipSessionType;
    podiumDepth: number;
    /**
     * Whether to send each entrant's round-by-round history.
     *
     * The history is always computed — the position-change column is read off
     * it — but it is ~800 rows on a full season, and only the standings page
     * draws them. The race write-ups embed this table in their SSR payload
     * purely to say who leads, so they leave `pointsByRound` empty.
     */
    includeHistory?: boolean;
  },
) {
  const { drivers, driversById, stints } = data;
  const counted = new Set<string>(sessionTypes);
  const sessions = data.sessions.filter((session) =>
    counted.has(session.sessionType),
  );

  const lastUpdated = sessions.reduce(
    (latest, session) => Math.max(latest, session.changedAt),
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

  const driverIds = drivers.map((driver) => driver._id as string);
  const driverHistory = buildStandingsHistory(
    sessions,
    (driverId) => driverId,
    {
      ...options,
      entrants: driverIds,
      sortKey: (driverId) => driversById.get(driverId)?.displayName ?? driverId,
    },
  );

  const driverCountback = countbackNotes(rankedDrivers);

  const driverStandings = rankedDrivers.map(({ driver, stats }, index) => {
    const history = driverHistory.get(driver._id as string) ?? [];
    const previousPosition =
      history.length > 1 ? history[history.length - 2].position : null;
    return {
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
      previousPosition,
      /** Places gained since the previous round. Positive is a gain. */
      positionChange:
        previousPosition === null ? null : previousPosition - (index + 1),
      gapToLeader: rankedDrivers[0].stats.points - stats.points,
      gapToAhead:
        index === 0
          ? null
          : rankedDrivers[index - 1].stats.points - stats.points,
      tiedOnPoints:
        rankedDrivers[index - 1]?.stats.points === stats.points ||
        rankedDrivers[index + 1]?.stats.points === stats.points,
      countback: driverCountback[index],
      pointsByRound: includeHistory ? history : [],
      // Every seat this driver has held this season, in order. One entry is
      // the normal case and says nothing; two or more is a mid-season move,
      // and is the only honest explanation for why his points and his team's
      // do not add up.
      teamHistory: (stints.get(driver._id as string) ?? [])
        .slice()
        .sort((a, b) => a.fromRound - b.fromRound)
        .map((stint) => ({
          team: stint.team,
          fromRound: stint.fromRound,
          toRound: stint.toRound ?? null,
        })),
    };
  });

  // Constructors are pooled per session by the team the driver drove for in
  // that round, not by the team on their driver row today. Without this a
  // mid-season move (Lawson to Red Bull for round 12) would silently carry his
  // eleven rounds of Racing Bulls points across with him.
  //
  // Drivers with no stint recorded fall back to their current team, so this
  // matches the old behaviour for every season seeded before stints existed.
  function teamFor(
    driverId: string,
    session: ChampionshipSessionResult,
  ): string | null {
    const stintTeam = teamForRound(stints, driverId, session.round);
    if (stintTeam) {
      return stintTeam;
    }
    return driversById.get(driverId)?.team ?? null;
  }

  const teamTally = tallyBy(sessions, teamFor, options);

  const rankedConstructors = rankConstructorStandings(
    [...teamTally.entries()].map(([team, stats]) => ({ team, stats })),
  );

  const constructorHistory = buildStandingsHistory(sessions, teamFor, {
    ...options,
    entrants: rankedConstructors.map((entry) => entry.team),
    sortKey: (team) => team,
  });

  const constructorCountback = countbackNotes(rankedConstructors);

  const constructorStandings = rankedConstructors.map((entry, index) => {
    const history = constructorHistory.get(entry.team) ?? [];
    const previousPosition =
      history.length > 1 ? history[history.length - 2].position : null;
    return {
      team: entry.team,
      points: entry.points,
      wins: entry.wins,
      podiums: entry.podiums,
      position: entry.position,
      previousPosition,
      positionChange:
        previousPosition === null ? null : previousPosition - entry.position,
      gapToLeader: rankedConstructors[0].points - entry.points,
      gapToAhead:
        index === 0
          ? null
          : rankedConstructors[index - 1].points - entry.points,
      tiedOnPoints:
        rankedConstructors[index - 1]?.points === entry.points ||
        rankedConstructors[index + 1]?.points === entry.points,
      countback: constructorCountback[index],
      pointsByRound: includeHistory ? history : [],
    };
  });

  // The season's shape around the table: which round it is current to, what
  // ran that weekend, and how much is still to play for.
  const scoredRounds = [
    ...new Set(
      sessions
        .filter((session) => session.sessionType === headlineSession)
        .map((session) => session.round),
    ),
  ].sort((a, b) => a - b);
  const lastScoredRound = scoredRounds[scoredRounds.length - 1] ?? null;
  const races = data.races ?? [];
  const raceByRound = new Map(races.map((race) => [race.round, race]));
  const lastRound =
    lastScoredRound === null
      ? null
      : (raceByRound.get(lastScoredRound) ?? null);
  const nextRound =
    races.find(
      (race) => lastScoredRound === null || race.round > lastScoredRound,
    ) ?? null;

  return {
    lastUpdated: lastUpdated || null,
    roundsScored,
    roundsTotal: races.length,
    /**
     * The season's calendar, so a caller can label a round with the Grand Prix
     * that ran there and mark the sprint weekends. Cheap next to the tables
     * and it saves the standings page a second query purely to name its axes.
     */
    calendar: races,
    /** The round the table is current to, and the Grand Prix that ran there. */
    lastRound,
    nextRound,
    pointsRemaining: remainingPoints(races, sessions, sessionTypes),
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
export async function loadChampionship(
  ctx: ReadCtx,
  season: number,
  includeHistory = false,
) {
  const data = await loadSeasonResults(ctx, season);
  return {
    season,
    ...rankChampionship(data, {
      sessionTypes: CHAMPIONSHIP_SESSIONS,
      headlineSession: 'race',
      podiumDepth: 3,
      includeHistory,
    }),
  };
}

export const getF1Championship = query({
  args: {
    season: v.optional(v.number()),
    /** Ask for the round-by-round history the standings charts draw. */
    includeHistory: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    return await loadChampionship(
      ctx,
      args.season ?? 2026,
      args.includeHistory ?? false,
    );
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
