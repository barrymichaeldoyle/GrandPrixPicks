import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { internalMutation, mutation, query } from './_generated/server';
import {
  getOrCreateViewer,
  getViewer,
  requireAdmin,
  requireViewer,
} from './lib/auth';
import { scoreTopFive } from './lib/scoring';

type ScoreBreakdownItem = NonNullable<Doc<'scores'>['breakdown']>[number];

const sessionTypeValidator = v.union(
  v.literal('quali'),
  v.literal('sprint_quali'),
  v.literal('sprint'),
  v.literal('race'),
);

type SessionType = 'quali' | 'sprint_quali' | 'sprint' | 'race';

const BATCH_SIZE = 20;

export const getMyScoreForRace = query({
  args: {
    raceId: v.id('races'),
    sessionType: v.optional(sessionTypeValidator),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return null;
    }

    const sessionType = args.sessionType ?? 'race';

    const score = await ctx.db
      .query('scores')
      .withIndex('by_user_race_session', (q) =>
        q
          .eq('userId', viewer._id)
          .eq('raceId', args.raceId)
          .eq('sessionType', sessionType),
      )
      .unique();

    if (!score) {
      return null;
    }

    // Enrich breakdown with driver names
    const enrichedBreakdown = score.breakdown
      ? await Promise.all(
          score.breakdown.map(async (item: ScoreBreakdownItem) => {
            const driver = await ctx.db.get(item.driverId);
            return {
              ...item,
              code: driver?.code ?? '???',
              displayName: driver?.displayName ?? 'Unknown',
            };
          }),
        )
      : null;

    return {
      ...score,
      enrichedBreakdown,
    };
  },
});

export const getMyWeekendScore = query({
  args: {
    raceId: v.id('races'),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return null;
    }

    const scores = await ctx.db
      .query('scores')
      .withIndex('by_user_race_session', (q) =>
        q.eq('userId', viewer._id).eq('raceId', args.raceId),
      )
      .collect();

    if (scores.length === 0) {
      return null;
    }

    let totalPoints = 0;
    for (const s of scores) {
      totalPoints += s.points;
    }

    const race = await ctx.db.get(args.raceId);
    const totalSessions = race?.hasSprint ? 4 : 2;

    return {
      totalPoints,
      scoredSessions: scores.length,
      totalSessions,
    };
  },
});

/** Per-session scores with enriched breakdown for WeekendPredictions / race detail. */
export const getMyScoresForRace = query({
  args: { raceId: v.id('races') },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return null;
    }

    const scores = await ctx.db
      .query('scores')
      .withIndex('by_user_race_session', (q) =>
        q.eq('userId', viewer._id).eq('raceId', args.raceId),
      )
      .collect();

    if (scores.length === 0) {
      return null;
    }

    const bySession: Record<
      SessionType,
      {
        points: number;
        enrichedBreakdown: Array<
          ScoreBreakdownItem & { code: string; displayName: string }
        >;
      } | null
    > = {
      quali: null,
      sprint_quali: null,
      sprint: null,
      race: null,
    };

    for (const score of scores) {
      const enrichedBreakdown = score.breakdown
        ? await Promise.all(
            score.breakdown.map(async (item: ScoreBreakdownItem) => {
              const driver = await ctx.db.get(item.driverId);
              return {
                ...item,
                code: driver?.code ?? '???',
                displayName: driver?.displayName ?? 'Unknown',
              };
            }),
          )
        : [];
      bySession[score.sessionType] = {
        points: score.points,
        enrichedBreakdown,
      };
    }

    return bySession;
  },
});

export const getResultForRace = query({
  args: {
    raceId: v.id('races'),
    sessionType: v.optional(sessionTypeValidator),
  },
  handler: async (ctx, args) => {
    const sessionType = args.sessionType ?? 'race';

    const result = await ctx.db
      .query('results')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', sessionType),
      )
      .unique();

    if (!result) {
      return null;
    }

    // Enrich classification with driver details
    const enrichedClassification = await Promise.all(
      result.classification.map(
        async (driverId: Id<'drivers'>, index: number) => {
          const driver = await ctx.db.get(driverId);
          return {
            position: index + 1,
            driverId,
            code: driver?.code ?? '???',
            displayName: driver?.displayName ?? 'Unknown',
            number: driver?.number ?? null,
            team: driver?.team ?? null,
            nationality: driver?.nationality ?? null,
          };
        },
      ),
    );

    return {
      ...result,
      enrichedClassification,
    };
  },
});

// Get all available results for a race (for tabs)
export const getAllResultsForRace = query({
  args: { raceId: v.id('races') },
  handler: async (ctx, args) => {
    // Query using prefix of compound index
    const results = await ctx.db
      .query('results')
      .withIndex('by_race_session', (q) => q.eq('raceId', args.raceId))
      .collect();

    const sessionTypes: Array<SessionType> = [];

    for (const result of results) {
      if (!sessionTypes.includes(result.sessionType)) {
        sessionTypes.push(result.sessionType);
      }
    }

    // Sort in logical order: quali, sprint_quali, sprint, race
    const order: Array<SessionType> = [
      'quali',
      'sprint_quali',
      'sprint',
      'race',
    ];
    sessionTypes.sort((a, b) => order.indexOf(a) - order.indexOf(b));

    return sessionTypes;
  },
});

// ============ Helper functions ============

async function upsertStandings(
  ctx: MutationCtx,
  userId: Id<'users'>,
  season: number,
) {
  const now = Date.now();
  const userScores = await ctx.db
    .query('scores')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect();

  let totalPoints = 0;
  const raceIds = new Set<string>();
  for (const s of userScores) {
    totalPoints += s.points;
    raceIds.add(s.raceId);
  }

  // Read user doc for denormalized fields
  const user = await ctx.db.get(userId);

  const existing = await ctx.db
    .query('seasonStandings')
    .withIndex('by_user_season', (q) =>
      q.eq('userId', userId).eq('season', season),
    )
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      totalPoints,
      raceCount: raceIds.size,
      username: user?.username,
      avatarUrl: user?.avatarUrl,
      showOnLeaderboard: user?.showOnLeaderboard,
      updatedAt: now,
    });
  } else {
    await ctx.db.insert('seasonStandings', {
      userId,
      season,
      totalPoints,
      raceCount: raceIds.size,
      username: user?.username,
      avatarUrl: user?.avatarUrl,
      showOnLeaderboard: user?.showOnLeaderboard,
      updatedAt: now,
    });
  }
}

async function upsertH2HStandings(
  ctx: MutationCtx,
  userId: Id<'users'>,
  season: number,
) {
  const now = Date.now();
  const userScores = await ctx.db
    .query('h2hScores')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect();

  let totalPoints = 0;
  let correctPicks = 0;
  let totalPicks = 0;
  const raceIds = new Set<string>();
  for (const s of userScores) {
    totalPoints += s.points;
    correctPicks += s.correctPicks;
    totalPicks += s.totalPicks;
    raceIds.add(s.raceId);
  }

  // Read user doc for denormalized fields
  const user = await ctx.db.get(userId);

  const existing = await ctx.db
    .query('h2hSeasonStandings')
    .withIndex('by_user_season', (q) =>
      q.eq('userId', userId).eq('season', season),
    )
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      totalPoints,
      raceCount: raceIds.size,
      correctPicks,
      totalPicks,
      username: user?.username,
      avatarUrl: user?.avatarUrl,
      showOnLeaderboard: user?.showOnLeaderboard,
      updatedAt: now,
    });
  } else {
    await ctx.db.insert('h2hSeasonStandings', {
      userId,
      season,
      totalPoints,
      raceCount: raceIds.size,
      correctPicks,
      totalPicks,
      username: user?.username,
      avatarUrl: user?.avatarUrl,
      showOnLeaderboard: user?.showOnLeaderboard,
      updatedAt: now,
    });
  }
}

// ============ Admin publish (lightweight) ============

export const adminPublishResults = mutation({
  args: {
    raceId: v.id('races'),
    classification: v.array(v.id('drivers')),
    sessionType: v.optional(sessionTypeValidator),
    // Optional list of drivers who did not classify (DNF/DSQ, etc.)
    dnfDriverIds: v.optional(v.array(v.id('drivers'))),
  },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));
    requireAdmin(viewer);

    if (args.classification.length < 5) {
      throw new Error('Classification must include at least top 5');
    }

    const sessionType = args.sessionType ?? 'race';
    const now = Date.now();

    // Upsert the results document with scoringStatus: 'scoring'
    const existing = await ctx.db
      .query('results')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', sessionType),
      )
      .unique();

    let resultId: Id<'results'>;
    if (existing) {
      await ctx.db.patch(existing._id, {
        classification: args.classification,
        dnfDriverIds: args.dnfDriverIds,
        scoringStatus: 'scoring',
        updatedAt: now,
      });
      resultId = existing._id;
    } else {
      resultId = await ctx.db.insert('results', {
        raceId: args.raceId,
        sessionType,
        classification: args.classification,
        dnfDriverIds: args.dnfDriverIds,
        scoringStatus: 'scoring',
        publishedAt: now,
        updatedAt: now,
      });
    }

    const race = await ctx.db.get(args.raceId);
    const season = race?.season ?? 2026;

    // Mark race as finished only when publishing race results
    if (sessionType === 'race') {
      if (race && race.status !== 'finished') {
        await ctx.db.patch(args.raceId, { status: 'finished', updatedAt: now });
      }
    }

    // Fan out scoring into background transactions
    await ctx.scheduler.runAfter(0, internal.results.scoreTopFiveForSession, {
      raceId: args.raceId,
      sessionType,
      classification: args.classification,
      season,
      resultId,
    });

    await ctx.scheduler.runAfter(0, internal.results.scoreH2HForSession, {
      raceId: args.raceId,
      sessionType,
      classification: args.classification,
      season,
      resultId,
    });

    return {
      ok: true,
      message: 'Results published. Scoring in progress.',
    };
  },
});

// ============ Top-5 scoring fan-out ============

export const scoreTopFiveForSession = internalMutation({
  args: {
    raceId: v.id('races'),
    sessionType: sessionTypeValidator,
    classification: v.array(v.id('drivers')),
    season: v.number(),
    resultId: v.id('results'),
  },
  handler: async (ctx, args) => {
    const predictions = await ctx.db
      .query('predictions')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )
      .collect();

    if (predictions.length === 0) {
      // No predictions to score — mark complete immediately
      await ctx.scheduler.runAfter(0, internal.results.checkScoringComplete, {
        resultId: args.resultId,
        raceId: args.raceId,
        sessionType: args.sessionType,
      });
      return;
    }

    // Split into batches and schedule each
    for (let i = 0; i < predictions.length; i += BATCH_SIZE) {
      const batch = predictions.slice(i, i + BATCH_SIZE);
      const predictionIds = batch.map((p) => p._id);

      await ctx.scheduler.runAfter(0, internal.results.scoreTopFiveBatch, {
        predictionIds,
        classification: args.classification,
        raceId: args.raceId,
        sessionType: args.sessionType,
        season: args.season,
        resultId: args.resultId,
      });
    }
  },
});

export const scoreTopFiveBatch = internalMutation({
  args: {
    predictionIds: v.array(v.id('predictions')),
    classification: v.array(v.id('drivers')),
    raceId: v.id('races'),
    sessionType: sessionTypeValidator,
    season: v.number(),
    resultId: v.id('results'),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const userIds = new Set<Id<'users'>>();

    for (const predId of args.predictionIds) {
      const pred = await ctx.db.get(predId);
      if (!pred) {
        continue;
      }

      const { total, breakdown } = scoreTopFive({
        picks: pred.picks,
        classification: args.classification,
      });

      const predUser = await ctx.db.get(pred.userId);
      userIds.add(pred.userId);

      const existingScore = await ctx.db
        .query('scores')
        .withIndex('by_user_race_session', (q) =>
          q
            .eq('userId', pred.userId)
            .eq('raceId', args.raceId)
            .eq('sessionType', args.sessionType),
        )
        .unique();

      if (existingScore) {
        await ctx.db.patch(existingScore._id, {
          points: total,
          breakdown,
          username: predUser?.username,
          avatarUrl: predUser?.avatarUrl,
          showOnLeaderboard: predUser?.showOnLeaderboard,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert('scores', {
          userId: pred.userId,
          raceId: args.raceId,
          sessionType: args.sessionType,
          points: total,
          breakdown,
          username: predUser?.username,
          avatarUrl: predUser?.avatarUrl,
          showOnLeaderboard: predUser?.showOnLeaderboard,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Schedule standings update for users in this batch
    if (userIds.size > 0) {
      await ctx.scheduler.runAfter(0, internal.results.updateStandingsBatch, {
        userIds: [...userIds],
        season: args.season,
      });
    }

    // Check if all scoring is complete
    await ctx.scheduler.runAfter(0, internal.results.checkScoringComplete, {
      resultId: args.resultId,
      raceId: args.raceId,
      sessionType: args.sessionType,
    });
  },
});

export const updateStandingsBatch = internalMutation({
  args: {
    userIds: v.array(v.id('users')),
    season: v.number(),
  },
  handler: async (ctx, args) => {
    for (const userId of args.userIds) {
      await upsertStandings(ctx, userId, args.season);
    }
  },
});

// ============ H2H scoring fan-out ============

export const scoreH2HForSession = internalMutation({
  args: {
    raceId: v.id('races'),
    sessionType: sessionTypeValidator,
    classification: v.array(v.id('drivers')),
    season: v.number(),
    resultId: v.id('results'),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    const matchups = await ctx.db
      .query('h2hMatchups')
      .withIndex('by_season', (q) => q.eq('season', args.season))
      .collect();

    // Build position map from classification
    const classificationPosition = new Map<Id<'drivers'>, number>();
    for (let i = 0; i < args.classification.length; i++) {
      classificationPosition.set(args.classification[i], i + 1);
    }

    // Determine H2H winner for each matchup and upsert h2hResults
    // (bounded by team count ~10, fine in one transaction)
    for (const matchup of matchups) {
      const pos1 = classificationPosition.get(matchup.driver1Id);
      const pos2 = classificationPosition.get(matchup.driver2Id);

      let winnerId: Id<'drivers'> | null = null;
      if (pos1 !== undefined && pos2 !== undefined) {
        winnerId = pos1 < pos2 ? matchup.driver1Id : matchup.driver2Id;
      } else if (pos1 !== undefined) {
        winnerId = matchup.driver1Id;
      } else if (pos2 !== undefined) {
        winnerId = matchup.driver2Id;
      }

      if (winnerId) {
        const existingH2HResult = await ctx.db
          .query('h2hResults')
          .withIndex('by_race_session_matchup', (q) =>
            q
              .eq('raceId', args.raceId)
              .eq('sessionType', args.sessionType)
              .eq('matchupId', matchup._id),
          )
          .unique();

        if (existingH2HResult) {
          await ctx.db.patch(existingH2HResult._id, {
            winnerId,
            publishedAt: now,
          });
        } else {
          await ctx.db.insert('h2hResults', {
            raceId: args.raceId,
            sessionType: args.sessionType,
            matchupId: matchup._id,
            winnerId,
            publishedAt: now,
          });
        }
      }
    }

    // Now batch H2H prediction scoring
    const h2hPredictions = await ctx.db
      .query('h2hPredictions')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )
      .collect();

    if (h2hPredictions.length === 0) {
      return;
    }

    // Batch by prediction IDs (each batch will group by user internally)
    for (let i = 0; i < h2hPredictions.length; i += BATCH_SIZE) {
      const batch = h2hPredictions.slice(i, i + BATCH_SIZE);
      const predictionIds = batch.map((p) => p._id);

      await ctx.scheduler.runAfter(0, internal.results.scoreH2HBatch, {
        h2hPredictionIds: predictionIds,
        raceId: args.raceId,
        sessionType: args.sessionType,
        season: args.season,
      });
    }
  },
});

export const scoreH2HBatch = internalMutation({
  args: {
    h2hPredictionIds: v.array(v.id('h2hPredictions')),
    raceId: v.id('races'),
    sessionType: sessionTypeValidator,
    season: v.number(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Load H2H results for this session
    const h2hResults = await ctx.db
      .query('h2hResults')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )
      .collect();
    const h2hResultMap = new Map(
      h2hResults.map((r) => [r.matchupId.toString(), r.winnerId]),
    );

    // Group predictions by user
    const byUser = new Map<Id<'users'>, Array<Doc<'h2hPredictions'>>>();
    for (const predId of args.h2hPredictionIds) {
      const pred = await ctx.db.get(predId);
      if (!pred) {
        continue;
      }
      const userPreds = byUser.get(pred.userId) ?? [];
      userPreds.push(pred);
      byUser.set(pred.userId, userPreds);
    }

    const userIds = new Set<Id<'users'>>();

    for (const [userId, userPreds] of byUser) {
      userIds.add(userId);

      let correctPicks = 0;
      const totalPicks = userPreds.length;

      for (const pred of userPreds) {
        const actualWinner = h2hResultMap.get(pred.matchupId.toString());
        if (actualWinner && pred.predictedWinnerId === actualWinner) {
          correctPicks++;
        }
      }

      const points = correctPicks;

      const existingH2HScore = await ctx.db
        .query('h2hScores')
        .withIndex('by_user_race_session', (q) =>
          q
            .eq('userId', userId)
            .eq('raceId', args.raceId)
            .eq('sessionType', args.sessionType),
        )
        .unique();

      if (existingH2HScore) {
        await ctx.db.patch(existingH2HScore._id, {
          points,
          correctPicks,
          totalPicks,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert('h2hScores', {
          userId,
          raceId: args.raceId,
          sessionType: args.sessionType,
          points,
          correctPicks,
          totalPicks,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Schedule H2H standings update for users in this batch
    if (userIds.size > 0) {
      await ctx.scheduler.runAfter(
        0,
        internal.results.updateH2HStandingsBatch,
        {
          userIds: [...userIds],
          season: args.season,
        },
      );
    }
  },
});

export const updateH2HStandingsBatch = internalMutation({
  args: {
    userIds: v.array(v.id('users')),
    season: v.number(),
  },
  handler: async (ctx, args) => {
    for (const userId of args.userIds) {
      await upsertH2HStandings(ctx, userId, args.season);
    }
  },
});

// ============ Scoring completion check ============

export const checkScoringComplete = internalMutation({
  args: {
    resultId: v.id('results'),
    raceId: v.id('races'),
    sessionType: sessionTypeValidator,
  },
  handler: async (ctx, args) => {
    // Check if all predictions for this session have been scored
    const predictions = await ctx.db
      .query('predictions')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )
      .collect();

    for (const pred of predictions) {
      const score = await ctx.db
        .query('scores')
        .withIndex('by_user_race_session', (q) =>
          q
            .eq('userId', pred.userId)
            .eq('raceId', args.raceId)
            .eq('sessionType', args.sessionType),
        )
        .unique();

      if (!score) {
        // Not all scored yet
        return;
      }
    }

    // All predictions scored — mark result as complete
    const result = await ctx.db.get(args.resultId);
    if (result && result.scoringStatus !== 'complete') {
      await ctx.db.patch(args.resultId, {
        scoringStatus: 'complete',
        updatedAt: Date.now(),
      });

      // Schedule result notification emails (30s delay for standings to settle)
      await ctx.scheduler.runAfter(
        30_000,
        internal.notifications.sendResultEmailsForSession,
        { raceId: args.raceId, sessionType: args.sessionType },
      );
    }
  },
});

// ============ Backfill ============

/**
 * One-time backfill: populate denormalized user fields on existing rows.
 * Processes one table at a time in batches to stay within read limits.
 * Run with table arg: "seasonStandings", "h2hSeasonStandings", or "scores".
 */
export const backfillDenormalizedUserFields = internalMutation({
  args: {
    table: v.union(
      v.literal('seasonStandings'),
      v.literal('h2hSeasonStandings'),
      v.literal('scores'),
    ),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const BACKFILL_BATCH_SIZE = 500;

    // Cache user lookups within this batch
    const userCache = new Map<string, Doc<'users'> | null>();
    async function getUser(userId: Id<'users'>) {
      const cached = userCache.get(userId);
      if (cached !== undefined) {
        return cached;
      }
      const user = await ctx.db.get(userId);
      userCache.set(userId, user);
      return user;
    }

    const result = await ctx.db
      .query(args.table)
      .paginate({ numItems: BACKFILL_BATCH_SIZE, cursor: args.cursor ?? null });

    let patched = 0;
    for (const row of result.page) {
      const user = await getUser(row.userId);
      if (user) {
        await ctx.db.patch(row._id, {
          username: user.username,
          avatarUrl: user.avatarUrl,
          showOnLeaderboard: user.showOnLeaderboard,
        });
        patched++;
      }
    }

    return {
      ok: true,
      patched,
      isDone: result.isDone,
      continueCursor: result.isDone ? null : result.continueCursor,
    };
  },
});
