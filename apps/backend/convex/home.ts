import type { SessionType } from '@grandprixpicks/shared/sessions';
import {
  hasPendingEntryList,
  lineupRoundForCalendarRound,
  markPendingEntryDrivers,
} from '@grandprixpicks/shared/pendingEntry';
import { v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';
import { query } from './_generated/server';
import { getPersonalizedFeedPageData } from './feed';
import { loadMatchupsForSeason, loadMyH2HPredictionsForRace } from './h2h';
import { getViewer } from './lib/auth';
import { loadMyLeagues } from './leagues';
import {
  loadMyWeekendPredictions,
  loadUserPredictionHistory,
} from './predictions';
import { loadCurrentWeekend } from './races';
import { loadMe } from './users';
import { loadStintsForSeason, rosterForRound } from './lib/lineups';
import {
  getDefaultLeaderboardSeason,
  loadCombinedSeasonLeaderboard,
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
    const [nextRace, races, allDrivers] = await Promise.all([
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

    // The landing picker must offer the grid that is actually racing next, so
    // the roster is resolved for the upcoming round: an injured driver is not
    // pickable and his stand-in is, each under the team they will drive for.
    // When the entry list is still pending (Monza 2026), show the last agreed
    // grid rather than the Zandvoort substitute lineup as confirmed.
    const pickRound = nextRace
      ? lineupRoundForCalendarRound(nextRace.season, nextRace.round)
      : null;
    const drivers = nextRace
      ? markPendingEntryDrivers(
          nextRace.slug,
          rosterForRound(
            allDrivers,
            await loadStintsForSeason(ctx, nextRace.season),
            pickRound!,
          ),
        )
      : allDrivers;

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

    // Same reasoning as drivers: a returning visitor resumes the picker on the
    // team-mate step, and without this the card's first paint is eleven
    // skeleton boxes waiting on a websocket round trip for data the SSR render
    // already had in hand.
    const h2hMatchups = nextRace
      ? await loadMatchupsForSeason(ctx, nextRace.season, pickRound!)
      : [];

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
      h2hMatchups,
      entryListPending: nextRace ? hasPendingEntryList(nextRace.slug) : false,
    };
  },
});

/**
 * How many feed events the server render carries.
 *
 * The feed's own first page is 40 events, and all 40 would roughly double the
 * HTML of every signed-in document to fill a section that starts below the
 * fold. Five is what the reader can actually see before scrolling, which is all
 * the server render has to cover: the live query answers moments later with the
 * full page, and the rest arrive under what is already on screen.
 */
const SSR_FEED_EVENTS = 5;

/**
 * The top of the activity feed, small enough to travel.
 *
 * `FeedContent` renders four skeletons while its first page is undefined, and
 * that was the last thing on the dashboard still arriving blank. Seeding it
 * removes them without seeding the whole page.
 *
 * `hasMore` is false and `nextCursor` null on purpose. They would be a lie
 * about a truncated slice, and "Load more" paging from a cursor that belongs to
 * a page the client never had is worse than the control appearing a moment
 * later, once the real first page replaces this.
 */
async function loadFeedPreview(ctx: QueryCtx, viewer: Doc<'users'>) {
  const page = await getPersonalizedFeedPageData(ctx, viewer, null);
  const events = page.events.slice(0, SSR_FEED_EVENTS);

  // Session headers are keyed `${raceId}_${sessionType}`, so the ones the kept
  // events refer to can be picked out of the page's own map rather than built
  // again with a second pass over the database.
  const keptKeys = new Set(
    events
      .filter((event) => event.raceId && event.sessionType)
      .map((event) => `${event.raceId}_${event.sessionType}`),
  );
  const sessions = Object.fromEntries(
    Object.entries(page.sessions).filter(([key]) => keptKeys.has(key)),
  );

  return { events, sessions, hasMore: false, nextCursor: null };
}

/**
 * The rail cards beside the weekend card: season standing, leagues, last
 * result.
 *
 * Bounded on purpose, because every field here is serialised into the HTML of
 * each signed-in document. The season leaderboard is capped at the three rows
 * the card shows, and leagues are however many a player has joined.
 *
 * `latestScoredWeekend` is the odd one out: it does not server-render its card,
 * and is not meant to. `LatestResultCard` waits for
 * `getCombinedRaceLeaderboard` before showing anything, because the rank it
 * reads from the weekend is the Top 5 rank while the leaderboard's is the
 * combined one — rendering early would print a position that then visibly
 * changes. That gate stays.
 *
 * What this removes is a serial hop. The leaderboard query is keyed on the
 * weekend, so the client used to walk the player's whole season, find the last
 * scored weekend, and only then start asking for its leaderboard: two round
 * trips, one after the other. Seeding the weekend lets that request go out on
 * the first render instead.
 *
 * Only the weekend travels, never the history it came from. The walk happens
 * here, and the leaderboard stays a client fetch on purpose — it returns
 * *every* entry for a race with no limit, which is a few kilobytes at 35
 * players and a tax that grows with the game.
 */
async function loadDashboardRails(ctx: QueryCtx, viewer: Doc<'users'>) {
  const userId = viewer._id;
  const [seasonLeaderboard, leagues, history, feedPreview] = await Promise.all([
    // The same limit `DashboardPage` passes. A different one here would seed a
    // cache entry under a key nothing reads.
    loadCombinedSeasonLeaderboard(ctx, { limit: 3 }),
    loadMyLeagues(ctx),
    loadUserPredictionHistory(ctx, { userId }),
    loadFeedPreview(ctx, viewer),
  ]);

  return {
    seasonLeaderboard,
    leagues,
    latestScoredWeekend: history.find((weekend) => weekend.hasScores) ?? null,
    feedPreview,
  };
}

/**
 * Everything the signed-in dashboard needs above the fold, in one query.
 *
 * This exists for SSR. The dashboard's own components each read their own
 * query (`races.getCurrentWeekend`, `users.me`, and the two pick queries), and
 * on the client that is right — four independent subscriptions, each updating
 * on its own. On the server it was the reason the page could not be rendered:
 * the picks query needs a raceId that only the weekend query can supply, so
 * fetching them over HTTP would have cost two serial round trips, and SSR time
 * on this route is almost entirely one round trip to Convex. Two would have
 * bought a rendered dashboard by making every signed-in page slower to start.
 *
 * Inside a single query that dependency is free: it is one transaction on one
 * consistent snapshot, so the raceId is just a local variable. One round trip,
 * everything filled in.
 *
 * Every field is the *same value* the individual query returns, because each
 * comes from that query's own extracted body rather than a re-derivation. The
 * web app seeds its query cache from this payload under the individual queries'
 * cache keys, so a drift here would seed a shape the live subscription then
 * contradicts on its first update.
 *
 * Returns null for a signed-out caller, which is also what an expired token
 * produces — the caller treats both as "nothing to seed" and falls back to
 * client fetching.
 */
export const getDashboardPageData = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return null;
    }

    const [me, weekend, rails] = await Promise.all([
      loadMe(ctx),
      loadCurrentWeekend(ctx),
      loadDashboardRails(ctx, viewer),
    ]);

    // Between-seasons, or any moment with no open weekend: there is no raceId
    // to ask the pick queries about, and no card for them to fill in.
    if (!weekend) {
      return { me, weekend: null, predictions: null, h2h: null, ...rails };
    }

    const [predictions, h2h] = await Promise.all([
      loadMyWeekendPredictions(ctx, { raceId: weekend.race._id }),
      loadMyH2HPredictionsForRace(ctx, { raceId: weekend.race._id }),
    ]);

    return { me, weekend, predictions, h2h, ...rails };
  },
});
