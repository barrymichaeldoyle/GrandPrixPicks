import { v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
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
};

export type DriverTally = {
  points: number;
  /** Wins in a main race (P1). */
  wins: number;
  /** Podium finishes in a main race (P1–P3). */
  podiums: number;
};

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
    const created: DriverTally = { points: 0, wins: 0, podiums: 0 };
    tally.set(id, created);
    return created;
  }

  for (const session of sessions) {
    const table = session.sessionType === 'race' ? RACE_POINTS : SPRINT_POINTS;
    session.classification.forEach((driverId, index) => {
      const position = index + 1;
      const driver = ensure(driverId);
      driver.points += pointsForPosition(position, table);
      // Wins and podiums are counted from main races only, matching how F1
      // reports them (sprint wins are tracked separately in the real world).
      if (session.sessionType === 'race') {
        if (position === 1) {
          driver.wins += 1;
        }
        if (position <= 3) {
          driver.podiums += 1;
        }
      }
    });
  }

  return tally;
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

    // Load the roster once and index it, rather than a per-driver db.get.
    const drivers = await ctx.db
      .query('drivers')
      .withIndex('by_displayName')
      .take(60);
    const driverById = new Map<string, Doc<'drivers'>>(
      drivers.map((driver) => [driver._id as string, driver]),
    );

    const tally = tallyDriverPoints(sessions);

    const driverStandings = [...tally.entries()]
      .map(([driverId, stats]) => {
        const driver = driverById.get(driverId);
        return {
          driverId: driverId as Id<'drivers'>,
          code: driver?.code ?? '???',
          displayName: driver?.displayName ?? 'Unknown driver',
          team: driver?.team ?? null,
          nationality: driver?.nationality ?? null,
          number: driver?.number ?? null,
          points: stats.points,
          wins: stats.wins,
          podiums: stats.podiums,
        };
      })
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.wins - a.wins ||
          b.podiums - a.podiums ||
          a.displayName.localeCompare(b.displayName),
      )
      .map((entry, index) => ({ ...entry, position: index + 1 }));

    const teamTally = new Map<string, { points: number; wins: number }>();
    for (const entry of driverStandings) {
      if (!entry.team) {
        continue;
      }
      const current = teamTally.get(entry.team) ?? { points: 0, wins: 0 };
      current.points += entry.points;
      current.wins += entry.wins;
      teamTally.set(entry.team, current);
    }

    const constructorStandings = [...teamTally.entries()]
      .map(([team, stats]) => ({
        team,
        points: stats.points,
        wins: stats.wins,
      }))
      .sort((a, b) => b.points - a.points || a.team.localeCompare(b.team))
      .map((entry, index) => ({ ...entry, position: index + 1 }));

    return {
      season,
      lastUpdated: lastUpdated || null,
      roundsScored,
      drivers: driverStandings,
      constructors: constructorStandings,
    };
  },
});
