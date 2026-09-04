import type { SessionType } from '@grandprixpicks/shared/sessions';
import {
  markPendingEntryDrivers,
  pendingEntryNoteForSlug,
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
import { loadActiveSnapshot } from './liveScoring';
import { loadPracticeResultsForRace } from './practiceResults';
import { loadCurrentWeekend } from './races';
import { toUserIdentity } from './lib/userIdentity';
import { loadMe } from './users';
import { loadStintsForSeason, rosterForRound } from './lib/lineups';
import {
  getDefaultLeaderboardSeason,
  getFollowedUserIds,
  loadCombinedSeasonLeaderboard,
  loadCombinedSeasonRows,
} from './leaderboards';
import { assignCompetitionRanks } from './lib/leaderboard';
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
    // A race still waiting on its entry list is offered as the lineup that
    // last raced, with the seats that could still change flagged: see
    // `pendingEntry.ts` for why this is a mark and not an earlier round.
    const drivers = nextRace
      ? markPendingEntryDrivers(
          nextRace.slug,
          rosterForRound(
            allDrivers,
            await loadStintsForSeason(ctx, nextRace.season),
            nextRace.round,
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
    // Captured alongside the points because the landing board is that race's
    // board and has to name it. Same loop, same reads.
    let lastScoredRace: Doc<'races'> | null = null;
    for (const race of startedRaces.slice(0, 6)) {
      const racePoints = await loadRacePointsByUser(ctx, race._id);
      if (racePoints.size > 0) {
        lastScoredRacePoints = racePoints;
        lastScoredRace = race;
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
      ? await loadMatchupsForSeason(ctx, nextRace.season, nextRace.round)
      : [];

    const season = await getDefaultLeaderboardSeason(ctx);
    const allRows = await loadCombinedSeasonRows(ctx, { season });

    /*
     * The landing page's board is ONE race weekend, not the season.
     *
     * A visitor arriving at round 13 met a table whose leader had 678 points
     * over 12 races, which states the size of the gap rather than the terms of
     * entry: the season is a thing they have already lost. A weekend board is
     * the same competition scoped to something they can still enter, the
     * numbers are small enough to read as a score, and the order genuinely
     * differs from the season order — players outside the season top five turn
     * up in the weekend top five, which is the claim the page is making.
     *
     * It is the most recently SCORED race, not the upcoming one. The current
     * weekend has no scores until qualifying is published, so an upcoming-race
     * board would be empty from Monday to Friday, which is worse than the
     * season table it replaced. `lastScoredRace` is already resolved above.
     *
     * Identities come from the season rows that are loaded anyway: anyone with
     * race points has a `seasonStandings` row, because that table is
     * denormalised from the same scores. `ctx.db.get` covers the case where
     * one is missing rather than letting a player render as Anonymous.
     */
    const identityByUserId = new Map(
      allRows.map((row) => [
        row.userId as string,
        { username: row.username, avatarUrl: row.avatarUrl },
      ]),
    );
    const rankedWeekend = assignCompetitionRanks(
      [...lastScoredRacePoints.entries()]
        .map(([userId, points]) => ({ userId, points }))
        .sort((a, b) =>
          a.points !== b.points
            ? b.points - a.points
            : a.userId.localeCompare(b.userId),
        ),
      (row) => row.points,
    );
    const weekendPlayers = await Promise.all(
      rankedWeekend.slice(0, 5).map(async (row) => {
        const identity =
          identityByUserId.get(row.userId) ??
          toUserIdentity(await ctx.db.get(row.userId as Id<'users'>));
        return {
          rank: row.rank,
          userId: row.userId,
          username: identity.username ?? ANONYMOUS_NAME,
          avatarUrl: identity.avatarUrl,
          points: row.points,
        };
      }),
    );
    const weekendBoard =
      lastScoredRace && weekendPlayers.length > 0
        ? {
            raceName: lastScoredRace.name,
            raceSlug: lastScoredRace.slug,
            round: lastScoredRace.round,
            playerCount: lastScoredRacePoints.size,
            players: weekendPlayers,
          }
        : null;

    return {
      nextRace,
      mostRecentStartedRace,
      nextRaceResults,
      recentRaceResults,
      weekendBoard,
      drivers,
      h2hMatchups,
      entryListNote: nextRace ? pendingEntryNoteForSlug(nextRace.slug) : null,
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
 * How long a finished Grand Prix stays the dashboard's lead card.
 *
 * Measured from the race start, not from the moment results are published: the
 * point is to give the weekend a player just played the top of their page for
 * the rest of that day, and the publish time is an operational detail they
 * never see. A race that is scored later than this still reaches them through
 * the `LatestResultCard` rail, which has no window.
 */
export const RESULTS_FIRST_WINDOW_MS = 8 * 60 * 60 * 1000;

/**
 * How far back the recap looks for the race it describes.
 *
 * Wider than the window above on purpose. Convex queries re-run when their data
 * changes, never because time passed, so a query that filtered on the window
 * itself would keep answering `null` after the window opened and keep answering
 * with a race after it closed. The backend returns the race and the instant the
 * window ends; the client, which does have a clock, decides whether to promote
 * it. See `RaceRecapCard`.
 */
const RECAP_LOOKBACK_MS = 24 * 60 * 60 * 1000;

/** Rows in the recap's followed-players table, viewer included. */
const RECAP_FRIEND_ROWS = 5;

type RaceScoreRow = {
  userId: Id<'users'>;
  top5Points: number;
  h2hPoints: number;
};

/**
 * Top 5 and H2H points each player scored at one race, kept apart.
 *
 * `loadRacePointsByUser` above sums them, which is all the landing page's rank
 * movement needs. The recap prints the two numbers separately, and it needs the
 * whole field to rank the viewer inside it, so it makes its own pass.
 *
 * No identities here. `h2hScores` carries none, so filling them in means a
 * lookup per player, and the recap names at most six of them.
 */
async function loadRaceScoreRows(
  ctx: QueryCtx,
  raceId: Id<'races'>,
): Promise<Map<string, RaceScoreRow>> {
  const rows = new Map<string, RaceScoreRow>();

  function add(
    userId: Id<'users'>,
    field: 'top5Points' | 'h2hPoints',
    points: number,
  ) {
    let row = rows.get(userId);
    if (!row) {
      row = { userId, top5Points: 0, h2hPoints: 0 };
      rows.set(userId, row);
    }
    row[field] += points;
  }

  for await (const score of ctx.db
    .query('scores')
    .withIndex('by_race_session', (q) => q.eq('raceId', raceId))) {
    add(score.userId, 'top5Points', score.points);
  }
  for await (const score of ctx.db
    .query('h2hScores')
    .withIndex('by_race_session', (q) => q.eq('raceId', raceId))) {
    add(score.userId, 'h2hPoints', score.points);
  }

  return rows;
}

/** One player's place in a race field, however that field was measured. */
type RecapStandingRow = {
  userId: Id<'users'>;
  rank: number;
  points: number;
  top5Points: number;
  h2hPoints: number;
};

/**
 * The viewer's own row, and the followed players beside them.
 *
 * Shared by the live and the scored paths, which differ only in where the
 * ranked field comes from. Everything social about the card is decided here so
 * the two cannot drift into showing different people.
 */
async function buildRecapAudience(
  ctx: QueryCtx,
  viewer: Doc<'users'> | null,
  ranked: ReadonlyArray<RecapStandingRow>,
) {
  if (!viewer) {
    return { viewer: null, friends: [], friendCount: 0 };
  }

  const viewerRow = ranked.find((row) => row.userId === viewer._id) ?? null;

  const followedIds = await getFollowedUserIds(ctx, viewer._id);
  // `getFollowedUserIds` includes the follower, so the viewer is already in
  // this list and is not added twice.
  const friendRows = ranked.filter((row) => followedIds.has(row.userId));

  // The viewer's own row always makes the table, even when the people they
  // follow all beat them. A comparison card that can leave you out of it is the
  // one shape this must not have.
  const shown = friendRows.slice(0, RECAP_FRIEND_ROWS);
  if (viewerRow && !shown.some((row) => row.userId === viewer._id)) {
    shown.splice(RECAP_FRIEND_ROWS - 1, 1, viewerRow);
  }

  const identities = await Promise.all(
    shown.map((row) => ctx.db.get(row.userId)),
  );

  return {
    viewer: viewerRow
      ? {
          points: viewerRow.points,
          top5Points: viewerRow.top5Points,
          h2hPoints: viewerRow.h2hPoints,
          rank: viewerRow.rank,
          fieldSize: ranked.length,
          seasonRank: null as number | null,
          seasonRankDelta: null as number | null,
        }
      : null,
    // Raw identity, no `ANONYMOUS_NAME` fallback: the card links each row to a
    // profile, and a synthesised name would be a link to a route that does not
    // resolve. Absent means "render the name, skip the link".
    friends: shown.map((row, index) => ({
      userId: row.userId,
      ...toUserIdentity(identities[index]),
      rank: row.rank,
      points: row.points,
      isViewer: row.userId === viewer._id,
    })),
    friendCount: friendRows.filter((row) => row.userId !== viewer._id).length,
  };
}

/**
 * The race that just ran, and how the viewer did in it.
 *
 * Exists because the dashboard used to move on the moment a Grand Prix was
 * scored: the weekend query switches to the next round, and a player who had
 * just watched a race met a picker for the following one. The result they had
 * been playing for was a small card in a side rail. This returns the same
 * weekend as the lead card for the rest of the day, with the people they follow
 * beside them, and the picker keeps its place directly underneath.
 *
 * Three states, and the one that decides between them is whether the *race
 * session* has a published result. Not "are there any scores for this race":
 * qualifying is scored on Saturday, so by the time the cars line up on Sunday
 * this race already has `scores` rows, and reading those would report a
 * finished weekend to someone watching the race.
 *
 * - `scored`  the race result is published. Final.
 * - `live`    OpenF1 is still reporting a running order for it. Provisional,
 *             and every number here moves; see `liveScoring.loadActiveSnapshot`
 *             for what counts as still running.
 * - `pending` neither. The race has been run and nothing is reporting on it,
 *             which OpenF1 makes rare: it means a race that left the picker
 *             without ever being scored.
 *
 * Null when no race has started recently, which is most of the calendar.
 */
export async function loadRaceRecap(ctx: QueryCtx) {
  const now = Date.now();
  const viewer = await getViewer(ctx);

  // `take(3)` rather than `first()`: a cancelled round still has a start time,
  // and the recap must skip it rather than lead with a race nobody ran.
  const recent = await ctx.db
    .query('races')
    .withIndex('by_raceStartAt', (q) =>
      q.gt('raceStartAt', now - RECAP_LOOKBACK_MS).lte('raceStartAt', now),
    )
    .order('desc')
    .take(3);
  const race = recent.find((candidate) => candidate.status !== 'cancelled');

  if (!race) {
    return null;
  }

  const raceSummary = {
    id: race._id,
    slug: race.slug,
    name: race.name,
    round: race.round,
    raceStartAt: race.raceStartAt,
  };
  const windowEndsAt = race.raceStartAt + RESULTS_FIRST_WINDOW_MS;

  /*
   * The race session's own result, which is the only thing that makes this
   * weekend final. `races.status` says the same thing, but it says it as a
   * consequence of this row being written, so this is the fact and that is the
   * echo of it.
   */
  const raceResult = await ctx.db
    .query('results')
    .withIndex('by_race_session', (q) =>
      q.eq('raceId', race._id).eq('sessionType', 'race'),
    )
    .first();

  const base = { race: raceSummary, windowEndsAt, serverNow: now };
  const empty = {
    playerCount: 0,
    viewer: null,
    friends: [],
    friendCount: 0,
  };

  if (!raceResult) {
    const snapshot = await loadActiveSnapshot(ctx, race);
    if (!snapshot) {
      return { ...base, ...empty, status: 'pending' as const, live: null };
    }

    /*
     * The snapshot already carries the whole field, ranked, with each player's
     * live Top 5 and H2H and their weekend total including the sessions already
     * published. So the live card is the same shape as the scored one with a
     * different source, and nothing is re-derived here.
     */
    const ranked = snapshot.standings.map((row) => ({
      userId: row.userId,
      rank: row.rank,
      points: row.weekend,
      top5Points: row.topFive,
      h2hPoints: row.h2h,
    }));
    const audience = await buildRecapAudience(ctx, viewer, ranked);

    return {
      ...base,
      status: 'live' as const,
      live: {
        sessionType: snapshot.sessionType,
        updatedAt: snapshot.updatedAt,
      },
      playerCount: ranked.length,
      ...audience,
      viewer: audience.viewer
        ? {
            ...audience.viewer,
            /*
             * No season position while a session is running. It would be the
             * most tempting number on the card and the least honest one: a
             * provisional standing recomputed every fifteen seconds, presented
             * beside a settled one. The weekend numbers are what is genuinely
             * in play.
             */
            seasonRank: null,
            seasonRankDelta: null,
          }
        : null,
    };
  }

  const scoreRows = await loadRaceScoreRows(ctx, race._id);
  if (scoreRows.size === 0) {
    return { ...base, ...empty, status: 'scored' as const, live: null };
  }

  const ranked = assignCompetitionRanks(
    [...scoreRows.values()].sort((a, b) => {
      const aTotal = a.top5Points + a.h2hPoints;
      const bTotal = b.top5Points + b.h2hPoints;
      return aTotal !== bTotal
        ? bTotal - aTotal
        : String(a.userId).localeCompare(String(b.userId));
    }),
    (row) => row.top5Points + row.h2hPoints,
  ).map((row) => ({
    userId: row.userId,
    rank: row.rank,
    points: row.top5Points + row.h2hPoints,
    top5Points: row.top5Points,
    h2hPoints: row.h2hPoints,
  }));

  const audience = await buildRecapAudience(ctx, viewer, ranked);
  if (!viewer || !audience.viewer) {
    return {
      ...base,
      status: 'scored' as const,
      live: null,
      playerCount: ranked.length,
      ...audience,
    };
  }

  // Season position, and what it was before this race. There is no stored rank
  // history, so "before" is reconstructed the same way the landing page's
  // timing tower does it — see `rankBeforeLastScoredRace`.
  const season = await getDefaultLeaderboardSeason(ctx);
  const seasonRows = await loadCombinedSeasonRows(ctx, { season });
  const seasonRow = seasonRows.find((row) => row.userId === viewer._id) ?? null;
  const previousSeasonRank = seasonRow
    ? rankBeforeLastScoredRace(
        seasonRows,
        new Map(ranked.map((row) => [row.userId, row.points])),
      ).get(viewer._id)
    : undefined;

  return {
    ...base,
    status: 'scored' as const,
    live: null,
    playerCount: ranked.length,
    ...audience,
    viewer: {
      ...audience.viewer,
      seasonRank: seasonRow?.rank ?? null,
      // Positive is a climb. Null means there is nothing to compare against: no
      // points before this race, so the player entered the table here rather
      // than moving up the length of it.
      seasonRankDelta:
        seasonRow && previousSeasonRank !== undefined
          ? previousSeasonRank - seasonRow.rank
          : null,
    },
  };
}

export const getRaceRecap = query({
  args: {},
  handler: async (ctx) => await loadRaceRecap(ctx),
});

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

    const [me, weekend, recap, rails] = await Promise.all([
      loadMe(ctx),
      loadCurrentWeekend(ctx),
      loadRaceRecap(ctx),
      loadDashboardRails(ctx, viewer),
    ]);

    // Between-seasons, or any moment with no open weekend: there is no raceId
    // to ask the pick queries about, and no card for them to fill in.
    if (!weekend) {
      return {
        me,
        weekend: null,
        recap,
        predictions: null,
        h2h: null,
        practice: null,
        ...rails,
      };
    }

    const [predictions, h2h, practice] = await Promise.all([
      loadMyWeekendPredictions(ctx, { raceId: weekend.race._id }),
      loadMyH2HPredictionsForRace(ctx, { raceId: weekend.race._id }),
      loadPracticeResultsForRace(ctx, weekend.race._id),
    ]);

    return { me, weekend, recap, predictions, h2h, practice, ...rails };
  },
});
