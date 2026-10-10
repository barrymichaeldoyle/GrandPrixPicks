import type { SessionType } from '@grandprixpicks/shared/sessions';
import { coversRound } from '@grandprixpicks/shared/teams';
import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from './_generated/server';
import { getViewer } from './lib/auth';
import { scoreTopFive } from './lib/scoring';
import {
  buildSessionDiscoveryUrl,
  fetchJson,
  getFallbackWindow,
  isMissingSessionResults,
  parseOpenF1Sessions,
} from './openF1Results';
// Re-exported so existing importers (and liveScoring.test.ts) keep their
// entry point while the implementation lives in one place.
export {
  parseOpenF1PositionRows,
  reduceRunningOrder,
} from './openF1LiveTiming';
import type { LiveGap } from './openF1LiveTiming';
import {
  parseOpenF1IntervalRows,
  parseOpenF1PositionRows,
  reduceGaps,
  reduceRunningOrder,
} from './openF1LiveTiming';

export const LIVE_SCORING_CADENCE_MS = 15_000;
const LIVE_WINDOW_AFTER_EXPECTED_END_MS = 30 * 60_000;
const MAX_FIELD_PREDICTIONS = 5_000;
const MAX_MATCHUPS_PER_SEASON = 48;

const liveSessionValidator = v.union(v.literal('sprint'), v.literal('race'));
const workerPositionValidator = v.object({
  driverNumber: v.number(),
  position: v.number(),
});
const workerGapValidator = v.object({
  driverNumber: v.number(),
  gapToLeaderSeconds: v.optional(v.number()),
  lapsBehind: v.optional(v.number()),
});
const snapshotOrderValidator = v.object({
  driverId: v.id('drivers'),
  position: v.number(),
  gapToLeaderSeconds: v.optional(v.number()),
  lapsBehind: v.optional(v.number()),
});

/**
 * How far back the first intervals request reaches. Only the latest gap per
 * car is kept, so a poller that starts mid-race has no use for the hours
 * before it.
 */
const INTERVALS_FIRST_WINDOW_MS = 2 * 60_000;

type SnapshotOrderEntry = {
  driverId: Id<'drivers'>;
  position: number;
  gapToLeaderSeconds?: number;
  lapsBehind?: number;
};

type LiveSessionType = 'sprint' | 'race';
type LiveInput = {
  race: Doc<'races'>;
  snapshot: Doc<'liveSnapshots'>;
  resultPublished: boolean;
  driverMappings: Array<{ driverNumber: number; driverId: Id<'drivers'> }>;
  topFivePredictions: Doc<'predictions'>[];
  h2hPredictions: Doc<'h2hPredictions'>[];
  matchups: Doc<'h2hMatchups'>[];
  publishedTopFiveScores: Doc<'scores'>[];
  publishedH2HScores: Doc<'h2hScores'>[];
};

function sessionStartAt(race: Doc<'races'>, sessionType: LiveSessionType) {
  return sessionType === 'sprint'
    ? (race.sprintStartAt ?? race.sprintLockAt ?? 0)
    : race.raceStartAt;
}

function liveDeadlineAt(race: Doc<'races'>, sessionType: LiveSessionType) {
  const { expectedEndAt } = getFallbackWindow(
    sessionType,
    sessionStartAt(race, sessionType),
  );
  return expectedEndAt + LIVE_WINDOW_AFTER_EXPECTED_END_MS;
}

/** Gaps count: a board whose order holds still is still moving on track. */
function sameOrder(
  left: ReadonlyArray<SnapshotOrderEntry>,
  right: ReadonlyArray<SnapshotOrderEntry>,
) {
  return (
    left.length === right.length &&
    left.every(
      (entry, index) =>
        entry.driverId === right[index]?.driverId &&
        entry.position === right[index]?.position &&
        entry.gapToLeaderSeconds === right[index]?.gapToLeaderSeconds &&
        entry.lapsBehind === right[index]?.lapsBehind,
    )
  );
}

function buildStandings(
  input: LiveInput,
  order: Array<{ driverId: Id<'drivers'>; position: number }>,
) {
  const classification = order.map((entry) => entry.driverId);
  const liveTopFive = new Map<Id<'users'>, number>();
  for (const prediction of input.topFivePredictions) {
    liveTopFive.set(
      prediction.userId,
      scoreTopFive({ picks: prediction.picks, classification }).total,
    );
  }

  const positionByDriver = new Map(
    order.map((entry) => [entry.driverId, entry.position]),
  );
  const winnerByMatchup = new Map<Id<'h2hMatchups'>, Id<'drivers'>>();
  for (const matchup of input.matchups) {
    const driver1Position = positionByDriver.get(matchup.driver1Id);
    const driver2Position = positionByDriver.get(matchup.driver2Id);
    if (driver1Position === undefined && driver2Position === undefined) {
      continue;
    }
    winnerByMatchup.set(
      matchup._id,
      driver2Position === undefined ||
        (driver1Position !== undefined && driver1Position < driver2Position)
        ? matchup.driver1Id
        : matchup.driver2Id,
    );
  }
  const liveH2H = new Map<Id<'users'>, number>();
  for (const prediction of input.h2hPredictions) {
    const point =
      winnerByMatchup.get(prediction.matchupId) === prediction.predictedWinnerId
        ? 1
        : 0;
    liveH2H.set(
      prediction.userId,
      (liveH2H.get(prediction.userId) ?? 0) + point,
    );
  }

  const published = new Map<Id<'users'>, number>();
  for (const score of [
    ...input.publishedTopFiveScores,
    ...input.publishedH2HScores,
  ]) {
    published.set(
      score.userId,
      (published.get(score.userId) ?? 0) + score.points,
    );
  }

  const userIds = new Set([...liveTopFive.keys(), ...liveH2H.keys()]);
  const sorted = [...userIds]
    .map((userId) => {
      const topFive = liveTopFive.get(userId) ?? 0;
      const h2h = liveH2H.get(userId) ?? 0;
      return {
        userId,
        topFive,
        h2h,
        weekend: (published.get(userId) ?? 0) + topFive + h2h,
      };
    })
    .sort(
      (a, b) =>
        b.weekend - a.weekend ||
        String(a.userId).localeCompare(String(b.userId)),
    );

  let previousPoints: number | null = null;
  let rank = 0;
  return sorted.map((entry, index) => {
    if (entry.weekend !== previousPoints) {
      rank = index + 1;
      previousPoints = entry.weekend;
    }
    return { ...entry, rank };
  });
}

/** Called by the existing session-lock job. Safe when that job fires twice. */
export async function scheduleLiveScoring(
  ctx: MutationCtx,
  race: Doc<'races'>,
  sessionType: SessionType,
) {
  if (
    race.status === 'cancelled' ||
    (sessionType !== 'sprint' && sessionType !== 'race')
  ) {
    return;
  }
  const existing = await ctx.db
    .query('liveSnapshots')
    .withIndex('by_raceId_and_sessionType', (q) =>
      q.eq('raceId', race._id).eq('sessionType', sessionType),
    )
    .unique();
  if (existing) {
    return;
  }
  await ctx.db.insert('liveSnapshots', {
    raceId: race._id,
    sessionType,
    order: [],
    standings: [],
    source: 'openf1-position',
    updatedAt: Date.now(),
  });
  await ctx.scheduler.runAfter(0, internal.liveScoring.pollLiveSession, {
    raceId: race._id,
    sessionType,
    positions: [],
  });
}

export const getLiveInput = internalQuery({
  args: { raceId: v.id('races'), sessionType: liveSessionValidator },
  returns: v.any(),
  handler: async (ctx, args): Promise<LiveInput | null> => {
    const race = await ctx.db.get(args.raceId);
    const snapshot = await ctx.db
      .query('liveSnapshots')
      .withIndex('by_raceId_and_sessionType', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )
      .unique();
    if (!race || !snapshot || race.status === 'cancelled') {
      return null;
    }
    const result = await ctx.db
      .query('results')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )
      .unique();
    const drivers = await ctx.db.query('drivers').take(60);
    const matchups = (
      await ctx.db
        .query('h2hMatchups')
        .withIndex('by_season', (q) => q.eq('season', race.season))
        .take(MAX_MATCHUPS_PER_SEASON)
    ).filter((matchup) => coversRound(matchup, race.round));
    const topFivePredictions = await ctx.db
      .query('predictions')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )
      .take(MAX_FIELD_PREDICTIONS);
    const h2hPredictions = await ctx.db
      .query('h2hPredictions')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )
      .take(MAX_FIELD_PREDICTIONS);
    const publishedTopFiveScores = (
      await ctx.db
        .query('scores')
        .withIndex('by_race_session', (q) => q.eq('raceId', args.raceId))
        .take(MAX_FIELD_PREDICTIONS)
    ).filter((score) => score.sessionType !== args.sessionType);
    const publishedH2HScores = (
      await ctx.db
        .query('h2hScores')
        .withIndex('by_race_session', (q) => q.eq('raceId', args.raceId))
        .take(MAX_FIELD_PREDICTIONS)
    ).filter((score) => score.sessionType !== args.sessionType);
    return {
      race,
      snapshot,
      resultPublished: result !== null,
      driverMappings: drivers.flatMap((driver) =>
        driver.number === undefined
          ? []
          : [{ driverNumber: driver.number, driverId: driver._id }],
      ),
      topFivePredictions,
      h2hPredictions,
      matchups,
      publishedTopFiveScores,
      publishedH2HScores,
    };
  },
});

export const writeSnapshot = internalMutation({
  args: {
    snapshotId: v.id('liveSnapshots'),
    order: v.array(snapshotOrderValidator),
    standings: v.array(
      v.object({
        userId: v.id('users'),
        rank: v.number(),
        topFive: v.number(),
        h2h: v.number(),
        weekend: v.number(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.snapshotId, {
      order: args.order,
      standings: args.standings,
      updatedAt: Date.now(),
    });
    return null;
  },
});

export const pollLiveSession = internalAction({
  args: {
    raceId: v.id('races'),
    sessionType: liveSessionValidator,
    sessionKey: v.optional(v.number()),
    latestDate: v.optional(v.string()),
    positions: v.array(workerPositionValidator),
    intervalsDate: v.optional(v.string()),
    gaps: v.optional(v.array(workerGapValidator)),
  },
  returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const input: LiveInput | null = await ctx.runQuery(
      internal.liveScoring.getLiveInput,
      { raceId: args.raceId, sessionType: args.sessionType },
    );
    if (
      !input ||
      input.resultPublished ||
      Date.now() > liveDeadlineAt(input.race, args.sessionType)
    ) {
      return null;
    }

    try {
      let sessionKey = args.sessionKey;
      if (sessionKey === undefined) {
        const startAt = sessionStartAt(input.race, args.sessionType);
        const sessions = parseOpenF1Sessions(
          await fetchJson(buildSessionDiscoveryUrl(input.race.season, startAt)),
        );
        const expectedName = args.sessionType === 'sprint' ? 'Sprint' : 'Race';
        sessionKey = sessions.find(
          (session) => session.session_name === expectedName,
        )?.session_key;
      }

      let positions = args.positions;
      let latestDate = args.latestDate;
      let gaps: LiveGap[] = args.gaps ?? [];
      let intervalsDate = args.intervalsDate;
      if (sessionKey !== undefined) {
        const positionUrl = new URL('https://api.openf1.org/v1/position');
        positionUrl.searchParams.set('session_key', String(sessionKey));
        if (latestDate) {
          positionUrl.searchParams.set('date>', latestDate);
        }
        const rows = parseOpenF1PositionRows(await fetchJson(positionUrl));
        positions = reduceRunningOrder(positions, rows);
        latestDate = rows.reduce(
          (latest, row) =>
            !latest || Date.parse(row.date) > Date.parse(latest)
              ? row.date
              : latest,
          latestDate,
        );

        const driverByNumber = new Map(
          input.driverMappings.map((entry) => [
            entry.driverNumber,
            entry.driverId,
          ]),
        );
        const unmapped = positions.filter(
          (entry) => !driverByNumber.has(entry.driverNumber),
        );
        if (unmapped.length > 0) {
          throw new Error(
            `Unmapped OpenF1 live driver number(s): ${unmapped
              .map((entry) => entry.driverNumber)
              .join(', ')}`,
          );
        }
        ({ gaps, intervalsDate } = await pollGaps(
          sessionKey,
          gaps,
          intervalsDate,
        ));
        const gapByDriver = new Map(
          gaps.map((entry) => [entry.driverNumber, entry]),
        );
        const order = positions.map((entry): SnapshotOrderEntry => {
          const gap = gapByDriver.get(entry.driverNumber);
          return {
            driverId: driverByNumber.get(entry.driverNumber)!,
            position: entry.position,
            ...(gap?.gapToLeaderSeconds === undefined
              ? {}
              : { gapToLeaderSeconds: gap.gapToLeaderSeconds }),
            ...(gap?.lapsBehind === undefined
              ? {}
              : { lapsBehind: gap.lapsBehind }),
          };
        });
        if (order.length > 0 && !sameOrder(input.snapshot.order, order)) {
          await ctx.runMutation(internal.liveScoring.writeSnapshot, {
            snapshotId: input.snapshot._id,
            order,
            standings: buildStandings(input, order),
          });
        }
      }

      await ctx.scheduler.runAfter(
        Math.min(
          LIVE_SCORING_CADENCE_MS,
          Math.max(
            0,
            liveDeadlineAt(input.race, args.sessionType) - Date.now(),
          ),
        ),
        internal.liveScoring.pollLiveSession,
        {
          raceId: args.raceId,
          sessionType: args.sessionType,
          sessionKey,
          latestDate,
          positions,
          intervalsDate,
          gaps,
        },
      );
    } catch (error) {
      console.warn(
        `OpenF1 live scoring tick failed for ${input.race.name} ${args.sessionType}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      await ctx.scheduler.runAfter(
        LIVE_SCORING_CADENCE_MS,
        internal.liveScoring.pollLiveSession,
        args,
      );
    }
    return null;
  },
});

/**
 * The latest gap to the leader for each car.
 *
 * A failure here keeps the gaps from the last tick rather than failing the
 * tick: the running order and the live scores do not depend on them.
 */
async function pollGaps(
  sessionKey: number,
  gaps: LiveGap[],
  intervalsDate: string | undefined,
): Promise<{ gaps: LiveGap[]; intervalsDate: string | undefined }> {
  const url = new URL('https://api.openf1.org/v1/intervals');
  url.searchParams.set('session_key', String(sessionKey));
  url.searchParams.set(
    'date>',
    intervalsDate ??
      new Date(Date.now() - INTERVALS_FIRST_WINDOW_MS).toISOString(),
  );
  try {
    const rows = parseOpenF1IntervalRows(await fetchJson(url));
    return {
      gaps: reduceGaps(gaps, rows),
      intervalsDate: rows.reduce(
        (latest, row) =>
          !latest || Date.parse(row.date) > Date.parse(latest)
            ? row.date
            : latest,
        intervalsDate,
      ),
    };
  } catch (error) {
    if (!isMissingSessionResults(error)) {
      console.warn(
        `OpenF1 intervals failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }
    return { gaps, intervalsDate };
  }
}

/**
 * The snapshot a race should currently be shown with, or null.
 *
 * Three things disqualify one: an empty running order, a clock past the
 * session's live deadline, and a published result for that session, which makes
 * the snapshot history rather than news.
 *
 * Extracted so `home.loadRaceRecap` decides "is this race in progress" with the
 * same rules the race page uses. Returns the raw document; the query below adds
 * the driver detail only that page needs, which is 22 reads the recap has no
 * use for.
 */
export async function loadActiveSnapshot(
  ctx: QueryCtx,
  race: Doc<'races'>,
): Promise<Doc<'liveSnapshots'> | null> {
  const snapshots = await ctx.db
    .query('liveSnapshots')
    .withIndex('by_raceId_and_sessionType', (q) => q.eq('raceId', race._id))
    .take(2);

  for (const snapshot of snapshots.sort((a, b) => b.updatedAt - a.updatedAt)) {
    if (
      snapshot.order.length === 0 ||
      Date.now() > liveDeadlineAt(race, snapshot.sessionType)
    ) {
      continue;
    }
    const result = await ctx.db
      .query('results')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', race._id).eq('sessionType', snapshot.sessionType),
      )
      .unique();
    if (result) {
      continue;
    }
    return snapshot;
  }

  return null;
}

export const getActiveSnapshot = query({
  args: { raceId: v.id('races') },
  returns: v.any(),
  handler: async (ctx, args) => {
    const race = await ctx.db.get(args.raceId);
    if (!race) {
      return null;
    }
    const snapshot = await loadActiveSnapshot(ctx, race);
    if (snapshot) {
      const viewer = await getViewer(ctx);
      const order = await Promise.all(
        snapshot.order.map(async (entry) => {
          const driver = await ctx.db.get(entry.driverId);
          return {
            ...entry,
            code: driver?.code ?? '???',
            displayName: driver?.displayName ?? 'Unknown',
            team: driver?.team ?? null,
            number: driver?.number ?? null,
            nationality: driver?.nationality ?? null,
          };
        }),
      );
      return {
        sessionType: snapshot.sessionType,
        order,
        viewerStanding: viewer
          ? (snapshot.standings.find((row) => row.userId === viewer._id) ??
            null)
          : null,
        totalPlayers: snapshot.standings.length,
        source: snapshot.source,
        updatedAt: snapshot.updatedAt,
      };
    }
    return null;
  },
});

/** Feed groups are one page of events, so the id list is small by construction. */
const MAX_FEED_BOARD_PLAYERS = 60;

/**
 * A running session, scored, for the named players.
 *
 * The feed already groups a session's activity under one header and, once the
 * result publishes, ranks the group as a mini-leaderboard. Before the publish
 * that same block was a stack of locked picks under the words "Awaiting
 * results", which is the least interesting version of the most interesting
 * moment: the cars are on track and every pick in the block is worth something
 * right now.
 *
 * This is the snapshot the race page's live board reads, narrowed to a session
 * and to the handful of players a feed group holds. Null whenever that session
 * is not running — no snapshot, a stale one, or a published result — which is
 * the signal to keep the pre-live rendering rather than show a board of zeroes.
 *
 * Per-pick points are computed here rather than in the client, off the same
 * `scoreTopFive` the publish will eventually use. The feed carries picks as
 * driver *codes*, so scoring them in the browser would mean a second, parallel
 * implementation matching on strings.
 */
export const getLiveSessionBoard = query({
  args: {
    raceId: v.id('races'),
    sessionType: liveSessionValidator,
    userIds: v.array(v.id('users')),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const race = await ctx.db.get(args.raceId);
    if (!race) {
      return null;
    }
    const snapshot = await loadActiveSnapshot(ctx, race);
    if (!snapshot || snapshot.sessionType !== args.sessionType) {
      return null;
    }

    const order = [...snapshot.order].sort((a, b) => a.position - b.position);
    const classification = order.map((entry) => entry.driverId);

    // Every driver named by the running order's top five or by any pick in the
    // group, read once. A pick can be for a car outside the top five, and a
    // slot has to render its code either way.
    const userIds = args.userIds.slice(0, MAX_FEED_BOARD_PLAYERS);
    const predictions = await Promise.all(
      userIds.map((userId) =>
        ctx.db
          .query('predictions')
          .withIndex('by_user_race_session', (q) =>
            q
              .eq('userId', userId)
              .eq('raceId', args.raceId)
              .eq('sessionType', args.sessionType),
          )
          .unique(),
      ),
    );

    const driverIds = new Set<Id<'drivers'>>(classification.slice(0, 5));
    for (const prediction of predictions) {
      for (const driverId of prediction?.picks ?? []) {
        driverIds.add(driverId);
      }
    }
    const driverDocs = await Promise.all(
      [...driverIds].map(
        async (driverId) => [driverId, await ctx.db.get(driverId)] as const,
      ),
    );
    const driversById = new Map(driverDocs);
    function describe(driverId: Id<'drivers'>) {
      const driver = driversById.get(driverId);
      return {
        code: driver?.code ?? '???',
        displayName: driver?.displayName ?? 'Unknown',
        team: driver?.team ?? null,
      };
    }

    const standingByUser = new Map(
      snapshot.standings.map((row) => [row.userId, row]),
    );

    const players = userIds.flatMap((userId, index) => {
      const prediction = predictions[index];
      if (!prediction) {
        return [];
      }
      const scored = scoreTopFive({
        picks: prediction.picks,
        classification,
      });
      const standing = standingByUser.get(userId);
      return [
        {
          userId,
          rank: standing?.rank ?? null,
          top5Points: scored.total,
          h2hPoints: standing?.h2h ?? 0,
          total: scored.total + (standing?.h2h ?? 0),
          picks: scored.breakdown.map((pick) => ({
            ...describe(pick.driverId),
            predictedPosition: pick.predictedPosition,
            actualPosition: pick.actualPosition,
            points: pick.points,
          })),
        },
      ];
    });

    return {
      sessionType: snapshot.sessionType,
      updatedAt: snapshot.updatedAt,
      totalPlayers: snapshot.standings.length,
      top5: classification.slice(0, 5).map((driverId, index) => ({
        ...describe(driverId),
        position: index + 1,
      })),
      players,
    };
  },
});
