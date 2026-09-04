import { v } from 'convex/values';

import type { DatabaseReader } from './_generated/server';
import { query } from './_generated/server';
import {
  CHAMPIONSHIP_SESSIONS,
  type ChampionshipSessionType,
  type ChampionshipTable,
  loadSeasonResults,
  rankChampionship,
} from './f1Standings';
import { getCurrentSeason } from './lib/season';

type ReadCtx = { db: DatabaseReader };

/**
 * The Qualifying Championship: the season re-scored as if only Saturday
 * counted.
 *
 * Formula 1 awards nothing for qualifying, so no official table like this
 * exists — which is the point. Every driver's race result is a mixture of
 * their one-lap pace and everything that happens on Sunday (strategy, a safety
 * car, a first-lap tangle, reliability). Scoring the grid on its own separates
 * the two, and the gap between a driver's real championship position and their
 * qualifying one is the readable version of that: a driver who is eighth in
 * the championship and fourth on Saturdays is losing four places on Sundays.
 *
 * The whole table is derived from `results.classification`, the same published
 * classifications that score the prediction game, so it moves the moment a
 * qualifying result is published and can never disagree with the race pages.
 */

/** The session types this alternative championship counts. */
export const QUALIFYING_SESSIONS = [
  'quali',
  'sprint_quali',
] as const satisfies readonly ChampionshipSessionType[];

/**
 * A pole is a Saturday P1. Sprint qualifying is deliberately not the headline:
 * it does not set the Grand Prix grid, and the sport does not call its winner a
 * pole-sitter either.
 */
const HEADLINE_SESSION = 'quali';

/** Saturday's equivalent of a podium is the front row. */
const FRONT_ROW_DEPTH = 2;

export type StandingsDelta = {
  driverId: string;
  code: string;
  displayName: string;
  team: string | null;
  nationality: string | null;
  number: number | null;
  /** Position in this alternative table. */
  qualifyingPosition: number;
  /** Position in the real World Championship. */
  championshipPosition: number;
  /** Poles: P1s in qualifying proper, never sprint qualifying. */
  wins: number;
  /** Front rows: P1–P2 in qualifying proper. */
  podiums: number;
  /**
   * Places gained on Saturday: positive means they rank higher in qualifying
   * than in the championship. Reads the way a person says it out loud, which
   * is why it is not the raw subtraction the other way round.
   */
  delta: number;
  qualifyingPoints: number;
  championshipPoints: number;
};

export type TeamStandingsDelta = {
  team: string;
  qualifyingPosition: number;
  championshipPosition: number;
  delta: number;
  qualifyingPoints: number;
  championshipPoints: number;
};

/**
 * Pair the two tables up by driver.
 *
 * Both rank the same full roster, so every driver appears in both and no
 * position can be missing. Kept pure so the ordering rules below are unit
 * testable without a database.
 */
export function buildDriverDeltas(
  qualifying: ChampionshipTable,
  championship: ChampionshipTable,
): StandingsDelta[] {
  const realByDriver = new Map(
    championship.drivers.map((driver) => [driver.driverId as string, driver]),
  );

  return qualifying.drivers.flatMap((driver) => {
    const real = realByDriver.get(driver.driverId as string);
    if (!real) {
      return [];
    }
    return [
      {
        driverId: driver.driverId as string,
        code: driver.code,
        displayName: driver.displayName,
        team: driver.team,
        nationality: driver.nationality,
        number: driver.number,
        qualifyingPosition: driver.position,
        championshipPosition: real.position,
        wins: driver.wins,
        podiums: driver.podiums,
        delta: real.position - driver.position,
        qualifyingPoints: driver.points,
        championshipPoints: real.points,
      },
    ];
  });
}

export function buildTeamDeltas(
  qualifying: ChampionshipTable,
  championship: ChampionshipTable,
): TeamStandingsDelta[] {
  const realByTeam = new Map(
    championship.constructors.map((team) => [team.team, team]),
  );

  return qualifying.constructors.flatMap((team) => {
    const real = realByTeam.get(team.team);
    if (!real) {
      return [];
    }
    return [
      {
        team: team.team,
        qualifyingPosition: team.position,
        championshipPosition: real.position,
        delta: real.position - team.position,
        qualifyingPoints: team.points,
        championshipPoints: real.points,
      },
    ];
  });
}

/**
 * The drivers whose two positions disagree most, biggest gap first.
 *
 * This is the story the page leads with, so it is ordered by how far a driver
 * has moved rather than by where they finished: a midfield driver who is eight
 * places better on Saturday says more than the champion being level. Ties break
 * on the qualifying position so the better qualifier is named first, and
 * drivers whose positions match are dropped — a delta of zero is not a mover.
 */
export function rankMovers(
  deltas: readonly StandingsDelta[],
  limit: number,
): StandingsDelta[] {
  return deltas
    .filter((entry) => entry.delta !== 0)
    .sort(
      (a, b) =>
        Math.abs(b.delta) - Math.abs(a.delta) ||
        a.qualifyingPosition - b.qualifyingPosition,
    )
    .slice(0, limit);
}

/** How many movers the page leads with. Enough to fill a row on every width. */
const MOVERS_LIMIT = 6;

export async function loadQualifyingChampionship(ctx: ReadCtx, season: number) {
  const data = await loadSeasonResults(ctx, season);

  const qualifying = rankChampionship(data, {
    sessionTypes: QUALIFYING_SESSIONS,
    headlineSession: HEADLINE_SESSION,
    podiumDepth: FRONT_ROW_DEPTH,
  });
  const championship = rankChampionship(data, {
    sessionTypes: CHAMPIONSHIP_SESSIONS,
    headlineSession: 'race',
    podiumDepth: 3,
  });

  const driverDeltas = buildDriverDeltas(qualifying, championship);

  return {
    season,
    lastUpdated: qualifying.lastUpdated,
    /** Rounds with a published qualifying result. */
    roundsScored: qualifying.roundsScored,
    drivers: driverDeltas,
    constructors: buildTeamDeltas(qualifying, championship),
    movers: rankMovers(driverDeltas, MOVERS_LIMIT),
  };
}

export const getQualifyingChampionship = query({
  args: { season: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const season = args.season ?? (await getCurrentSeason(ctx));
    return await loadQualifyingChampionship(ctx, season);
  },
});
