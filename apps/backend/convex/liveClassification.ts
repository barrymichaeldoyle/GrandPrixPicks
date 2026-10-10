import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import type { ActionCtx, QueryCtx } from './_generated/server';
import {
  internalAction,
  internalMutation,
  internalQuery,
  query,
} from './_generated/server';
import {
  buildSessionDiscoveryUrl,
  fetchJson,
  isMissingSessionResults,
  parseOpenF1Sessions,
} from './openF1Results';
import { qualifyingSegmentLaps } from './lib/qualifyingSegments';
import { loadRacesInSessionWindow } from './lib/sessionWindows';

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

/** Q1/Q2/Q3, or SQ1/SQ2/SQ3: the same three segments either way. */
type QualifyingPhase = 1 | 2 | 3;

interface QualifyingEntry {
  driverNumber: number;
  /** Best lap in the segment the driver is ranked by; null before they set one. */
  bestLapSeconds: number | null;
  knockedOutIn?: 1 | 2;
}

/** Ten cars reach the last segment; the first two cut the rest evenly. */
function knockoutsPerSegment(gridSize: number) {
  return Math.max(0, Math.floor((gridSize - 10) / 2));
}

/**
 * The qualifying order as the timing screens show it mid-session.
 *
 * Ranking the whole session by best lap, as practice does, is wrong from Q2
 * on: a car out in Q1 can hold a faster lap than one still running, and the
 * eliminated drivers sat in the middle of the order. Here a driver is ranked
 * by the last segment they reached ({@link qualifyingSegmentLaps}).
 *
 * Returns null when race control has no segment data, so the caller falls back
 * to the plain best-lap order rather than inventing one.
 */
export function qualifyingOrder(
  laps: unknown,
  raceControl: unknown,
  gridSize: number,
): { phase: QualifyingPhase; entries: QualifyingEntry[] } | null {
  const split = qualifyingSegmentLaps(laps, raceControl);
  if (!split) {
    return null;
  }
  const { ended, best, drivers } = split;

  // The segment on screen: the one now running once anyone has a lap in it,
  // otherwise the one just finished, which still shows who it knocked out.
  const next = Math.min(3, ended + 1);
  const nextHasLaps = [...best.values()].some((segments) => segments.has(next));
  const phase = (ended === 0 || nextHasLaps ? next : ended) as QualifyingPhase;

  const cut = knockoutsPerSegment(Math.max(gridSize, drivers.size));
  function lapIn(driver: number, segment: number) {
    return best.get(driver)?.get(segment) ?? null;
  }
  function rank(contenders: number[], segment: number) {
    // Stable sort: a driver with no lap yet keeps the order they arrived in.
    return [...contenders].sort((a, b) => {
      const lapA = lapIn(a, segment);
      const lapB = lapIn(b, segment);
      if (lapA === null || lapB === null) {
        return lapA === lapB ? 0 : lapA === null ? 1 : -1;
      }
      return lapA - lapB;
    });
  }

  // Q1 order starts from car number so the untimed tail is stable.
  let contenders = rank(
    [...drivers].sort((a, b) => a - b),
    1,
  );
  const out: QualifyingEntry[][] = [];
  for (let segment = 1; segment < phase; segment += 1) {
    const advance = contenders.length - cut;
    out.push(
      contenders.slice(advance).map((driverNumber) => ({
        driverNumber,
        bestLapSeconds: lapIn(driverNumber, segment),
        knockedOutIn: segment as 1 | 2,
      })),
    );
    contenders = rank(contenders.slice(0, advance), segment + 1);
  }
  // Segment over and not the last: its bottom places are already out.
  const settled = phase <= ended && phase < 3;
  const advance = settled ? contenders.length - cut : contenders.length;
  const running = contenders.map((driverNumber, index) => ({
    driverNumber,
    bestLapSeconds: lapIn(driverNumber, phase),
    ...(index >= advance ? { knockedOutIn: phase as 1 | 2 } : {}),
  }));
  return { phase, entries: [...running, ...out.reverse().flat()] };
}

export const activeTask = internalQuery({
  args: { now: v.number() },
  returns: v.any(),
  handler: async (ctx, { now }) => {
    const races = await loadRacesInSessionWindow(
      ctx,
      ['fp1', 'fp2', 'fp3', 'quali', 'sprint_quali'],
      now - 120 * 60_000,
      now,
    );
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
        // Null in qualifying for a driver still to set a lap in this segment.
        bestLapSeconds: v.union(v.number(), v.null()),
        knockedOutIn: v.optional(v.union(v.literal(1), v.literal(2))),
      }),
    ),
    // Qualifying only: the segment on screen (Q1/Q2/Q3, SQ1/SQ2/SQ3).
    phase: v.optional(v.union(v.literal(1), v.literal(2), v.literal(3))),
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
    const task: ActiveTask | null = await ctx.runQuery(
      internal.liveClassification.activeTask,
      { now: Date.now() },
    );
    if (!task) {
      return null;
    }
    try {
      return await refreshTask(ctx, task);
    } catch (error) {
      // For the first minutes of a session OpenF1 knows it but has no laps
      // yet, and answers 404 "No results found." rather than []. That is "no
      // data yet": the next tick picks it up. Anything else is a real failure.
      if (isMissingSessionResults(error)) {
        console.info(
          `Live classification: no OpenF1 data yet for ${task.raceSlug} ${task.sessionType}`,
        );
        return null;
      }
      throw error;
    }
  },
});

interface ActiveTask {
  raceId: Id<'races'>;
  raceName: string;
  raceSlug: string;
  season: number;
  sessionType: TimedSession;
  startAt: number;
}

async function refreshTask(ctx: ActionCtx, task: ActiveTask): Promise<null> {
  const sessions = parseOpenF1Sessions(
    await fetchJson(buildSessionDiscoveryUrl(task.season, task.startAt)),
  );
  const session = sessions.find((item) =>
    names[task.sessionType].includes(item.session_name),
  );
  if (!session) {
    return null;
  }
  const lapsUrl = new URL('https://api.openf1.org/v1/laps');
  lapsUrl.searchParams.set('session_key', String(session.session_key));
  const driversUrl = new URL('https://api.openf1.org/v1/drivers');
  driversUrl.searchParams.set('session_key', String(session.session_key));
  const qualifying =
    task.sessionType === 'quali' || task.sessionType === 'sprint_quali';
  const raceControlUrl = new URL('https://api.openf1.org/v1/race_control');
  raceControlUrl.searchParams.set('session_key', String(session.session_key));
  const [rawLaps, rawDrivers, raceControl] = await Promise.all([
    fetchJson(lapsUrl),
    fetchJson(driversUrl),
    // Race control is a nicety: without it qualifying reads as practice does.
    qualifying ? fetchJson(raceControlUrl).catch(() => null) : null,
  ]);
  const drivers = new Map<
    number,
    { code: string; displayName: string; team: string | null }
  >();
  if (Array.isArray(rawDrivers)) {
    for (const row of rawDrivers) {
      if (record(row) && typeof row.driver_number === 'number') {
        drivers.set(row.driver_number, {
          code: typeof row.name_acronym === 'string' ? row.name_acronym : '???',
          displayName:
            typeof row.full_name === 'string' ? row.full_name : 'Unknown',
          team: typeof row.team_name === 'string' ? row.team_name : null,
        });
      }
    }
  }
  const segmented = qualifying
    ? qualifyingOrder(rawLaps, raceControl, drivers.size)
    : null;
  const order = segmented
    ? // Before their first lap a driver is only a name; keep the board to
      // drivers with a time somewhere, as the practice order does.
      segmented.entries.filter(
        (entry) =>
          entry.bestLapSeconds !== null ||
          segmented.phase > 1 ||
          entry.knockedOutIn !== undefined,
      )
    : bestLapOrder(rawLaps);
  await ctx.runMutation(internal.liveClassification.write, {
    raceId: task.raceId,
    raceName: task.raceName,
    raceSlug: task.raceSlug,
    sessionType: task.sessionType,
    entries: order.flatMap((entry, index) => {
      const driver = drivers.get(entry.driverNumber);
      return driver ? [{ ...entry, ...driver, position: index + 1 }] : [];
    }),
    ...(segmented ? { phase: segmented.phase } : {}),
  });
  return null;
}

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
            gapToLeaderSeconds: entry.gapToLeaderSeconds,
            lapsBehind: entry.lapsBehind,
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
