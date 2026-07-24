import type { SessionType } from '@grandprixpicks/shared/sessions';
import {
  getSessionsForWeekend,
  SESSION_LABELS_FULL,
} from '@grandprixpicks/shared/sessions';
import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import {
  internalAction,
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server';
import { getViewer, requireAdmin, requireViewer } from './lib/auth';

const MINUTE = 60_000;
const FIRST_ATTEMPT_DELAY = 35 * MINUTE;
const DEADLINE_AFTER_EXPECTED_END = 2 * 60 * MINUTE;
const RACE_LOOKBACK = 4 * 24 * 60 * MINUTE;

const sessionTypeValidator = v.union(
  v.literal('quali'),
  v.literal('sprint_quali'),
  v.literal('sprint'),
  v.literal('race'),
);

const EXPECTED_DURATION: Record<SessionType, number> = {
  sprint_quali: 45 * MINUTE,
  quali: 60 * MINUTE,
  sprint: 60 * MINUTE,
  race: 120 * MINUTE,
};

const OPEN_F1_SESSION_NAMES: Record<SessionType, ReadonlyArray<string>> = {
  sprint_quali: ['Sprint Qualifying', 'Sprint Shootout'],
  quali: ['Qualifying'],
  sprint: ['Sprint'],
  race: ['Race'],
};

type PollTask = {
  raceId: Id<'races'>;
  raceName: string;
  season: number;
  sessionType: SessionType;
  sessionStartAt: number;
  firstAttemptAt: number;
  deadlineAt: number;
  kind: 'poll' | 'timeout';
};

type OpenF1Session = {
  session_key: number;
  session_name: string;
  date_start: string;
};

type OpenF1Result = {
  driver_number: number;
  position: number;
  dnf: boolean;
  dns: boolean;
  dsq: boolean;
};

export function getFallbackWindow(
  sessionType: SessionType,
  sessionStartAt: number,
) {
  const expectedEndAt = sessionStartAt + EXPECTED_DURATION[sessionType];
  return {
    expectedEndAt,
    firstAttemptAt: expectedEndAt + FIRST_ATTEMPT_DELAY,
    deadlineAt: expectedEndAt + DEADLINE_AFTER_EXPECTED_END,
  };
}

function getSessionStarts(
  race: Pick<
    Doc<'races'>,
    | 'hasSprint'
    | 'qualiStartAt'
    | 'sprintQualiStartAt'
    | 'sprintStartAt'
    | 'raceStartAt'
  >,
): Array<{ sessionType: SessionType; sessionStartAt: number }> {
  const starts: Partial<Record<SessionType, number>> = {
    quali: race.qualiStartAt,
    sprint_quali: race.sprintQualiStartAt,
    sprint: race.sprintStartAt,
    race: race.raceStartAt,
  };

  return getSessionsForWeekend(Boolean(race.hasSprint)).flatMap(
    (sessionType) => {
      const sessionStartAt = starts[sessionType];
      return sessionStartAt === undefined
        ? []
        : [{ sessionType, sessionStartAt }];
    },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseOpenF1Sessions(value: unknown): OpenF1Session[] {
  if (!Array.isArray(value)) {
    throw new Error('OpenF1 sessions response was not an array');
  }

  return value.flatMap((item) => {
    if (
      !isRecord(item) ||
      typeof item.session_key !== 'number' ||
      typeof item.session_name !== 'string' ||
      typeof item.date_start !== 'string'
    ) {
      return [];
    }
    return [
      {
        session_key: item.session_key,
        session_name: item.session_name,
        date_start: item.date_start,
      },
    ];
  });
}

export function parseOpenF1Results(value: unknown): OpenF1Result[] {
  if (!Array.isArray(value)) {
    throw new Error('OpenF1 session result response was not an array');
  }

  const rawRows = value.map((item) => {
    if (
      !isRecord(item) ||
      typeof item.driver_number !== 'number' ||
      (typeof item.position !== 'number' && item.position !== null) ||
      typeof item.dnf !== 'boolean' ||
      typeof item.dns !== 'boolean' ||
      typeof item.dsq !== 'boolean'
    ) {
      throw new Error('OpenF1 returned an incomplete result row');
    }
    return {
      driver_number: item.driver_number,
      position: item.position,
      dnf: item.dnf,
      dns: item.dns,
      dsq: item.dsq,
    };
  });

  if (rawRows.length < 5) {
    throw new Error(
      `OpenF1 returned only ${rawRows.length} classified drivers`,
    );
  }

  const numbers = new Set(rawRows.map((row) => row.driver_number));
  const numericPositions = rawRows.flatMap((row) =>
    row.position === null ? [] : [row.position],
  );
  const positions = new Set(numericPositions);
  if (
    numbers.size !== rawRows.length ||
    positions.size !== numericPositions.length
  ) {
    throw new Error('OpenF1 returned duplicate drivers or positions');
  }
  if (
    rawRows.some(
      (row) =>
        (row.position !== null &&
          (!Number.isInteger(row.position) || row.position < 1)) ||
        !Number.isInteger(row.driver_number),
    )
  ) {
    throw new Error('OpenF1 returned an invalid driver number or position');
  }

  const classified = rawRows
    .filter(
      (row): row is typeof row & { position: number } => row.position !== null,
    )
    .sort((a, b) => a.position - b.position);
  if (classified.some((row, index) => row.position !== index + 1)) {
    throw new Error('OpenF1 returned a non-contiguous classification');
  }
  const unclassified = rawRows.filter((row) => row.position === null);
  if (unclassified.some((row) => !row.dnf && !row.dns && !row.dsq)) {
    throw new Error('OpenF1 returned a null position without a result status');
  }

  // OpenF1 leaves DNF/DNS/DSQ positions null and returns those rows after the
  // classified finishers in official order. Assign trailing positions so the
  // app can retain its full-grid classification and derive H2H winners.
  return [
    ...classified,
    ...unclassified.map((row, index) => ({
      ...row,
      position: classified.length + index + 1,
    })),
  ];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function buildSessionDiscoveryUrl(
  year: number,
  sessionStartAt: number,
): URL {
  const url = new URL('https://api.openf1.org/v1/sessions');
  url.searchParams.set('year', String(year));
  // In OpenF1's `date_start>=value` syntax, `>` is part of the parameter
  // name and `=` is the standard query delimiter.
  url.searchParams.set(
    'date_start>',
    new Date(sessionStartAt - 10 * MINUTE).toISOString(),
  );
  url.searchParams.set(
    'date_start<',
    new Date(sessionStartAt + 10 * MINUTE).toISOString(),
  );
  return url;
}

async function fetchJson(url: URL): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`OpenF1 request failed with HTTP ${response.status}`);
  }
  return (await response.json()) as unknown;
}

export const getDuePolls = internalQuery({
  args: { now: v.number() },
  handler: async (ctx, args): Promise<PollTask[]> => {
    const races = await ctx.db
      .query('races')
      .withIndex('by_raceStartAt', (q) =>
        q.gte('raceStartAt', args.now - RACE_LOOKBACK),
      )
      .take(10);
    const tasks: PollTask[] = [];

    for (const race of races) {
      if (race.status === 'cancelled') {
        continue;
      }
      for (const { sessionType, sessionStartAt } of getSessionStarts(race)) {
        const { firstAttemptAt, deadlineAt } = getFallbackWindow(
          sessionType,
          sessionStartAt,
        );
        if (args.now < firstAttemptAt) {
          continue;
        }

        const result = await ctx.db
          .query('results')
          .withIndex('by_race_session', (q) =>
            q.eq('raceId', race._id).eq('sessionType', sessionType),
          )
          .unique();
        if (result) {
          continue;
        }

        const poll = await ctx.db
          .query('openF1ResultPolls')
          .withIndex('by_raceId_and_sessionType', (q) =>
            q.eq('raceId', race._id).eq('sessionType', sessionType),
          )
          .unique();
        if (
          poll?.status === 'published' ||
          poll?.status === 'already_published' ||
          poll?.status === 'timed_out'
        ) {
          continue;
        }

        tasks.push({
          raceId: race._id,
          raceName: race.name,
          season: race.season,
          sessionType,
          sessionStartAt,
          firstAttemptAt,
          deadlineAt,
          kind: args.now > deadlineAt ? 'timeout' : 'poll',
        });
      }
    }

    return tasks.slice(0, 8);
  },
});

export const getDriverNumberMap = internalQuery({
  args: {},
  handler: async (ctx) => {
    const drivers = await ctx.db.query('drivers').take(40);
    return drivers.flatMap((driver) =>
      driver.number === undefined
        ? []
        : [{ number: driver.number, driverId: driver._id }],
    );
  },
});

export const recordAttempt = internalMutation({
  args: {
    raceId: v.id('races'),
    sessionType: sessionTypeValidator,
    firstAttemptAt: v.number(),
    deadlineAt: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('openF1ResultPolls')
      .withIndex('by_raceId_and_sessionType', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        status: 'polling',
        attemptCount: existing.attemptCount + 1,
        lastAttemptAt: now,
        lastError: undefined,
        updatedAt: now,
      });
      return;
    }
    await ctx.db.insert('openF1ResultPolls', {
      raceId: args.raceId,
      sessionType: args.sessionType,
      status: 'polling',
      attemptCount: 1,
      firstAttemptAt: args.firstAttemptAt,
      deadlineAt: args.deadlineAt,
      lastAttemptAt: now,
      updatedAt: now,
    });
  },
});

export const recordOutcome = internalMutation({
  args: {
    raceId: v.id('races'),
    sessionType: sessionTypeValidator,
    status: v.union(
      v.literal('retrying'),
      v.literal('published'),
      v.literal('already_published'),
      v.literal('timed_out'),
    ),
    error: v.optional(v.string()),
    openF1SessionKey: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('openF1ResultPolls')
      .withIndex('by_raceId_and_sessionType', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )
      .unique();
    const now = Date.now();
    if (!existing) {
      return;
    }
    await ctx.db.patch(existing._id, {
      status: args.status,
      lastError: args.error,
      openF1SessionKey: args.openF1SessionKey,
      publishedAt: args.status === 'published' ? now : undefined,
      updatedAt: now,
    });
  },
});

export const pollDueResults = internalAction({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const tasks: PollTask[] = await ctx.runQuery(
      internal.openF1Results.getDuePolls,
      { now },
    );
    if (tasks.length === 0) {
      return { processed: 0 };
    }

    const mappings: Array<{ number: number; driverId: Id<'drivers'> }> =
      await ctx.runQuery(internal.openF1Results.getDriverNumberMap, {});
    const driverByNumber = new Map(
      mappings.map(({ number, driverId }) => [number, driverId]),
    );

    for (const task of tasks) {
      await ctx.runMutation(internal.openF1Results.recordAttempt, {
        raceId: task.raceId,
        sessionType: task.sessionType,
        firstAttemptAt: task.firstAttemptAt,
        deadlineAt: task.deadlineAt,
      });

      if (task.kind === 'timeout') {
        await ctx.runMutation(internal.openF1Results.recordOutcome, {
          raceId: task.raceId,
          sessionType: task.sessionType,
          status: 'timed_out',
          error: 'No valid OpenF1 result arrived before the polling deadline',
        });
        continue;
      }

      let openF1SessionKey: number | undefined;
      try {
        const sessionsUrl = buildSessionDiscoveryUrl(
          task.season,
          task.sessionStartAt,
        );
        const sessions = parseOpenF1Sessions(await fetchJson(sessionsUrl));
        const allowedNames = OPEN_F1_SESSION_NAMES[task.sessionType];
        const session = sessions.find((candidate) =>
          allowedNames.includes(candidate.session_name),
        );
        if (!session) {
          throw new Error(
            `OpenF1 has not exposed the ${task.raceName} session yet`,
          );
        }
        openF1SessionKey = session.session_key;

        const resultsUrl = new URL('https://api.openf1.org/v1/session_result');
        resultsUrl.searchParams.set('session_key', String(session.session_key));
        const rows = parseOpenF1Results(await fetchJson(resultsUrl));
        const unmapped = rows
          .map((row) => row.driver_number)
          .filter((number) => !driverByNumber.has(number));
        if (unmapped.length > 0) {
          throw new Error(
            `Unmapped OpenF1 driver number(s): ${unmapped.join(', ')}`,
          );
        }

        const classification = rows.map(
          (row) => driverByNumber.get(row.driver_number)!,
        );
        const dnfDriverIds = rows
          .filter((row) => row.dnf || row.dns || row.dsq)
          .map((row) => driverByNumber.get(row.driver_number)!);
        const outcome: { status: 'published' | 'already_published' } =
          await ctx.runMutation(internal.results.autoPublishResults, {
            raceId: task.raceId,
            sessionType: task.sessionType,
            classification,
            dnfDriverIds,
          });
        await ctx.runMutation(internal.openF1Results.recordOutcome, {
          raceId: task.raceId,
          sessionType: task.sessionType,
          status: outcome.status,
          openF1SessionKey,
        });
      } catch (error) {
        await ctx.runMutation(internal.openF1Results.recordOutcome, {
          raceId: task.raceId,
          sessionType: task.sessionType,
          status: 'retrying',
          error: errorMessage(error).slice(0, 500),
          openF1SessionKey,
        });
      }
    }

    return { processed: tasks.length };
  },
});

/**
 * Production-safe post-deployment smoke test. Exercises Convex outbound
 * networking, the same OpenF1 session discovery/result endpoints, response
 * validation, and the deployed driver-number mapping without writing data.
 */
export const smokeTest = internalAction({
  args: { sessionKey: v.number() },
  handler: async (ctx, args) => {
    const sessionUrl = new URL('https://api.openf1.org/v1/sessions');
    sessionUrl.searchParams.set('session_key', String(args.sessionKey));
    const sessionRows = parseOpenF1Sessions(await fetchJson(sessionUrl));
    const sourceSession = sessionRows.find(
      (session) => session.session_key === args.sessionKey,
    );
    if (!sourceSession) {
      throw new Error(`OpenF1 session ${args.sessionKey} was not found`);
    }

    // Re-run the same time-window discovery used by the polling action.
    const sessionStartAt = new Date(sourceSession.date_start).getTime();
    if (!Number.isFinite(sessionStartAt)) {
      throw new Error('OpenF1 returned an invalid session start time');
    }
    const discoveryUrl = buildSessionDiscoveryUrl(
      new Date(sessionStartAt).getUTCFullYear(),
      sessionStartAt,
    );
    const discoveredSessions = parseOpenF1Sessions(
      await fetchJson(discoveryUrl),
    );
    if (
      !discoveredSessions.some(
        (session) =>
          session.session_key === args.sessionKey &&
          session.session_name === sourceSession.session_name,
      )
    ) {
      throw new Error(
        'OpenF1 time-window session discovery did not round-trip',
      );
    }

    const resultsUrl = new URL('https://api.openf1.org/v1/session_result');
    resultsUrl.searchParams.set('session_key', String(args.sessionKey));
    const results = parseOpenF1Results(await fetchJson(resultsUrl));
    const mappings: Array<{ number: number; driverId: Id<'drivers'> }> =
      await ctx.runQuery(internal.openF1Results.getDriverNumberMap, {});
    const mappedNumbers = new Set(mappings.map(({ number }) => number));
    const unmappedNumbers = results
      .map(({ driver_number }) => driver_number)
      .filter((number) => !mappedNumbers.has(number));
    if (unmappedNumbers.length > 0) {
      throw new Error(
        `Deployed drivers are missing OpenF1 number(s): ${unmappedNumbers.join(', ')}`,
      );
    }

    return {
      ok: true,
      sessionKey: args.sessionKey,
      sessionName: sourceSession.session_name,
      driverCount: results.length,
      dnfCount: results.filter((row) => row.dnf || row.dns || row.dsq).length,
      firstDriverNumber: results[0]?.driver_number ?? null,
      lastDriverNumber: results.at(-1)?.driver_number ?? null,
    };
  },
});

export const getAdminPollStatus = query({
  args: {
    raceId: v.id('races'),
    sessionType: sessionTypeValidator,
  },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getViewer(ctx));
    requireAdmin(viewer);
    const race = await ctx.db.get(args.raceId);
    if (!race) {
      return null;
    }
    const start = getSessionStarts(race).find(
      (item) => item.sessionType === args.sessionType,
    );
    if (!start) {
      return null;
    }
    const poll = await ctx.db
      .query('openF1ResultPolls')
      .withIndex('by_raceId_and_sessionType', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )
      .unique();
    const unattendedSetting = await ctx.db
      .query('unattendedResultSessions')
      .withIndex('by_raceId_and_sessionType', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )
      .unique();
    return {
      ...getFallbackWindow(args.sessionType, start.sessionStartAt),
      poll,
      unattended: unattendedSetting?.enabled ?? false,
    };
  },
});

export const adminSetUnattended = mutation({
  args: {
    raceId: v.id('races'),
    sessionType: sessionTypeValidator,
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getViewer(ctx));
    requireAdmin(viewer);
    const race = await ctx.db.get(args.raceId);
    if (!race) {
      throw new Error('Race not found');
    }
    const sessionExists = getSessionStarts(race).some(
      (item) => item.sessionType === args.sessionType,
    );
    if (!sessionExists) {
      throw new Error(
        `${SESSION_LABELS_FULL[args.sessionType]} is not part of this weekend`,
      );
    }

    if (args.enabled) {
      const result = await ctx.db
        .query('results')
        .withIndex('by_race_session', (q) =>
          q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
        )
        .unique();
      if (result) {
        throw new Error('Results have already been published for this session');
      }
    }

    const existing = await ctx.db
      .query('unattendedResultSessions')
      .withIndex('by_raceId_and_sessionType', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        updatedAt: now,
      });
      return existing._id;
    }
    return await ctx.db.insert('unattendedResultSessions', {
      raceId: args.raceId,
      sessionType: args.sessionType,
      enabled: args.enabled,
      createdAt: now,
      updatedAt: now,
    });
  },
});

/**
 * Public banner candidates. Time-window checks remain client-side so the
 * banner appears when time advances without requiring a database write.
 * Published sessions are omitted, making either manual or automatic
 * publication close the banner reactively.
 */
export const getUnattendedDelayBanners = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db
      .query('unattendedResultSessions')
      .withIndex('by_enabled', (q) => q.eq('enabled', true))
      .order('desc')
      .take(40);
    const banners: Array<{
      _id: Id<'unattendedResultSessions'>;
      message: string;
      startsAt: number;
      expiresAt: number;
      updatedAt: number;
    }> = [];

    for (const setting of settings) {
      const race = await ctx.db.get(setting.raceId);
      if (!race || race.status === 'cancelled') {
        continue;
      }
      const start = getSessionStarts(race).find(
        (item) => item.sessionType === setting.sessionType,
      );
      if (!start) {
        continue;
      }
      const result = await ctx.db
        .query('results')
        .withIndex('by_race_session', (q) =>
          q.eq('raceId', setting.raceId).eq('sessionType', setting.sessionType),
        )
        .unique();
      if (result) {
        continue;
      }
      const window = getFallbackWindow(
        setting.sessionType,
        start.sessionStartAt,
      );
      banners.push({
        _id: setting._id,
        message: `${race.name} ${SESSION_LABELS_FULL[setting.sessionType]} results will be posted around 45 minutes after the session ends.`,
        startsAt: window.expectedEndAt,
        expiresAt: window.deadlineAt,
        updatedAt: setting.updatedAt,
      });
    }

    return banners.sort((a, b) => b.startsAt - a.startsAt);
  },
});
