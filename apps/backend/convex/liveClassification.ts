import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from './_generated/server';
import {
  buildSessionDiscoveryUrl,
  fetchJson,
  parseOpenF1Sessions,
} from './openF1Results';

type TimedSession = 'fp1' | 'fp2' | 'fp3' | 'quali' | 'sprint_quali';
const names: Record<TimedSession, readonly string[]> = {
  fp1: ['Practice 1'],
  fp2: ['Practice 2'],
  fp3: ['Practice 3'],
  quali: ['Qualifying'],
  sprint_quali: ['Sprint Qualifying', 'Sprint Shootout'],
};

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function bestLapOrder(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }
  const best = new Map<number, number>();
  for (const row of value) {
    if (
      !record(row) ||
      typeof row.driver_number !== 'number' ||
      typeof row.lap_duration !== 'number' ||
      !Number.isFinite(row.lap_duration)
    ) {
      continue;
    }
    const current = best.get(row.driver_number);
    if (current === undefined || row.lap_duration < current) {
      best.set(row.driver_number, row.lap_duration);
    }
  }
  return [...best]
    .map(([driverNumber, bestLapSeconds]) => ({ driverNumber, bestLapSeconds }))
    .sort((a, b) => a.bestLapSeconds - b.bestLapSeconds);
}

export const activeTask = internalQuery({
  args: { now: v.number() },
  returns: v.any(),
  handler: async (ctx, { now }) => {
    const races = await ctx.db
      .query('races')
      .withIndex('by_season_round')
      .order('desc')
      .take(30);
    for (const race of races) {
      const starts: Array<[TimedSession, number | undefined, number]> = [
        ['fp1', race.fp1StartAt, 90],
        ['fp2', race.fp2StartAt, 90],
        ['fp3', race.fp3StartAt, 90],
        ['quali', race.qualiStartAt, 120],
        ['sprint_quali', race.sprintQualiStartAt, 90],
      ];
      for (const [sessionType, startAt, minutes] of starts) {
        if (
          startAt !== undefined &&
          now >= startAt &&
          now <= startAt + minutes * 60_000
        ) {
          const published = sessionType.startsWith('fp')
            ? await ctx.db
                .query('practiceResults')
                .withIndex('by_raceId_and_sessionType', (q) =>
                  q
                    .eq('raceId', race._id)
                    .eq('sessionType', sessionType as 'fp1' | 'fp2' | 'fp3'),
                )
                .unique()
            : await ctx.db
                .query('results')
                .withIndex('by_race_session', (q) =>
                  q
                    .eq('raceId', race._id)
                    .eq('sessionType', sessionType as 'quali' | 'sprint_quali'),
                )
                .unique();
          if (published) {
            continue;
          }
          return {
            raceId: race._id,
            raceName: race.name,
            raceSlug: race.slug,
            season: race.season,
            sessionType,
            startAt,
          };
        }
      }
    }
    return null;
  },
});

export const write = internalMutation({
  args: {
    raceId: v.id('races'),
    raceName: v.string(),
    raceSlug: v.string(),
    sessionType: v.union(
      v.literal('fp1'),
      v.literal('fp2'),
      v.literal('fp3'),
      v.literal('quali'),
      v.literal('sprint_quali'),
    ),
    entries: v.array(
      v.object({
        position: v.number(),
        driverNumber: v.number(),
        code: v.string(),
        displayName: v.string(),
        team: v.union(v.string(), v.null()),
        bestLapSeconds: v.number(),
      }),
    ),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('liveClassifications')
      .withIndex('by_raceId_and_sessionType', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )
      .unique();
    const value = { ...args, updatedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, value);
    } else {
      await ctx.db.insert('liveClassifications', value);
    }
    return null;
  },
});

export const refresh = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx): Promise<null> => {
    const task = await ctx.runQuery(internal.liveClassification.activeTask, {
      now: Date.now(),
    });
    if (!task) {
      return null;
    }
    const sessions = parseOpenF1Sessions(
      await fetchJson(buildSessionDiscoveryUrl(task.season, task.startAt)),
    );
    const session = sessions.find((item) =>
      names[task.sessionType as TimedSession].includes(item.session_name),
    );
    if (!session) {
      return null;
    }
    const lapsUrl = new URL('https://api.openf1.org/v1/laps');
    lapsUrl.searchParams.set('session_key', String(session.session_key));
    const driversUrl = new URL('https://api.openf1.org/v1/drivers');
    driversUrl.searchParams.set('session_key', String(session.session_key));
    const [order, rawDrivers] = await Promise.all([
      fetchJson(lapsUrl).then(bestLapOrder),
      fetchJson(driversUrl),
    ]);
    const drivers = new Map<
      number,
      { code: string; displayName: string; team: string | null }
    >();
    if (Array.isArray(rawDrivers)) {
      for (const row of rawDrivers) {
        if (record(row) && typeof row.driver_number === 'number') {
          drivers.set(row.driver_number, {
            code:
              typeof row.name_acronym === 'string' ? row.name_acronym : '???',
            displayName:
              typeof row.full_name === 'string' ? row.full_name : 'Unknown',
            team: typeof row.team_name === 'string' ? row.team_name : null,
          });
        }
      }
    }
    await ctx.runMutation(internal.liveClassification.write, {
      raceId: task.raceId as Id<'races'>,
      raceName: task.raceName,
      raceSlug: task.raceSlug,
      sessionType: task.sessionType,
      entries: order.flatMap((entry, index) => {
        const driver = drivers.get(entry.driverNumber);
        return driver ? [{ ...entry, ...driver, position: index + 1 }] : [];
      }),
    });
    return null;
  },
});

/**
 * Whether the session's own results are out.
 *
 * Practice publishes to `practiceResults` and the competitive sessions to
 * `results`, which is why this asks two different tables rather than one.
 */
async function isPublished(
  ctx: QueryCtx,
  raceId: Id<'races'>,
  /* Both live shapes at once: the OpenF1 rows cover practice and the two
     qualifying sessions, the in-race snapshots cover sprint and race. */
  sessionType:
    | 'fp1'
    | 'fp2'
    | 'fp3'
    | 'quali'
    | 'sprint_quali'
    | 'sprint'
    | 'race',
): Promise<boolean> {
  if (sessionType === 'fp1' || sessionType === 'fp2' || sessionType === 'fp3') {
    const practice = await ctx.db
      .query('practiceResults')
      .withIndex('by_raceId_and_sessionType', (q) =>
        q.eq('raceId', raceId).eq('sessionType', sessionType),
      )
      .unique();
    return practice !== null;
  }
  const result = await ctx.db
    .query('results')
    .withIndex('by_race_session', (q) =>
      q.eq('raceId', raceId).eq('sessionType', sessionType),
    )
    .unique();
  return result !== null;
}

export const current = query({
  args: {},
  returns: v.any(),
  handler: async (ctx) => {
    const latest = await ctx.db
      .query('liveClassifications')
      .withIndex('by_updatedAt')
      .order('desc')
      .first();
    const running = (await ctx.db.query('liveSnapshots').take(20)).sort(
      (a, b) => b.updatedAt - a.updatedAt,
    )[0];
    const candidate =
      latest && (!running || latest.updatedAt >= running.updatedAt)
        ? latest
        : running;
    if (!candidate || Date.now() - candidate.updatedAt >= 3 * 60_000) {
      return null;
    }
    // A published result ends the live board, whichever shape the candidate
    // is. The snapshot branch below has always checked; this one did not, so
    // an admin publishing qualifying left the running order sitting above the
    // feed — the same session twice, one of them provisional, and the wrong
    // one on top. `activeTask` stops *collecting* at the same moment, but the
    // last row it wrote is still inside the three-minute window.
    if (await isPublished(ctx, candidate.raceId, candidate.sessionType)) {
      return null;
    }
    if ('entries' in candidate) {
      return candidate;
    }
    const race = await ctx.db.get(candidate.raceId);
    if (!race) {
      return null;
    }
    const entries = await Promise.all(
      [...candidate.order]
        .sort((a, b) => a.position - b.position)
        .map(async (entry) => {
          const driver = await ctx.db.get(entry.driverId);
          return {
            position: entry.position,
            driverNumber: driver?.number ?? 0,
            code: driver?.code ?? '???',
            displayName: driver?.displayName ?? 'Unknown',
            team: driver?.team ?? null,
            bestLapSeconds: null,
          };
        }),
    );
    return {
      raceId: race._id,
      raceName: race.name,
      raceSlug: race.slug,
      sessionType: candidate.sessionType,
      entries,
      updatedAt: candidate.updatedAt,
    };
  },
});
