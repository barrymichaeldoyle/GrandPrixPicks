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
  parseOpenF1Sessions,
} from './openF1Results';
import { getViewer } from './lib/auth';

const MINUTE = 60_000;
const PRACTICE_DURATION = 60 * MINUTE;
const FIRST_ATTEMPT_DELAY = 2 * MINUTE;
const MAX_PER_RUN = 3;
const RECHECK_OFFSETS = [30 * MINUTE, 60 * MINUTE] as const;

const practiceSessionValidator = v.union(
  v.literal('fp1'),
  v.literal('fp2'),
  v.literal('fp3'),
);

export type PracticeSessionType = 'fp1' | 'fp2' | 'fp3';

const OPEN_F1_SESSION_NAMES: Record<PracticeSessionType, string> = {
  fp1: 'Practice 1',
  fp2: 'Practice 2',
  fp3: 'Practice 3',
};

type PracticeTask = {
  raceId: Id<'races'>;
  raceName: string;
  raceSlug: string;
  season: number;
  sessionType: PracticeSessionType;
  sessionStartAt: number;
  mode: 'populate' | 'reconcile';
  lastAttemptAt?: number;
};

type OpenF1PracticeRow = {
  driverNumber: number;
  position: number;
  bestLapSeconds?: number;
  gapToLeaderSeconds?: number;
  lapCount?: number;
};

type OpenF1PracticeDriver = {
  driverNumber: number;
  code: string;
  displayName: string;
  team?: string;
};

type PracticeSummaryInput = {
  sessionType: PracticeSessionType;
  publishedAt: number;
  entries: Array<{
    driverNumber: number;
    code: string;
    displayName: string;
    team?: string;
    position: number;
    bestLapSeconds?: number;
    gapToLeaderSeconds?: number;
    lapCount?: number;
  }>;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseOpenF1PracticeResults(
  value: unknown,
): OpenF1PracticeRow[] {
  if (!Array.isArray(value)) {
    throw new Error('OpenF1 practice result response was not an array');
  }

  const rows = value.map((item) => {
    if (
      !isRecord(item) ||
      typeof item.driver_number !== 'number' ||
      typeof item.position !== 'number'
    ) {
      throw new Error('OpenF1 returned an incomplete practice result row');
    }
    if (
      !Number.isInteger(item.driver_number) ||
      !Number.isInteger(item.position) ||
      item.position < 1
    ) {
      throw new Error('OpenF1 returned an invalid practice result row');
    }

    function optionalNumber(field: string) {
      const candidate = item[field];
      return typeof candidate === 'number' && Number.isFinite(candidate)
        ? candidate
        : undefined;
    }

    return {
      driverNumber: item.driver_number,
      position: item.position,
      bestLapSeconds: optionalNumber('duration'),
      gapToLeaderSeconds: optionalNumber('gap_to_leader'),
      lapCount: optionalNumber('number_of_laps'),
    };
  });

  if (rows.length < 5) {
    throw new Error(`OpenF1 returned only ${rows.length} practice drivers`);
  }
  const driverNumbers = new Set(rows.map((row) => row.driverNumber));
  const positions = new Set(rows.map((row) => row.position));
  if (driverNumbers.size !== rows.length || positions.size !== rows.length) {
    throw new Error('OpenF1 returned duplicate practice drivers or positions');
  }
  return rows.sort((a, b) => a.position - b.position);
}

export function parseOpenF1PracticeDrivers(
  value: unknown,
): OpenF1PracticeDriver[] {
  if (!Array.isArray(value)) {
    throw new Error('OpenF1 practice driver response was not an array');
  }
  return value.flatMap((item) => {
    if (
      !isRecord(item) ||
      typeof item.driver_number !== 'number' ||
      typeof item.name_acronym !== 'string' ||
      typeof item.full_name !== 'string'
    ) {
      return [];
    }
    return [
      {
        driverNumber: item.driver_number,
        code: item.name_acronym,
        displayName: item.full_name,
        team: typeof item.team_name === 'string' ? item.team_name : undefined,
      },
    ];
  });
}

export function buildPracticeSessionSummaries(
  results: PracticeSummaryInput[],
  canonicalDriverNumbers: ReadonlySet<number>,
) {
  const order: PracticeSessionType[] = ['fp1', 'fp2', 'fp3'];
  const sorted = [...results].sort(
    (a, b) => order.indexOf(a.sessionType) - order.indexOf(b.sessionType),
  );
  let previousPositions = new Map<number, number>();

  return sorted.map((result) => {
    const timedEntries = result.entries.filter(
      (
        entry,
      ): entry is typeof entry & {
        bestLapSeconds: number;
      } => entry.bestLapSeconds !== undefined,
    );
    const fastest =
      [...timedEntries].sort(
        (a, b) => a.bestLapSeconds - b.bestLapSeconds,
      )[0] ?? null;
    const entriesByTeam = new Map<string, typeof timedEntries>();
    for (const entry of timedEntries) {
      if (!entry.team) {
        continue;
      }
      const teammates = entriesByTeam.get(entry.team) ?? [];
      teammates.push(entry);
      entriesByTeam.set(entry.team, teammates);
    }
    const teammateGaps = [...entriesByTeam.entries()]
      .flatMap(([team, teammates]) => {
        if (teammates.length < 2) {
          return [];
        }
        const ordered = [...teammates].sort(
          (a, b) => a.bestLapSeconds - b.bestLapSeconds,
        );
        const leading = ordered[0]!;
        return ordered.slice(1).map((trailing) => ({
          team,
          leadingDriver: {
            code: leading.code,
            displayName: leading.displayName,
          },
          trailingDriver: {
            code: trailing.code,
            displayName: trailing.displayName,
          },
          gapSeconds:
            Math.round(
              (trailing.bestLapSeconds - leading.bestLapSeconds) * 1_000,
            ) / 1_000,
        }));
      })
      .sort((a, b) => b.gapSeconds - a.gapSeconds);
    const positionChanges = result.entries
      .flatMap((entry) => {
        const previousPosition = previousPositions.get(entry.driverNumber);
        return previousPosition === undefined
          ? []
          : [
              {
                code: entry.code,
                displayName: entry.displayName,
                previousPosition,
                position: entry.position,
                placesGained: previousPosition - entry.position,
              },
            ];
      })
      .sort((a, b) => Math.abs(b.placesGained) - Math.abs(a.placesGained));
    previousPositions = new Map(
      result.entries.map((entry) => [entry.driverNumber, entry.position]),
    );

    return {
      sessionType: result.sessionType,
      publishedAt: result.publishedAt,
      fastest: fastest
        ? {
            code: fastest.code,
            displayName: fastest.displayName,
            team: fastest.team ?? null,
            bestLapSeconds: fastest.bestLapSeconds,
          }
        : null,
      topThree: result.entries.slice(0, 3).map((entry) => ({
        position: entry.position,
        code: entry.code,
        displayName: entry.displayName,
        team: entry.team ?? null,
        bestLapSeconds: entry.bestLapSeconds ?? null,
        gapToLeaderSeconds: entry.gapToLeaderSeconds ?? null,
      })),
      teammateGaps,
      reserveDrivers: result.entries
        .filter((entry) => !canonicalDriverNumbers.has(entry.driverNumber))
        .map((entry) => ({
          position: entry.position,
          code: entry.code,
          displayName: entry.displayName,
          team: entry.team ?? null,
          bestLapSeconds: entry.bestLapSeconds ?? null,
        })),
      positionChanges,
    };
  });
}

async function fetchPracticeResult(args: PracticeTask) {
  const sessions = parseOpenF1Sessions(
    await fetchJson(buildSessionDiscoveryUrl(args.season, args.sessionStartAt)),
  );
  const sessionName = OPEN_F1_SESSION_NAMES[args.sessionType];
  const session = sessions.find(
    (candidate) => candidate.session_name === sessionName,
  );
  if (!session) {
    throw new Error(
      `OpenF1 has not exposed ${args.raceName} ${args.sessionType.toUpperCase()} yet`,
    );
  }

  const resultUrl = new URL('https://api.openf1.org/v1/session_result');
  resultUrl.searchParams.set('session_key', String(session.session_key));
  const rows = parseOpenF1PracticeResults(await fetchJson(resultUrl));
  const driversUrl = new URL('https://api.openf1.org/v1/drivers');
  driversUrl.searchParams.set('session_key', String(session.session_key));
  const drivers = parseOpenF1PracticeDrivers(await fetchJson(driversUrl));
  const driverByNumber = new Map(
    drivers.map((driver) => [driver.driverNumber, driver]),
  );
  const unmapped = rows
    .map((row) => row.driverNumber)
    .filter((number) => !driverByNumber.has(number));
  if (unmapped.length > 0) {
    throw new Error(`Unmapped OpenF1 driver number(s): ${unmapped.join(', ')}`);
  }

  return {
    openF1SessionKey: session.session_key,
    entries: rows.map((row) => {
      const driver = driverByNumber.get(row.driverNumber)!;
      return {
        driverNumber: row.driverNumber,
        code: driver.code,
        displayName: driver.displayName,
        team: driver.team,
        position: row.position,
        bestLapSeconds: row.bestLapSeconds,
        gapToLeaderSeconds: row.gapToLeaderSeconds,
        lapCount: row.lapCount,
      };
    }),
  };
}

export const getDuePracticeSessions = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, args): Promise<PracticeTask[]> => {
    const races = await ctx.db
      .query('races')
      .withIndex('by_season_round')
      .take(100);
    const due: PracticeTask[] = [];

    for (const race of races) {
      if (race.status === 'cancelled') {
        continue;
      }
      const starts: Array<[PracticeSessionType, number | undefined]> = [
        ['fp1', race.fp1StartAt],
        ['fp2', race.fp2StartAt],
        ['fp3', race.fp3StartAt],
      ];
      for (const [sessionType, sessionStartAt] of starts) {
        if (
          sessionStartAt === undefined ||
          args.now < sessionStartAt + PRACTICE_DURATION + FIRST_ATTEMPT_DELAY
        ) {
          continue;
        }
        const existing = await ctx.db
          .query('practiceResults')
          .withIndex('by_raceId_and_sessionType', (q) =>
            q.eq('raceId', race._id).eq('sessionType', sessionType),
          )
          .unique();
        const poll = await ctx.db
          .query('practiceResultPolls')
          .withIndex('by_raceId_and_sessionType', (q) =>
            q.eq('raceId', race._id).eq('sessionType', sessionType),
          )
          .unique();
        if (
          !existing ||
          existing.recheckStage === undefined ||
          (existing.nextRecheckAt ?? Infinity) <= args.now
        ) {
          due.push({
            raceId: race._id,
            raceName: race.name,
            raceSlug: race.slug,
            season: race.season,
            sessionType,
            sessionStartAt,
            mode: existing ? 'reconcile' : 'populate',
            lastAttemptAt: poll?.lastAttemptAt,
          });
        }
      }
    }

    // Oldest attempt first gives every unavailable session a turn instead of
    // allowing the first persistent error to block all newer classifications.
    return due
      .sort(
        (a, b) =>
          (a.lastAttemptAt ?? 0) - (b.lastAttemptAt ?? 0) ||
          a.sessionStartAt - b.sessionStartAt,
      )
      .slice(0, MAX_PER_RUN);
  },
});

export const upsertPracticeResult = internalMutation({
  args: {
    raceId: v.id('races'),
    sessionType: practiceSessionValidator,
    openF1SessionKey: v.number(),
    entries: v.array(
      v.object({
        driverNumber: v.number(),
        code: v.string(),
        displayName: v.string(),
        team: v.optional(v.string()),
        position: v.number(),
        bestLapSeconds: v.optional(v.number()),
        gapToLeaderSeconds: v.optional(v.number()),
        lapCount: v.optional(v.number()),
      }),
    ),
    mode: v.union(v.literal('populate'), v.literal('reconcile')),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('practiceResults')
      .withIndex('by_raceId_and_sessionType', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )
      .unique();
    const now = Date.now();
    if (existing) {
      const recheckStage = existing.recheckStage ?? 0;
      const nextOffset = RECHECK_OFFSETS[recheckStage + 1];
      await ctx.db.patch(existing._id, {
        openF1SessionKey: args.openF1SessionKey,
        entries: args.entries,
        updatedAt: now,
        recheckStage: recheckStage + 1,
        lastRecheckedAt: now,
        lastRecheckError: undefined,
        nextRecheckAt: nextOffset === undefined ? undefined : now + nextOffset,
      });
      return 'updated' as const;
    }
    await ctx.db.insert('practiceResults', {
      raceId: args.raceId,
      sessionType: args.sessionType,
      openF1SessionKey: args.openF1SessionKey,
      entries: args.entries,
      publishedAt: now,
      updatedAt: now,
      recheckStage: 0,
      nextRecheckAt: now + RECHECK_OFFSETS[0],
    });
    return 'created' as const;
  },
});

export const recordPracticePollAttempt = internalMutation({
  args: {
    raceId: v.id('races'),
    sessionType: practiceSessionValidator,
    mode: v.union(v.literal('populate'), v.literal('reconcile')),
    error: v.optional(v.string()),
    openF1SessionKey: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('practiceResultPolls')
      .withIndex('by_raceId_and_sessionType', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )
      .unique();
    const now = Date.now();
    const status = args.error
      ? ('retrying' as const)
      : args.mode === 'reconcile'
        ? ('reconciled' as const)
        : ('published' as const);
    const value = {
      status,
      attemptCount: (existing?.attemptCount ?? 0) + 1,
      firstAttemptAt: existing?.firstAttemptAt ?? now,
      lastAttemptAt: now,
      lastSuccessAt: args.error ? existing?.lastSuccessAt : now,
      lastError: args.error,
      openF1SessionKey: args.openF1SessionKey ?? existing?.openF1SessionKey,
      updatedAt: now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, value);
    } else {
      await ctx.db.insert('practiceResultPolls', {
        raceId: args.raceId,
        sessionType: args.sessionType,
        ...value,
      });
    }
    if (args.error && args.mode === 'reconcile') {
      const result = await ctx.db
        .query('practiceResults')
        .withIndex('by_raceId_and_sessionType', (q) =>
          q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
        )
        .unique();
      if (result) {
        await ctx.db.patch(result._id, {
          lastRecheckedAt: now,
          lastRecheckError: args.error,
          nextRecheckAt: now + 30 * MINUTE,
        });
      }
    }
    return null;
  },
});

async function populateDuePractice(ctx: ActionCtx) {
  const tasks: PracticeTask[] = await ctx.runQuery(
    internal.practiceResults.getDuePracticeSessions,
    { now: Date.now() },
  );
  if (tasks.length === 0) {
    return { processed: 0, published: 0, failed: 0 };
  }

  let published = 0;
  let failed = 0;
  for (const task of tasks) {
    try {
      const result = await fetchPracticeResult(task);
      const outcome = await ctx.runMutation(
        internal.practiceResults.upsertPracticeResult,
        {
          raceId: task.raceId,
          sessionType: task.sessionType,
          mode: task.mode,
          ...result,
        },
      );
      // Only on the first classification for a session. That is the moment the
      // practice page stops being `noindex` (see the route's `head`) and
      // becomes a real page, which is the one change a search engine cannot
      // infer. Later reconciles adjust lap times on a page already in the
      // index, and pinging for those would spend quota to say very little.
      if (outcome === 'created') {
        await ctx.scheduler.runAfter(
          0,
          internal.indexNow.submitPublishedPractice,
          { raceSlug: task.raceSlug },
        );
      }
      await ctx.runMutation(
        internal.practiceResults.recordPracticePollAttempt,
        {
          raceId: task.raceId,
          sessionType: task.sessionType,
          mode: task.mode,
          openF1SessionKey: result.openF1SessionKey,
        },
      );
      published += 1;
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      await ctx.runMutation(
        internal.practiceResults.recordPracticePollAttempt,
        {
          raceId: task.raceId,
          sessionType: task.sessionType,
          mode: task.mode,
          error: message,
        },
      );
      console.error(
        `Could not populate ${task.raceName} ${task.sessionType.toUpperCase()}:`,
        message,
      );
    }
  }
  return { processed: tasks.length, published, failed };
}

/** Cron target; the same bounded sweep also drains historical sessions. */
export const pollDuePracticeResults = internalAction({
  args: {},
  handler: populateDuePractice,
});

/** Manually trigger one bounded backfill batch after deploying/seeding. */
export const backfillPracticeResults = internalAction({
  args: {},
  handler: populateDuePractice,
});

/**
 * The body of {@link getPracticeResultsForRace}, callable from another query.
 *
 * Extracted so `home.getDashboardPageData` can seed the dashboard's practice
 * card with this exact shape: the card's live subscription is this query, so
 * the SSR value and the socket's first answer must not be merely similar.
 */
export async function loadPracticeResultsForRace(
  ctx: QueryCtx,
  raceId: Id<'races'>,
) {
  const [results, drivers] = await Promise.all([
    ctx.db
      .query('practiceResults')
      .withIndex('by_raceId_and_sessionType', (q) => q.eq('raceId', raceId))
      .take(3),
    ctx.db.query('drivers').take(40),
  ]);
  const canonicalNumbers = new Set(
    drivers.flatMap((driver) =>
      driver.number === undefined ? [] : [driver.number],
    ),
  );
  return results.map((result) => ({
    sessionType: result.sessionType,
    publishedAt: result.publishedAt,
    entries: result.entries.map((entry) => ({
      ...entry,
      team: entry.team ?? null,
      isReserve: !canonicalNumbers.has(entry.driverNumber),
    })),
  }));
}

export const getPracticeResultsForRace = query({
  args: { raceId: v.id('races') },
  handler: async (ctx, args) => loadPracticeResultsForRace(ctx, args.raceId),
});

/**
 * Same payload as {@link getPracticeResultsForRace}, keyed by slug so a
 * write-up loader can fetch it in the same wave as news and weather without
 * waiting on the race document for an id.
 */
export const getPracticeResultsForRaceSlug = query({
  args: { raceSlug: v.string() },
  handler: async (ctx, args) => {
    const race = await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', args.raceSlug))
      .unique();
    if (!race) {
      return [];
    }
    return await loadPracticeResultsForRace(ctx, race._id);
  },
});

/**
 * Stable, presentation-neutral payload for social copy, share cards, and
 * editorial tooling. It intentionally contains facts rather than generated
 * prose so each channel can choose its own voice.
 */
export const getPracticeSessionSummariesForRace = query({
  args: { raceId: v.id('races') },
  handler: async (ctx, args) => {
    const race = await ctx.db.get('races', args.raceId);
    if (!race) {
      return null;
    }
    const [results, drivers] = await Promise.all([
      ctx.db
        .query('practiceResults')
        .withIndex('by_raceId_and_sessionType', (q) =>
          q.eq('raceId', args.raceId),
        )
        .take(3),
      ctx.db.query('drivers').take(40),
    ]);
    const canonicalDriverNumbers = new Set(
      drivers.flatMap((driver) =>
        driver.number === undefined ? [] : [driver.number],
      ),
    );

    return {
      race: {
        id: race._id,
        name: race.name,
        slug: race.slug,
        season: race.season,
        round: race.round,
        hashtag: race.hashtag ?? null,
        canonicalPath: `/races/${race.slug}/practice`,
      },
      sessions: buildPracticeSessionSummaries(results, canonicalDriverNumbers),
    };
  },
});

export const getAdminPracticeOperations = query({
  args: { raceId: v.id('races') },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer?.isAdmin) {
      return null;
    }
    const [results, polls] = await Promise.all([
      ctx.db
        .query('practiceResults')
        .withIndex('by_raceId_and_sessionType', (q) =>
          q.eq('raceId', args.raceId),
        )
        .take(3),
      ctx.db
        .query('practiceResultPolls')
        .withIndex('by_raceId_and_sessionType', (q) =>
          q.eq('raceId', args.raceId),
        )
        .take(3),
    ]);
    return (['fp1', 'fp2', 'fp3'] as const).map((sessionType) => {
      const result = results.find((item) => item.sessionType === sessionType);
      const poll = polls.find((item) => item.sessionType === sessionType);
      return {
        sessionType,
        result: result
          ? {
              publishedAt: result.publishedAt,
              updatedAt: result.updatedAt,
              nextRecheckAt: result.nextRecheckAt ?? null,
              lastRecheckedAt: result.lastRecheckedAt ?? null,
              lastRecheckError: result.lastRecheckError ?? null,
            }
          : null,
        poll: poll
          ? {
              status: poll.status,
              attemptCount: poll.attemptCount,
              lastAttemptAt: poll.lastAttemptAt,
              lastSuccessAt: poll.lastSuccessAt ?? null,
              lastError: poll.lastError ?? null,
            }
          : null,
      };
    });
  },
});

/** Compatibility for the mobile client while it still renders FP1 inline. */
export const getFp1ResultForRace = query({
  args: { raceId: v.id('races') },
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query('practiceResults')
      .withIndex('by_raceId_and_sessionType', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', 'fp1'),
      )
      .unique();
    return result
      ? {
          sessionType: result.sessionType,
          publishedAt: result.publishedAt,
          entries: result.entries.map((entry) => ({
            ...entry,
            team: entry.team ?? null,
          })),
        }
      : null;
  },
});

/**
 * Slugs of races that have at least one published practice session.
 *
 * The sitemap uses this to advertise only practice pages that actually have a
 * classification on them. A practice page for a session that has not run is a
 * one-line "not published yet" placeholder, and a sitemap full of those reads
 * as thin content to crawlers.
 */
export const listRaceSlugsWithPracticeResults = query({
  args: {},
  handler: async (ctx) => {
    const races = await ctx.db
      .query('races')
      .withIndex('by_season_round')
      .take(100);
    const slugs: string[] = [];
    for (const race of races) {
      const published = await ctx.db
        .query('practiceResults')
        .withIndex('by_raceId_and_sessionType', (q) => q.eq('raceId', race._id))
        .first();
      if (published) {
        slugs.push(race.slug);
      }
    }
    return slugs;
  },
});
