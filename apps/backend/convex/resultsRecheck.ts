import type { SessionType } from '@grandprixpicks/shared/sessions';
import { SESSION_LABELS_FULL } from '@grandprixpicks/shared/sessions';
import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import type { ActionCtx } from './_generated/server';
import {
  internalAction,
  internalMutation,
  internalQuery,
} from './_generated/server';
import type { DriverStatus } from '@grandprixpicks/shared/driverStatus';

import type { ClassificationMovement } from './lib/classificationDiff';
import {
  describeClassificationChange,
  resolveOfficialClassification,
} from './lib/classificationDiff';
import { nextRecheckAt } from './lib/recheckSchedule';
import {
  fetchOfficialClassification,
  getSessionStarts,
  loadDriverNumberMap,
  sleep,
} from './openF1Results';
import { publishResultsCore } from './results';

const sessionTypeValidator = v.union(
  v.literal('quali'),
  v.literal('sprint_quali'),
  v.literal('sprint'),
  v.literal('race'),
);

/** Gap between OpenF1 lookups when sweeping many sessions in one action. */
const OPEN_F1_PACING_MS = 1_500;

type RecheckTask = {
  resultId: Id<'results'>;
  raceId: Id<'races'>;
  raceName: string;
  raceSlug: string;
  season: number;
  sessionType: SessionType;
  sessionStartAt: number;
};

/** Order-independent identity for a set of driver statuses. */
function statusKey(
  entries: ReadonlyArray<{ driverId: Id<'drivers'>; status: string }>,
): string {
  return [...entries]
    .map((entry) => `${entry.driverId}:${entry.status}`)
    .sort()
    .join('|');
}

function driverLabel(
  driverId: Id<'drivers'>,
  codeById: ReadonlyMap<Id<'drivers'>, string>,
): string {
  return codeById.get(driverId) ?? 'Driver';
}

function formatPosition(position: number | null): string {
  return position === null ? 'unclassified' : `P${position}`;
}

/**
 * A short, player-facing summary of what the stewards changed, shown verbatim
 * on the race page and in the amendment notification.
 */
export function buildAmendmentNote(
  movements: ReadonlyArray<ClassificationMovement>,
  codeById: ReadonlyMap<Id<'drivers'>, string>,
): string {
  const scoringRelevant = movements
    .filter(
      (movement) => (movement.from ?? 99) <= 10 || (movement.to ?? 99) <= 10,
    )
    .sort((a, b) => (a.to ?? 99) - (b.to ?? 99))
    .slice(0, 4);

  const detail = (scoringRelevant.length > 0 ? scoringRelevant : movements)
    .slice(0, 4)
    .map(
      (movement) =>
        `${driverLabel(movement.driverId, codeById)} ${formatPosition(movement.from)} → ${formatPosition(movement.to)}`,
    )
    .join(', ');

  return detail
    ? `Updated to match the official FIA classification: ${detail}.`
    : 'Updated to match the official FIA classification.';
}

export const getDueRechecks = internalQuery({
  args: { now: v.number(), limit: v.number() },
  handler: async (ctx, args): Promise<RecheckTask[]> => {
    const due = await ctx.db
      .query('results')
      .withIndex('by_nextRecheckAt', (q) =>
        q.gt('nextRecheckAt', 0).lte('nextRecheckAt', args.now),
      )
      .take(args.limit);

    const tasks: RecheckTask[] = [];
    for (const result of due) {
      const race = await ctx.db.get(result.raceId);
      if (!race) {
        continue;
      }
      const start = getSessionStarts(race).find(
        (item) => item.sessionType === result.sessionType,
      );
      if (!start) {
        continue;
      }
      tasks.push({
        resultId: result._id,
        raceId: result.raceId,
        raceName: race.name,
        raceSlug: race.slug,
        season: race.season,
        sessionType: result.sessionType,
        sessionStartAt: start.sessionStartAt,
      });
    }
    return tasks;
  },
});

export const getPublishedSessions = internalQuery({
  args: { season: v.number() },
  handler: async (ctx, args): Promise<RecheckTask[]> => {
    const races = await ctx.db
      .query('races')
      .withIndex('by_season_round', (q) => q.eq('season', args.season))
      .take(30);

    const tasks: RecheckTask[] = [];
    for (const race of races) {
      if (race.status === 'cancelled') {
        continue;
      }
      for (const { sessionType, sessionStartAt } of getSessionStarts(race)) {
        const result = await ctx.db
          .query('results')
          .withIndex('by_race_session', (q) =>
            q.eq('raceId', race._id).eq('sessionType', sessionType),
          )
          .unique();
        if (!result) {
          continue;
        }
        tasks.push({
          resultId: result._id,
          raceId: race._id,
          raceName: race.name,
          raceSlug: race.slug,
          season: race.season,
          sessionType,
          sessionStartAt,
        });
      }
    }
    return tasks;
  },
});

type ReconcileOutcome = {
  raceName: string;
  sessionType: SessionType;
  sessionLabel: string;
  status:
    | 'in_sync'
    | 'amended'
    | 'corrected'
    | 'drifted'
    | 'needs_review'
    | 'missing';
  affectsScoring: boolean;
  /** Whether players were told about this change. */
  notified: boolean;
  /** Scoring was re-run even though the finishing order already matched. */
  rescored?: boolean;
  note?: string;
  movements: Array<{ driver: string; from: string; to: string }>;
};

/**
 * Reconcile one published session against the official classification.
 *
 * `apply: false` reports drift without touching anything (the audit path);
 * `apply: true` republishes — as a player-facing amendment when points move,
 * as a silent correction when the change is below anything we score.
 */
export const reconcileSession = internalMutation({
  args: {
    resultId: v.id('results'),
    official: v.array(v.id('drivers')),
    officialDnfDriverIds: v.array(v.id('drivers')),
    officialDriverStatuses: v.array(
      v.object({
        driverId: v.id('drivers'),
        status: v.union(
          v.literal('dnf'),
          v.literal('dns'),
          v.literal('dsq'),
          v.literal('nc'),
        ),
      }),
    ),
    apply: v.boolean(),
    advanceSchedule: v.boolean(),
    // Republish without an amendment note even when points move, so the
    // backfill of historically wrong results does not fire a notification per
    // player per session. Announce the sweep once, separately.
    silent: v.optional(v.boolean()),
    // An admin has checked the official documents and is supplying the reason
    // the feed omitted, e.g. a driver excluded from qualifying. Named drivers
    // stop counting as ambiguous and take the given status.
    acknowledgedStatuses: v.optional(
      v.array(
        v.object({
          driverCode: v.string(),
          status: v.union(
            v.literal('dnf'),
            v.literal('dns'),
            v.literal('dsq'),
            v.literal('nc'),
          ),
        }),
      ),
    ),
  },
  handler: async (ctx, args): Promise<ReconcileOutcome> => {
    const result = await ctx.db.get(args.resultId);
    if (!result) {
      return {
        raceName: 'Unknown race',
        sessionType: 'race',
        sessionLabel: SESSION_LABELS_FULL.race,
        status: 'missing',
        affectsScoring: false,
        notified: false,
        movements: [],
      };
    }

    const race = await ctx.db.get(result.raceId);
    const drivers = await ctx.db.query('drivers').take(60);
    const codeById = new Map(
      drivers.map((driver) => [driver._id, driver.code]),
    );
    const teamById = new Map(
      drivers.map((driver) => [driver._id, driver.team]),
    );
    // Statuses an admin has confirmed from the official documents, keyed by
    // driver code so the call site does not need Convex ids.
    const acknowledgedByCode = new Map(
      (args.acknowledgedStatuses ?? []).map((entry) => [
        entry.driverCode.toUpperCase(),
        entry.status,
      ]),
    );

    // The official result leaves non-starters unranked; we keep them at the
    // tail so H2H resolves. Merge before diffing so a DNS is not mistaken for
    // a disagreement about who took part.
    const resolved = resolveOfficialClassification(
      result.classification,
      args.official,
    );

    if (!resolved.ok) {
      const now = Date.now();
      const stage = (result.recheckStage ?? 0) + 1;
      await ctx.db.patch(args.resultId, {
        lastRecheckedAt: now,
        lastRecheckError: resolved.reason,
        ...(args.advanceSchedule
          ? { recheckStage: stage, nextRecheckAt: nextRecheckAt(stage, now) }
          : {}),
      });
      return {
        raceName: race?.name ?? 'Unknown race',
        sessionType: result.sessionType,
        sessionLabel: SESSION_LABELS_FULL[result.sessionType],
        status: 'needs_review',
        affectsScoring: false,
        notified: false,
        note: resolved.reason,
        movements: [],
      };
    }

    const change = describeClassificationChange(
      result.classification,
      resolved.classification,
      teamById,
    );

    const movements = change.movements.map((movement) => ({
      driver: driverLabel(movement.driverId, codeById),
      from: formatPosition(movement.from),
      to: formatPosition(movement.to),
    }));

    const now = Date.now();
    const stage = (result.recheckStage ?? 0) + 1;
    const schedule = args.advanceSchedule
      ? {
          recheckStage: stage,
          nextRecheckAt: nextRecheckAt(stage, now),
          lastRecheckedAt: now,
        }
      : { lastRecheckedAt: now };

    const base = {
      raceName: race?.name ?? 'Unknown race',
      sessionType: result.sessionType,
      sessionLabel: SESSION_LABELS_FULL[result.sessionType],
      affectsScoring: change.affectsScoring,
      notified: false,
      movements,
    };

    // Drivers the official result leaves out entirely did not start. Record
    // that explicitly rather than letting them look like tail finishers.
    const statusByDriver = new Map(
      args.officialDriverStatuses.map((entry) => [
        entry.driverId,
        entry.status,
      ]),
    );
    for (const driverId of resolved.unranked) {
      if (!statusByDriver.has(driverId)) {
        statusByDriver.set(driverId, 'dns');
      }
    }
    for (const [driverId, code] of codeById) {
      const acknowledged = acknowledgedByCode.get(code.toUpperCase());
      if (acknowledged && statusByDriver.has(driverId)) {
        statusByDriver.set(driverId, acknowledged);
      }
    }
    const driverStatuses = [...statusByDriver].map(([driverId, status]) => ({
      driverId,
      status,
    }));
    const dnfDriverIds = driverStatuses.map((entry) => entry.driverId);

    const statusesChanged =
      statusKey(result.driverStatuses ?? []) !== statusKey(driverStatuses);

    if (!change.changed) {
      // The order already matches, but a result published before we recorded
      // per-driver statuses has no way to know who failed to start, so H2H
      // cannot apply the void rule. Backfill the statuses and rescore.
      if (args.apply && statusesChanged) {
        await publishResultsCore(ctx, {
          raceId: result.raceId,
          sessionType: result.sessionType,
          classification: result.classification,
          dnfDriverIds,
          driverStatuses,
          // A reconciliation is never the moment players first see a result.
          suppressNotifications: true,
          recheckSchedule: 'keep',
        });
      }
      await ctx.db.patch(args.resultId, {
        ...schedule,
        lastRecheckError: undefined,
      });
      return {
        ...base,
        status: 'in_sync',
        rescored: args.apply && statusesChanged,
      };
    }

    // OpenF1 sometimes returns a driver with no position and no reason. That
    // is not the same as being told they retired: it may just be missing data,
    // and acting on it would demote a driver who really did classify. Report
    // the difference, but never apply it automatically.
    const ambiguouslyDemoted = args.officialDriverStatuses
      .filter((entry) => entry.status === 'nc')
      .map((entry) => entry.driverId)
      .filter(
        (driverId) =>
          !acknowledgedByCode.has(
            driverLabel(driverId, codeById).toUpperCase(),
          ) &&
          change.movements.some((movement) => movement.driverId === driverId),
      );

    if (ambiguouslyDemoted.length > 0) {
      const names = ambiguouslyDemoted
        .map((driverId) => driverLabel(driverId, codeById))
        .join(', ');
      const reason = `Official feed unranks ${names} without giving a reason, needs admin review`;
      await ctx.db.patch(args.resultId, {
        ...schedule,
        lastRecheckError: reason,
      });
      return { ...base, status: 'needs_review', note: reason };
    }

    if (!args.apply) {
      await ctx.db.patch(args.resultId, { ...schedule });
      return { ...base, status: 'drifted' };
    }

    const note =
      change.affectsScoring && !args.silent
        ? buildAmendmentNote(change.movements, codeById)
        : undefined;

    await publishResultsCore(ctx, {
      raceId: result.raceId,
      sessionType: result.sessionType,
      classification: resolved.classification,
      dnfDriverIds,
      driverStatuses,
      amendmentNote: note,
      // Never the "results are in" send; an amendment notifies separately.
      suppressNotifications: true,
      // publishResultsCore restarts the re-check schedule on every publish;
      // this publish *is* a re-check, so keep our own advanced schedule.
      recheckSchedule: 'keep',
    });

    await ctx.db.patch(args.resultId, {
      ...schedule,
      lastRecheckError: undefined,
    });

    return {
      ...base,
      rescored: true,
      status: change.affectsScoring ? 'amended' : 'corrected',
      notified: note !== undefined,
      note: note ?? buildAmendmentNote(change.movements, codeById),
    };
  },
});

export const recordRecheckFailure = internalMutation({
  args: {
    resultId: v.id('results'),
    error: v.string(),
    advanceSchedule: v.boolean(),
  },
  handler: async (ctx, args) => {
    const result = await ctx.db.get(args.resultId);
    if (!result) {
      return;
    }
    const now = Date.now();
    const stage = (result.recheckStage ?? 0) + 1;
    await ctx.db.patch(args.resultId, {
      lastRecheckedAt: now,
      lastRecheckError: args.error.slice(0, 500),
      ...(args.advanceSchedule
        ? {
            recheckStage: stage,
            nextRecheckAt: nextRecheckAt(stage, now),
          }
        : {}),
    });
  },
});

async function reconcileTasks(
  ctx: ActionCtx,
  tasks: RecheckTask[],
  options: {
    apply: boolean;
    advanceSchedule: boolean;
    silent?: boolean;
    acknowledgedStatuses?: Array<{ driverCode: string; status: DriverStatus }>;
  },
): Promise<ReconcileOutcome[]> {
  const driverByNumber = await loadDriverNumberMap(ctx);
  const outcomes: ReconcileOutcome[] = [];

  for (const [index, task] of tasks.entries()) {
    // Pace a season-wide sweep so we don't trip OpenF1's burst rate limit.
    if (index > 0) {
      await sleep(OPEN_F1_PACING_MS);
    }
    try {
      const official = await fetchOfficialClassification({
        season: task.season,
        sessionType: task.sessionType,
        sessionStartAt: task.sessionStartAt,
        raceName: task.raceName,
        driverByNumber,
      });
      const outcome: ReconcileOutcome = await ctx.runMutation(
        internal.resultsRecheck.reconcileSession,
        {
          resultId: task.resultId,
          official: official.classification,
          officialDnfDriverIds: official.dnfDriverIds,
          officialDriverStatuses: official.driverStatuses,
          apply: options.apply,
          advanceSchedule: options.advanceSchedule,
          silent: options.silent,
          acknowledgedStatuses: options.acknowledgedStatuses,
        },
      );
      outcomes.push(outcome);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (options.advanceSchedule) {
        await ctx.runMutation(internal.resultsRecheck.recordRecheckFailure, {
          resultId: task.resultId,
          error: message,
          advanceSchedule: true,
        });
      }
      outcomes.push({
        raceName: task.raceName,
        sessionType: task.sessionType,
        sessionLabel: SESSION_LABELS_FULL[task.sessionType],
        status: 'needs_review',
        affectsScoring: false,
        notified: false,
        note: message,
        movements: [],
      });
    }
  }

  return outcomes;
}

/** Cron entry point: reconcile every session whose next re-check is due. */
export const runDueRechecks = internalAction({
  args: {},
  handler: async (ctx) => {
    const tasks: RecheckTask[] = await ctx.runQuery(
      internal.resultsRecheck.getDueRechecks,
      { now: Date.now(), limit: 5 },
    );
    if (tasks.length === 0) {
      return { processed: 0, outcomes: [] };
    }

    const outcomes = await reconcileTasks(ctx, tasks, {
      apply: true,
      advanceSchedule: true,
    });
    return { processed: outcomes.length, outcomes };
  },
});

/**
 * One-off reconciliation of a whole season against the official
 * classification. Run it read-only first to see what drifted:
 *
 *   npx convex run --prod resultsRecheck:auditSeason '{"season":2026}'
 *
 * then re-run with `"apply": true` to republish the sessions it flagged.
 */
export const auditSeason = internalAction({
  args: {
    season: v.number(),
    apply: v.optional(v.boolean()),
    // Apply without notifying anyone. Use for backfills of results that were
    // wrong before the policy existed; announce the sweep once instead.
    silent: v.optional(v.boolean()),
    sessionType: v.optional(sessionTypeValidator),
    raceSlug: v.optional(v.string()),
    // Reasons an admin has confirmed from the official documents for drivers
    // the feed unranks without explanation.
    acknowledgedStatuses: v.optional(
      v.array(
        v.object({
          driverCode: v.string(),
          status: v.union(
            v.literal('dnf'),
            v.literal('dns'),
            v.literal('dsq'),
            v.literal('nc'),
          ),
        }),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const allTasks: RecheckTask[] = await ctx.runQuery(
      internal.resultsRecheck.getPublishedSessions,
      { season: args.season },
    );
    const tasks = allTasks.filter(
      (task) =>
        (!args.sessionType || task.sessionType === args.sessionType) &&
        (!args.raceSlug || task.raceSlug === args.raceSlug),
    );

    const outcomes = await reconcileTasks(ctx, tasks, {
      apply: args.apply ?? false,
      silent: args.silent ?? false,
      acknowledgedStatuses: args.acknowledgedStatuses,
      // An audit is not one of the scheduled passes, so it must not consume a
      // stage or push the next automatic re-check out.
      advanceSchedule: false,
    });

    return {
      season: args.season,
      applied: args.apply ?? false,
      silent: args.silent ?? false,
      checked: outcomes.length,
      inSync: outcomes.filter((o) => o.status === 'in_sync').length,
      rescored: outcomes.filter((o) => o.rescored).length,
      drifted: outcomes.filter(
        (o) => o.status !== 'in_sync' && o.status !== 'missing',
      ),
    };
  },
});

/**
 * Read-only. Counts the in-app notifications and feed events created inside a
 * recent window, per session, so the blast radius of a bulk rescore can be
 * measured rather than inferred from reading the code.
 */
export const inspectRescoreSideEffects = internalQuery({
  args: { season: v.number(), sinceMs: v.number() },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.sinceMs;
    const races = await ctx.db
      .query('races')
      .withIndex('by_season_round', (q) => q.eq('season', args.season))
      .take(30);

    let freshNotifications = 0;
    let freshFeedEvents = 0;
    const perSession: Array<{
      race: string;
      sessionType: SessionType;
      notifications: number;
      feedEvents: number;
    }> = [];

    for (const race of races) {
      for (const { sessionType } of getSessionStarts(race)) {
        let notifications = 0;
        for await (const notification of ctx.db
          .query('inAppNotifications')
          .withIndex('by_raceId_and_sessionType', (q) =>
            q.eq('raceId', race._id).eq('sessionType', sessionType),
          )) {
          if (notification.createdAt >= cutoff) {
            notifications += 1;
          }
        }

        let feedEvents = 0;
        for await (const event of ctx.db
          .query('feedEvents')
          .withIndex('by_race_session', (q) =>
            q.eq('raceId', race._id).eq('sessionType', sessionType),
          )) {
          if (event.createdAt >= cutoff) {
            feedEvents += 1;
          }
        }

        if (notifications > 0 || feedEvents > 0) {
          perSession.push({
            race: race.name,
            sessionType,
            notifications,
            feedEvents,
          });
          freshNotifications += notifications;
          freshFeedEvents += feedEvents;
        }
      }
    }

    return { freshNotifications, freshFeedEvents, perSession };
  },
});

/**
 * Remove "results are in" bells that a bulk rescore raised for sessions
 * players were already told about. Targets only notifications created inside
 * the window whose underlying result was published well before it, so a
 * genuine new publication is never touched.
 *
 * Defaults to a dry run; pass `"apply": true` to delete.
 */
export const cleanUpRescoreNotifications = internalMutation({
  args: {
    season: v.number(),
    sinceMs: v.number(),
    apply: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const cutoff = Date.now() - args.sinceMs;
    const races = await ctx.db
      .query('races')
      .withIndex('by_season_round', (q) => q.eq('season', args.season))
      .take(30);

    let matched = 0;
    let deleted = 0;
    const perSession: Array<{
      race: string;
      sessionType: SessionType;
      count: number;
    }> = [];

    for (const race of races) {
      for (const { sessionType } of getSessionStarts(race)) {
        const result = await ctx.db
          .query('results')
          .withIndex('by_race_session', (q) =>
            q.eq('raceId', race._id).eq('sessionType', sessionType),
          )
          .unique();
        // Only sessions whose result predates the window: anything published
        // inside it is a real new result and its bells are legitimate.
        if (!result || result.publishedAt >= cutoff) {
          continue;
        }

        let count = 0;
        for await (const notification of ctx.db
          .query('inAppNotifications')
          .withIndex('by_raceId_and_sessionType', (q) =>
            q.eq('raceId', race._id).eq('sessionType', sessionType),
          )) {
          if (
            notification.type !== 'results_published' ||
            notification.createdAt < cutoff
          ) {
            continue;
          }
          count += 1;
          matched += 1;
          if (args.apply) {
            await ctx.db.delete(notification._id);
            deleted += 1;
          }
        }

        if (count > 0) {
          perSession.push({ race: race.name, sessionType, count });
        }
      }
    }

    return { dryRun: !args.apply, matched, deleted, perSession };
  },
});
