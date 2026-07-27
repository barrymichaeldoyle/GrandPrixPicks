import type { SessionType } from '@grandprixpicks/shared/sessions';

import type { Doc, Id } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';
import { query } from './_generated/server';
import {
  getDefaultLeaderboardSeason,
  loadCombinedSeasonRows,
} from './leaderboards';
import { getViewer } from './lib/auth';

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

const AMENDMENT_WINDOW = 7 * 24 * 60 * 60 * 1000;

export type RecentAmendment = {
  raceName: string;
  raceSlug: string;
  sessionType: SessionType;
  amendmentNote: string;
  amendedAt: number;
};

/**
 * The latest stewards' amendment across the most recent race weekends, used to
 * point players at the results policy when their score has moved under them.
 */
async function findRecentAmendment(
  ctx: QueryCtx,
  races: Array<Doc<'races'>>,
  now: number,
): Promise<RecentAmendment | null> {
  let latest: RecentAmendment | null = null;

  for (const race of races) {
    const results = await ctx.db
      .query('results')
      .withIndex('by_race_session', (q) => q.eq('raceId', race._id))
      .take(8);

    for (const result of results) {
      if (
        result.amendedAt === undefined ||
        result.amendmentNote === undefined ||
        now - result.amendedAt > AMENDMENT_WINDOW
      ) {
        continue;
      }
      if (latest === null || result.amendedAt > latest.amendedAt) {
        latest = {
          raceName: race.name,
          raceSlug: race.slug,
          sessionType: result.sessionType,
          amendmentNote: result.amendmentNote,
          amendedAt: result.amendedAt,
        };
      }
    }
  }

  return latest;
}

/** Distinct users with any Top 5 or H2H score for a race. */
async function countRacePlayers(
  ctx: QueryCtx,
  raceId: Id<'races'>,
): Promise<number> {
  const playerIds = new Set<string>();
  for await (const score of ctx.db
    .query('scores')
    .withIndex('by_race_session', (q) => q.eq('raceId', raceId))) {
    playerIds.add(score.userId);
  }
  for await (const score of ctx.db
    .query('h2hScores')
    .withIndex('by_race_session', (q) => q.eq('raceId', raceId))) {
    playerIds.add(score.userId);
  }
  return playerIds.size;
}

/**
 * Everything the home page loader needs in a single round trip. The web SSR
 * loader previously issued two sequential waves of up to nine queries from the
 * Cloudflare worker to Convex, which dominated the page's time to first byte.
 */
export const getHomePageData = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const [viewer, nextRace, races] = await Promise.all([
      getViewer(ctx),
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
    ]);

    const startedRaces = races
      .filter((race) => race.raceStartAt <= now && race.status !== 'cancelled')
      .sort((a, b) => b.raceStartAt - a.raceStartAt);
    const mostRecentStartedRace: Doc<'races'> | null = startedRaces[0] ?? null;

    // Social proof reflects the most recent race that actually has scored
    // players — not just the most recent started race, which may not be scored
    // yet (mid-weekend) or may be a dev-only scenario race with no entries.
    let recentRacePlayerCount = 0;
    for (const race of startedRaces.slice(0, 6)) {
      recentRacePlayerCount = await countRacePlayers(ctx, race._id);
      if (recentRacePlayerCount > 0) {
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
    const topPlayers = allRows.slice(0, 10).map((row) => ({
      rank: row.rank,
      userId: row.userId,
      username: row.username ?? 'Anonymous',
      displayName: row.displayName,
      avatarUrl: row.avatarUrl,
      points: row.top5Points + row.h2hPoints,
      top5Points: row.top5Points,
      h2hPoints: row.h2hPoints,
      raceCount: row.raceCount,
      isViewer: viewer ? row.userId === viewer._id : false,
    }));

    const recentAmendment = await findRecentAmendment(
      ctx,
      startedRaces.slice(0, 3),
      now,
    );

    return {
      nextRace,
      races,
      mostRecentStartedRace,
      nextRaceResults,
      recentRaceResults,
      recentRacePlayerCount,
      topPlayers,
      recentAmendment,
    };
  },
});
