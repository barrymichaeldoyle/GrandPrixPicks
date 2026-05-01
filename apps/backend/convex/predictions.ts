import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { getOrCreateViewer, getViewer, requireViewer } from './lib/auth';

const sessionTypeValidator = v.union(
  v.literal('quali'),
  v.literal('sprint_quali'),
  v.literal('sprint'),
  v.literal('race'),
);

type SessionType = 'quali' | 'sprint_quali' | 'sprint' | 'race';
const H2H_NUDGE_DELAY_MS = 15 * 60 * 1000;

export function shouldQueueIncompleteH2HNudge(params: {
  raceStatus: string;
  requiredSessionCount: number;
  preSessionCount: number;
  postSessionCount: number;
  alreadyQueued: boolean;
}): boolean {
  return (
    params.raceStatus === 'upcoming' &&
    !params.alreadyQueued &&
    params.preSessionCount < params.requiredSessionCount &&
    params.postSessionCount === params.requiredSessionCount
  );
}

type BreakdownItem = {
  driverId: Id<'drivers'>;
  predictedPosition: number;
  actualPosition?: number;
  points: number;
};

export const myPredictionHistory = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return [];
    }

    const predictions = [];
    for await (const prediction of ctx.db
      .query('predictions')
      .withIndex('by_user', (q) => q.eq('userId', viewer._id))) {
      predictions.push(prediction);
    }

    // Get all drivers for lookups
    const allDrivers = await ctx.db
      .query('drivers')
      .withIndex('by_code')
      .take(30);
    const driverMap = new Map(allDrivers.map((d) => [d._id, d]));

    // Group predictions by raceId
    const byRace = new Map<Id<'races'>, Array<(typeof predictions)[0]>>();
    for (const pred of predictions) {
      const existing = byRace.get(pred.raceId) ?? [];
      existing.push(pred);
      byRace.set(pred.raceId, existing);
    }

    // Build weekend summaries
    const weekends = await Promise.all(
      Array.from(byRace.entries()).map(async ([raceId, weekendPredictions]) => {
        const race = await ctx.db.get(raceId);
        if (!race) {
          return null;
        }

        // Get all scores for this race weekend
        const scores = await ctx.db
          .query('scores')
          .withIndex('by_user_race_session', (q) =>
            q.eq('userId', viewer._id).eq('raceId', raceId),
          )
          .take(8);

        // Build session predictions map
        const sessions: Record<
          SessionType,
          {
            picks: Array<{ driverId: Id<'drivers'>; code: string }>;
            points: number | null;
            breakdown: Array<BreakdownItem> | null;
            submittedAt: number;
          } | null
        > = {
          quali: null,
          sprint_quali: null,
          sprint: null,
          race: null,
        };

        for (const pred of weekendPredictions) {
          const sessionType = pred.sessionType;
          const score = scores.find((s) => s.sessionType === sessionType);

          sessions[sessionType] = {
            picks: pred.picks.map((driverId) => ({
              driverId,
              code: driverMap.get(driverId)?.code ?? '???',
            })),
            points: score?.points ?? null,
            breakdown: score?.breakdown ?? null,
            submittedAt: pred.submittedAt,
          };
        }

        // Calculate total points for weekend
        const totalPoints = Object.values(sessions).reduce(
          (sum, s) => sum + (s?.points ?? 0),
          0,
        );

        // Get latest submission time
        const latestSubmission = Math.max(
          ...weekendPredictions.map((p) => p.submittedAt),
        );

        return {
          raceId,
          raceSlug: race.slug,
          raceName: race.name,
          raceRound: race.round,
          raceStatus: race.status,
          raceDate: race.raceStartAt,
          hasSprint: race.hasSprint ?? false,
          sessions,
          totalPoints,
          hasScores: scores.length > 0,
          submittedAt: latestSubmission,
        };
      }),
    );

    // Filter nulls and sort by race date descending
    return weekends
      .filter((w): w is NonNullable<typeof w> => w !== null)
      .sort((a, b) => b.raceDate - a.raceDate);
  },
});

export const getUserPredictionHistory = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    const isOwner = viewer ? viewer._id === args.userId : false;

    const predictions = [];
    for await (const prediction of ctx.db
      .query('predictions')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))) {
      predictions.push(prediction);
    }

    const allDrivers = await ctx.db
      .query('drivers')
      .withIndex('by_code')
      .take(30);
    const driverMap = new Map(allDrivers.map((d) => [d._id, d]));

    const byRace = new Map<Id<'races'>, Array<(typeof predictions)[0]>>();
    for (const pred of predictions) {
      const existing = byRace.get(pred.raceId) ?? [];
      existing.push(pred);
      byRace.set(pred.raceId, existing);
    }

    const now = Date.now();

    const weekends = await Promise.all(
      Array.from(byRace.entries()).map(async ([raceId, weekendPredictions]) => {
        const race = await ctx.db.get(raceId);
        if (!race) {
          return null;
        }

        const scores = await ctx.db
          .query('scores')
          .withIndex('by_user_race_session', (q) =>
            q.eq('userId', args.userId).eq('raceId', raceId),
          )
          .take(8);

        const lockTimes: Record<SessionType, number | undefined> = {
          quali: race.qualiLockAt,
          sprint_quali: race.sprintQualiLockAt,
          sprint: race.sprintLockAt,
          race: race.predictionLockAt,
        };

        const sessions: Record<
          SessionType,
          {
            picks: Array<{ driverId: Id<'drivers'>; code: string }>;
            points: number | null;
            breakdown: Array<BreakdownItem> | null;
            submittedAt: number;
            isHidden: boolean;
          } | null
        > = {
          quali: null,
          sprint_quali: null,
          sprint: null,
          race: null,
        };

        for (const pred of weekendPredictions) {
          const sessionType = pred.sessionType;
          const score = scores.find((s) => s.sessionType === sessionType);
          const lockTime = lockTimes[sessionType];
          const isLocked = lockTime != null && now >= lockTime;

          if (!isOwner && !isLocked) {
            sessions[sessionType] = {
              picks: [],
              points: null,
              breakdown: null,
              submittedAt: pred.submittedAt,
              isHidden: true,
            };
          } else {
            sessions[sessionType] = {
              picks: pred.picks.map((driverId) => ({
                driverId,
                code: driverMap.get(driverId)?.code ?? '???',
              })),
              points: score?.points ?? null,
              breakdown: score?.breakdown ?? null,
              submittedAt: pred.submittedAt,
              isHidden: false,
            };
          }
        }

        const totalPoints = Object.values(sessions).reduce(
          (sum, s) => sum + (s?.points ?? 0),
          0,
        );

        const latestSubmission = Math.max(
          ...weekendPredictions.map((p) => p.submittedAt),
        );

        return {
          raceId,
          raceSlug: race.slug,
          raceName: race.name,
          raceRound: race.round,
          raceStatus: race.status,
          raceDate: race.raceStartAt,
          hasSprint: race.hasSprint ?? false,
          sessions,
          totalPoints,
          hasScores: scores.length > 0,
          submittedAt: latestSubmission,
        };
      }),
    );

    return weekends
      .filter((w): w is NonNullable<typeof w> => w !== null)
      .sort((a, b) => b.raceDate - a.raceDate);
  },
});

function assertFiveUnique(ids: Array<string>) {
  if (ids.length !== 5) {
    throw new Error('Pick exactly 5 drivers');
  }
  const set = new Set(ids);
  if (set.size !== 5) {
    throw new Error('Picks must be unique (no duplicates)');
  }
}

export const myPredictionForRace = query({
  args: {
    raceId: v.id('races'),
    sessionType: v.optional(sessionTypeValidator),
  },
  handler: async (ctx, args) => {
    // Don't throw if user doesn't exist yet - they may be newly signed in
    // and won't have a Convex user record until their first mutation
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return null;
    }

    const sessionType = args.sessionType ?? 'race';

    return await ctx.db
      .query('predictions')
      .withIndex('by_user_race_session', (q) =>
        q
          .eq('userId', viewer._id)
          .eq('raceId', args.raceId)
          .eq('sessionType', sessionType),
      )
      .unique();
  },
});

/** Get all predictions for a weekend (all session types) */
export const myWeekendPredictions = query({
  args: { raceId: v.id('races') },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return null;
    }

    const race = await ctx.db.get(args.raceId);
    if (!race) {
      return null;
    }

    // Get all predictions for this race weekend (query prefix of compound index)
    const allPredictions = await ctx.db
      .query('predictions')
      .withIndex('by_user_race_session', (q) =>
        q.eq('userId', viewer._id).eq('raceId', args.raceId),
      )
      .take(8);

    // Group by session type
    const bySession: Record<SessionType, Array<Id<'drivers'>> | null> = {
      quali: null,
      sprint_quali: null,
      sprint: null,
      race: null,
    };

    for (const pred of allPredictions) {
      bySession[pred.sessionType] = pred.picks;
    }

    return {
      hasSprint: race.hasSprint ?? false,
      predictions: bySession,
    };
  },
});

/**
 * Submit prediction for a specific session, or cascade to all sessions.
 *
 * - If sessionType is provided: only update that specific session
 * - If sessionType is omitted: cascade to all applicable sessions (quali, sprint*, race)
 */
export const submitPrediction = mutation({
  args: {
    raceId: v.id('races'),
    picks: v.array(v.id('drivers')),
    sessionType: v.optional(sessionTypeValidator),
  },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));
    const race = await ctx.db.get(args.raceId);

    if (!race) {
      throw new Error('Race not found');
    }

    const now = Date.now();
    const existingBefore = await ctx.db
      .query('predictions')
      .withIndex('by_user_race_session', (q) =>
        q.eq('userId', viewer._id).eq('raceId', args.raceId),
      )
      .take(8);

    // Only allow predictions for the next upcoming race
    const nextRace = await ctx.db
      .query('races')
      .withIndex('by_status_and_predictionLockAt', (q) =>
        q.eq('status', 'upcoming').gt('predictionLockAt', now),
      )
      .first();

    // Runtime guard: type doesn't reflect that upcomingRaces can be empty or not match
    if (!nextRace || nextRace._id !== args.raceId) {
      throw new Error('Predictions are only open for the next upcoming race');
    }

    assertFiveUnique(args.picks.map((id) => id));

    // Determine which sessions to update
    const sessionsToUpdate: Array<SessionType> = args.sessionType
      ? [args.sessionType]
      : race.hasSprint
        ? ['quali', 'sprint_quali', 'sprint', 'race']
        : ['quali', 'race'];

    // Check lock times for each session
    const lockTimes: Record<SessionType, number | undefined> = {
      quali: race.qualiLockAt,
      sprint_quali: race.sprintQualiLockAt,
      sprint: race.sprintLockAt,
      race: race.predictionLockAt,
    };

    const results: Array<Id<'predictions'>> = [];

    for (const sessionType of sessionsToUpdate) {
      const lockTime = lockTimes[sessionType];

      // Skip if session is locked (but don't fail - other sessions may still be open)
      if (lockTime && now >= lockTime) {
        if (args.sessionType) {
          // If user specifically requested this session, throw error
          throw new Error(`Predictions are locked for ${sessionType}`);
        }
        // Otherwise skip silently (cascade mode)
        continue;
      }

      // Find existing prediction for this session
      const existing = await ctx.db
        .query('predictions')
        .withIndex('by_user_race_session', (q) =>
          q
            .eq('userId', viewer._id)
            .eq('raceId', args.raceId)
            .eq('sessionType', sessionType),
        )
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          picks: args.picks,
          updatedAt: now,
        });
        results.push(existing._id);
      } else {
        const id = await ctx.db.insert('predictions', {
          userId: viewer._id,
          raceId: args.raceId,
          sessionType,
          picks: args.picks,
          submittedAt: now,
          updatedAt: now,
        });
        results.push(id);
      }
    }

    if (results.length === 0) {
      throw new Error('All sessions are locked for this race');
    }

    const requiredSessionCount = race.hasSprint ? 4 : 2;
    const preSessionCount = new Set(existingBefore.map((p) => p.sessionType))
      .size;
    const existingAfter = await ctx.db
      .query('predictions')
      .withIndex('by_user_race_session', (q) =>
        q.eq('userId', viewer._id).eq('raceId', args.raceId),
      )
      .take(8);
    const postSessionCount = new Set(existingAfter.map((p) => p.sessionType))
      .size;
    const raceSessionPrediction = existingAfter.find(
      (p) => p.sessionType === 'race',
    );
    const alreadyQueued = Boolean(
      (raceSessionPrediction as { h2hNudgeQueuedAt?: number } | undefined)
        ?.h2hNudgeQueuedAt,
    );

    // Nudge only when this submission completes the user's Top 5 weekend picks.
    if (
      raceSessionPrediction &&
      shouldQueueIncompleteH2HNudge({
        raceStatus: race.status,
        requiredSessionCount,
        preSessionCount,
        postSessionCount,
        alreadyQueued,
      })
    ) {
      await ctx.db.patch(raceSessionPrediction._id, { h2hNudgeQueuedAt: now });
      await ctx.scheduler.runAfter(
        H2H_NUDGE_DELAY_MS,
        internal.notifications.sendIncompleteH2HNudgeForUser,
        {
          raceId: args.raceId,
          userId: viewer._id,
        },
      );
    }

    return results[0]; // Return first created/updated prediction ID
  },
});

function shuffleArray<T>(array: Array<T>): Array<T> {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Randomize predictions for all sessions in one transaction.
 * Each session gets a different random top-5.
 */
export const randomizePredictions = mutation({
  args: {
    raceId: v.id('races'),
  },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));
    const race = await ctx.db.get(args.raceId);

    if (!race) {
      throw new Error('Race not found');
    }

    const now = Date.now();

    // Only allow predictions for the next upcoming race
    const nextRace = await ctx.db
      .query('races')
      .withIndex('by_status_and_predictionLockAt', (q) =>
        q.eq('status', 'upcoming').gt('predictionLockAt', now),
      )
      .first();

    if (!nextRace || nextRace._id !== args.raceId) {
      throw new Error('Predictions are only open for the next upcoming race');
    }

    const drivers = await ctx.db.query('drivers').withIndex('by_code').take(30);
    const driverIds = drivers.map((d) => d._id);

    const sessions: Array<SessionType> = race.hasSprint
      ? ['sprint_quali', 'sprint', 'quali', 'race']
      : ['quali', 'race'];

    const lockTimes: Record<SessionType, number | undefined> = {
      quali: race.qualiLockAt,
      sprint_quali: race.sprintQualiLockAt,
      sprint: race.sprintLockAt,
      race: race.predictionLockAt,
    };

    const results: Array<Id<'predictions'>> = [];

    for (const sessionType of sessions) {
      const lockTime = lockTimes[sessionType];
      if (lockTime && now >= lockTime) {
        continue;
      }

      const picks = shuffleArray(driverIds).slice(0, 5);

      const existing = await ctx.db
        .query('predictions')
        .withIndex('by_user_race_session', (q) =>
          q
            .eq('userId', viewer._id)
            .eq('raceId', args.raceId)
            .eq('sessionType', sessionType),
        )
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, { picks, updatedAt: now });
        results.push(existing._id);
      } else {
        const id = await ctx.db.insert('predictions', {
          userId: viewer._id,
          raceId: args.raceId,
          sessionType,
          picks,
          submittedAt: now,
          updatedAt: now,
        });
        results.push(id);
      }
    }

    if (results.length === 0) {
      throw new Error('All sessions are locked for this race');
    }

    return results;
  },
});
