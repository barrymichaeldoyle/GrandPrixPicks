import type { SessionType } from '@grandprixpicks/shared/sessions';
import { coversRound } from '@grandprixpicks/shared/teams';
import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
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
  parseOpenF1Sessions,
} from './openF1Results';

export const LIVE_SCORING_CADENCE_MS = 15_000;
const LIVE_WINDOW_AFTER_EXPECTED_END_MS = 30 * 60_000;
const MAX_FIELD_PREDICTIONS = 5_000;
const MAX_MATCHUPS_PER_SEASON = 48;

const liveSessionValidator = v.union(v.literal('sprint'), v.literal('race'));
const workerPositionValidator = v.object({
  driverNumber: v.number(),
  position: v.number(),
});

type LiveSessionType = 'sprint' | 'race';
type PositionRow = {
  driverNumber: number;
  position: number;
  date: string;
};

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseOpenF1PositionRows(value: unknown): PositionRow[] {
  if (!Array.isArray(value)) {
    throw new Error('OpenF1 position response was not an array');
  }
  return value.map((item) => {
    if (
      !isRecord(item) ||
      typeof item.driver_number !== 'number' ||
      typeof item.position !== 'number' ||
      typeof item.date !== 'string' ||
      !Number.isInteger(item.driver_number) ||
      !Number.isInteger(item.position) ||
      item.position < 1 ||
      !Number.isFinite(Date.parse(item.date))
    ) {
      throw new Error('OpenF1 returned an invalid position row');
    }
    return {
      driverNumber: item.driver_number,
      position: item.position,
      date: item.date,
    };
  });
}

/** Merge an event-log page into the last-known position for each driver. */
export function reduceRunningOrder(
  existing: ReadonlyArray<{ driverNumber: number; position: number }>,
  rows: ReadonlyArray<PositionRow>,
) {
  const latestByDriver = new Map<number, { position: number; date: string }>();
  for (const row of rows) {
    const previous = latestByDriver.get(row.driverNumber);
    if (!previous || Date.parse(row.date) >= Date.parse(previous.date)) {
      latestByDriver.set(row.driverNumber, {
        position: row.position,
        date: row.date,
      });
    }
  }

  const byDriver = new Map(
    existing.map((entry) => [entry.driverNumber, entry.position]),
  );
  for (const [driverNumber, row] of latestByDriver) {
    byDriver.set(driverNumber, row.position);
  }
  const order = [...byDriver]
    .map(([driverNumber, position]) => ({ driverNumber, position }))
    .sort((a, b) => a.position - b.position);
  if (new Set(order.map((entry) => entry.position)).size !== order.length) {
    throw new Error('OpenF1 running order contains duplicate positions');
  }
  return order;
}

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

function sameOrder(
  left: ReadonlyArray<{ driverId: Id<'drivers'>; position: number }>,
  right: ReadonlyArray<{ driverId: Id<'drivers'>; position: number }>,
) {
  return (
    left.length === right.length &&
    left.every(
      (entry, index) =>
        entry.driverId === right[index]?.driverId &&
        entry.position === right[index]?.position,
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
    order: v.array(
      v.object({ driverId: v.id('drivers'), position: v.number() }),
    ),
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
        const order = positions.map((entry) => ({
          driverId: driverByNumber.get(entry.driverNumber)!,
          position: entry.position,
        }));
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

export const getActiveSnapshot = query({
  args: { raceId: v.id('races') },
  returns: v.any(),
  handler: async (ctx, args) => {
    const race = await ctx.db.get(args.raceId);
    if (!race) {
      return null;
    }
    const snapshots = await ctx.db
      .query('liveSnapshots')
      .withIndex('by_raceId_and_sessionType', (q) =>
        q.eq('raceId', args.raceId),
      )
      .take(2);
    for (const snapshot of snapshots.sort(
      (a, b) => b.updatedAt - a.updatedAt,
    )) {
      if (
        snapshot.order.length === 0 ||
        Date.now() > liveDeadlineAt(race, snapshot.sessionType)
      ) {
        continue;
      }
      const result = await ctx.db
        .query('results')
        .withIndex('by_race_session', (q) =>
          q.eq('raceId', args.raceId).eq('sessionType', snapshot.sessionType),
        )
        .unique();
      if (result) {
        continue;
      }
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
