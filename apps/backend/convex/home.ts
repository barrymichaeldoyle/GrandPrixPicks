import type { SessionType } from '@grandprixpicks/shared/sessions';
import { v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';
import { query } from './_generated/server';
import {
  getDefaultLeaderboardSeason,
  loadCombinedSeasonRows,
} from './leaderboards';
import { ANONYMOUS_NAME } from '@grandprixpicks/shared/displayName';

const SESSION_ORDER: Array<SessionType> = [
  'quali',
  'sprint_quali',
  'sprint',
  'race',
];

/** Session types with a published result for a race, in weekend order. */
async function getPublishedSessionTypes(
  ctx: QueryCtx,
  raceId: Id<'races'>,
): Promise<Array<SessionType>> {
  const results = await ctx.db
    .query('results')
    .withIndex('by_race_session', (q) => q.eq('raceId', raceId))
    .take(8);

  const sessionTypes: Array<SessionType> = [];
  for (const result of results) {
    if (!sessionTypes.includes(result.sessionType)) {
      sessionTypes.push(result.sessionType);
    }
  }
  return sessionTypes.sort(
    (a, b) => SESSION_ORDER.indexOf(a) - SESSION_ORDER.indexOf(b),
  );
}

/**
 * Combined Top 5 + H2H points each user scored at a single race.
 *
 * The map's size doubles as the distinct-player count, so the social-proof
 * number and the leaderboard's rank movement come out of one pass over the
 * race's scores rather than two.
 */
async function loadRacePointsByUser(
  ctx: QueryCtx,
  raceId: Id<'races'>,
): Promise<Map<string, number>> {
  const pointsByUser = new Map<string, number>();
  for await (const score of ctx.db
    .query('scores')
    .withIndex('by_race_session', (q) => q.eq('raceId', raceId))) {
    pointsByUser.set(
      score.userId,
      (pointsByUser.get(score.userId) ?? 0) + score.points,
    );
  }
  for await (const score of ctx.db
    .query('h2hScores')
    .withIndex('by_race_session', (q) => q.eq('raceId', raceId))) {
    pointsByUser.set(
      score.userId,
      (pointsByUser.get(score.userId) ?? 0) + score.points,
    );
  }
  return pointsByUser;
}

/**
 * Where each player stood before the most recent scored race, so the landing
 * page's timing tower can show a real position delta.
 *
 * There is no stored rank history, so the previous standing is reconstructed by
 * subtracting that race's points from every season total and re-ranking. Ties
 * break on userId exactly as `loadCombinedSeasonRows` does, otherwise two
 * players level on points would swap places and each report a phantom ±1.
 *
 * Players whose previous total was zero are omitted: they entered the table at
 * this race, and "climbed 400 places" is a lie dressed as a stat.
 */
export function rankBeforeLastScoredRace(
  rows: ReadonlyArray<{
    userId: Id<'users'>;
    top5Points: number;
    h2hPoints: number;
  }>,
  lastRacePoints: ReadonlyMap<string, number>,
): Map<Id<'users'>, number> {
  const previousTotals = rows.map((row) => ({
    userId: row.userId,
    points:
      row.top5Points + row.h2hPoints - (lastRacePoints.get(row.userId) ?? 0),
  }));

  previousTotals.sort((a, b) =>
    a.points !== b.points
      ? b.points - a.points
      : String(a.userId).localeCompare(String(b.userId)),
  );

  const ranks = new Map<Id<'users'>, number>();
  let lastPoints: number | null = null;
  let lastRank = 0;

  for (let i = 0; i < previousTotals.length; i++) {
    const entry = previousTotals[i];
    const rank =
      lastPoints !== null && entry.points === lastPoints ? lastRank : i + 1;
    lastPoints = entry.points;
    lastRank = rank;
    if (entry.points > 0) {
      ranks.set(entry.userId, rank);
    }
  }

  return ranks;
}

/**
 * Everything the home page loader needs in a single round trip. The web SSR
 * loader previously issued two sequential waves of up to nine queries from the
 * Cloudflare worker to Convex, which dominated the page's time to first byte.
 */
export const getHomePageData = query({
  args: { now: v.number() },
  handler: async (ctx, { now }) => {
    const [nextRace, races, drivers] = await Promise.all([
      ctx.db
        .query('races')
        .withIndex('by_status_and_predictionLockAt', (q) =>
          q.eq('status', 'upcoming').gt('predictionLockAt', now),
        )
        .first(),
      ctx.db
        .query('races')
        .withIndex('by_season_round')
        .take(100)
        .then((all) =>
          all.sort((a, b) =>
            a.season !== b.season ? a.season - b.season : a.round - b.round,
          ),
        ),
      // Drivers are stable, bounded landing-page data. Returning them with the
      // SSR payload means the try-before-signup picker is actionable on first
      // paint and never depends on a second websocket round trip to escape its
      // loading skeleton.
      ctx.db.query('drivers').withIndex('by_displayName').take(30),
    ]);

    const startedRaces = races
      .filter((race) => race.raceStartAt <= now && race.status !== 'cancelled')
      .sort((a, b) => b.raceStartAt - a.raceStartAt);
    const mostRecentStartedRace: Doc<'races'> | null = startedRaces[0] ?? null;

    // Rank movement is measured against the most recent race that actually has
    // scored players — not just the most recent started race, which may not be
    // scored yet (mid-weekend) or may be a dev-only scenario race with no
    // entries. Searching back six rounds covers a summer break.
    let lastScoredRacePoints = new Map<string, number>();
    for (const race of startedRaces.slice(0, 6)) {
      const racePoints = await loadRacePointsByUser(ctx, race._id);
      if (racePoints.size > 0) {
        lastScoredRacePoints = racePoints;
        break;
      }
    }

    const [nextRaceResults, recentRaceResults] = await Promise.all([
      nextRace
        ? getPublishedSessionTypes(ctx, nextRace._id)
        : ([] as Array<SessionType>),
      mostRecentStartedRace
        ? getPublishedSessionTypes(ctx, mostRecentStartedRace._id)
        : ([] as Array<SessionType>),
    ]);

    const season = await getDefaultLeaderboardSeason(ctx);
    const allRows = await loadCombinedSeasonRows(ctx, { season });
    const previousRanks = rankBeforeLastScoredRace(
      allRows,
      lastScoredRacePoints,
    );
    const topPlayers = allRows.slice(0, 10).map((row) => {
      const previousRank = previousRanks.get(row.userId);
      return {
        rank: row.rank,
        userId: row.userId,
        username: row.username ?? ANONYMOUS_NAME,
        displayName: row.displayName,
        avatarUrl: row.avatarUrl,
        points: row.top5Points + row.h2hPoints,
        top5Points: row.top5Points,
        h2hPoints: row.h2hPoints,
        raceCount: row.raceCount,
        // Positive is a climb. Null means there is nothing to compare against:
        // the player had no points before this race, so they are new to the
        // table rather than having moved up the whole length of it.
        rankDelta: previousRank === undefined ? null : previousRank - row.rank,
      };
    });

    return {
      nextRace,
      mostRecentStartedRace,
      nextRaceResults,
      recentRaceResults,
      topPlayers,
      drivers,
    };
  },
});
