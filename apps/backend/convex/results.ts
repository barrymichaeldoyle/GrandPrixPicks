import type { SessionType } from '@grandprixpicks/shared/sessions';
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

const BATCH_SIZE = 20;

export function summarizeH2HScore(
  predictions: Array<
    Pick<Doc<'h2hPredictions'>, 'matchupId' | 'predictedWinnerId'>
  >,
  h2hResultMap: Map<string, Id<'drivers'>>,
) {
  let correctPicks = 0;

  for (const prediction of predictions) {
    const actualWinner = h2hResultMap.get(prediction.matchupId.toString());
    if (actualWinner && prediction.predictedWinnerId === actualWinner) {
      correctPicks++;
    }
  }

  return {
    correctPicks,
    totalPicks: predictions.length,
    points: correctPicks,
  };
}

async function rollbackResultsCore(
  ctx: MutationCtx,
  args: {
    raceId: Id<'races'>;
    sessionType: SessionType;
    restoreRaceStatus?: 'upcoming' | 'locked' | 'finished';
  },
) {
  const race = await ctx.db.get(args.raceId);
  if (!race) {
    throw new Error('Race not found');
  }

  const season = race.season;
  const affectedUserIds = new Set<Id<'users'>>();
  let deletedTop5Scores = 0;
  let deletedH2HScores = 0;
  let deletedH2HResults = 0;

  for await (const score of ctx.db
    .query('scores')
    .withIndex('by_race_session', (q) =>
      q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
    )) {
    affectedUserIds.add(score.userId);
    await ctx.db.delete(score._id);
    deletedTop5Scores += 1;
  }

  for await (const score of ctx.db
    .query('h2hScores')
    .withIndex('by_race_session', (q) =>
      q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
    )) {
    affectedUserIds.add(score.userId);
    await ctx.db.delete(score._id);
    deletedH2HScores += 1;
  }

  for await (const result of ctx.db
    .query('h2hResults')
    .withIndex('by_race_session', (q) =>
      q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
    )) {
    await ctx.db.delete(result._id);
    deletedH2HResults += 1;
  }

  const result = await ctx.db
    .query('results')
    .withIndex('by_race_session', (q) =>
      q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
    )
    .unique();
  if (result) {
    await ctx.db.delete(result._id);
  }

  if (args.sessionType === 'race' && args.restoreRaceStatus) {
    await ctx.db.patch(args.raceId, {
      status: args.restoreRaceStatus,
      updatedAt: Date.now(),
    });
  }

  // Clean up feed events for this session
  await ctx.scheduler.runAfter(0, internal.feed.deleteFeedEventsForSession, {
    raceId: args.raceId,
    sessionType: args.sessionType,
  });

  for (const userId of affectedUserIds) {
    await upsertStandings(ctx, userId, season);
    await upsertH2HStandings(ctx, userId, season);
  }

  return {
    ok: true,
    deleted: {
      result: result ? 1 : 0,
      top5Scores: deletedTop5Scores,
      h2hResults: deletedH2HResults,
      h2hScores: deletedH2HScores,
    },
    raceStatus:
      args.sessionType === 'race'
        ? (args.restoreRaceStatus ?? race.status)
        : race.status,
  };
}

async function publishResultsCore(
  ctx: MutationCtx,
  args: {
    raceId: Id<'races'>;
    classification: Array<Id<'drivers'>>;
    sessionType?: SessionType;
    dnfDriverIds?: Array<Id<'drivers'>>;
    suppressNotifications?: boolean;
  },
) {
  if (args.classification.length < 5) {
    throw new Error('Classification must include at least top 5');
  }

  const sessionType = args.sessionType ?? 'race';
  const now = Date.now();

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

  if (sessionType === 'race') {
    if (race && race.status !== 'finished') {
      await ctx.db.patch(args.raceId, { status: 'finished', updatedAt: now });
    }
  }

  await ctx.scheduler.runAfter(0, internal.results.scoreTopFiveForSession, {
    raceId: args.raceId,
    sessionType,
    classification: args.classification,
    season,
    resultId,
    suppressNotifications: args.suppressNotifications ?? false,
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
}

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
      .take(8);

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
      .take(8);

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
      .take(8);

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

/** Top-5 actual classification per session for showing "actual result" next to picks (e.g. WeekendPredictions). */
export const getEnrichedTop5BySession = query({
  args: { raceId: v.id('races') },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query('results')
      .withIndex('by_race_session', (q) => q.eq('raceId', args.raceId))
      .take(8);

    const bySession: Partial<
      Record<
        SessionType,
        Array<{
          position: number;
          driverId: Id<'drivers'>;
          code: string;
          displayName: string;
          number: number | null;
          team: string | null;
          nationality: string | null;
        }>
      >
    > = {};

    for (const result of results) {
      const top5 = result.classification.slice(0, 5);
      const enriched = await Promise.all(
        top5.map(async (driverId: Id<'drivers'>, index: number) => {
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
        }),
      );
      bySession[result.sessionType] = enriched;
    }

    return bySession;
  },
});

/** Rank the authenticated user among all players for a specific race weekend. */
export const getRaceRank = query({
  args: { raceId: v.id('races') },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return null;
    }

    // Get all scores for this race
    const pointsByUser = new Map<string, number>();
    for await (const score of ctx.db
      .query('scores')
      .withIndex('by_race_session', (q) => q.eq('raceId', args.raceId))) {
      const current = pointsByUser.get(score.userId) ?? 0;
      pointsByUser.set(score.userId, current + score.points);
    }

    if (pointsByUser.size === 0) {
      return null;
    }

    const viewerPoints = pointsByUser.get(viewer._id);
    if (viewerPoints === undefined) {
      return null;
    }

    // Count users with more points
    let higherCount = 0;
    for (const points of pointsByUser.values()) {
      if (points > viewerPoints) {
        higherCount++;
      }
    }

    return {
      position: higherCount + 1,
      totalPlayers: pointsByUser.size,
    };
  },
});

// ============ Helper functions ============

async function upsertStandings(
  ctx: MutationCtx,
  userId: Id<'users'>,
  season: number,
) {
  const now = Date.now();
  let totalPoints = 0;
  const raceIds = new Set<string>();
  for await (const s of ctx.db
    .query('scores')
    .withIndex('by_user', (q) => q.eq('userId', userId))) {
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
      displayName: user?.displayName,
      avatarUrl: user?.avatarUrl,
      updatedAt: now,
    });
  } else {
    await ctx.db.insert('seasonStandings', {
      userId,
      season,
      totalPoints,
      raceCount: raceIds.size,
      username: user?.username,
      displayName: user?.displayName,
      avatarUrl: user?.avatarUrl,
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
  let totalPoints = 0;
  let correctPicks = 0;
  let totalPicks = 0;
  const raceIds = new Set<string>();
  for await (const s of ctx.db
    .query('h2hScores')
    .withIndex('by_user', (q) => q.eq('userId', userId))) {
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
      displayName: user?.displayName,
      avatarUrl: user?.avatarUrl,
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
      displayName: user?.displayName,
      avatarUrl: user?.avatarUrl,
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
    suppressNotifications: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));
    requireAdmin(viewer);
    return publishResultsCore(ctx, args);
  },
});

export const emergencyPublishResults = mutation({
  args: {
    raceId: v.id('races'),
    classification: v.array(v.id('drivers')),
    sessionType: v.optional(sessionTypeValidator),
    dnfDriverIds: v.optional(v.array(v.id('drivers'))),
    suppressNotifications: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => publishResultsCore(ctx, args),
});

export const adminRollbackResults = mutation({
  args: {
    raceId: v.id('races'),
    sessionType: sessionTypeValidator,
    restoreRaceStatus: v.optional(
      v.union(
        v.literal('upcoming'),
        v.literal('locked'),
        v.literal('finished'),
      ),
    ),
  },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));
    requireAdmin(viewer);
    return rollbackResultsCore(ctx, args);
  },
});

export const emergencyRollbackResults = mutation({
  args: {
    raceId: v.id('races'),
    sessionType: sessionTypeValidator,
    restoreRaceStatus: v.optional(
      v.union(
        v.literal('upcoming'),
        v.literal('locked'),
        v.literal('finished'),
      ),
    ),
  },
  handler: async (ctx, args) => rollbackResultsCore(ctx, args),
});

// ============ Top-5 scoring fan-out ============

export const scoreTopFiveForSession = internalMutation({
  args: {
    raceId: v.id('races'),
    sessionType: sessionTypeValidator,
    classification: v.array(v.id('drivers')),
    season: v.number(),
    resultId: v.id('results'),
    suppressNotifications: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let hasPredictions = false;
    let batch: Id<'predictions'>[] = [];

    for await (const prediction of ctx.db
      .query('predictions')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )) {
      hasPredictions = true;
      batch.push(prediction._id);

      if (batch.length < BATCH_SIZE) {
        continue;
      }

      await ctx.scheduler.runAfter(0, internal.results.scoreTopFiveBatch, {
        predictionIds: batch,
        classification: args.classification,
        raceId: args.raceId,
        sessionType: args.sessionType,
        season: args.season,
        resultId: args.resultId,
        suppressNotifications: args.suppressNotifications ?? false,
      });
      batch = [];
    }

    if (!hasPredictions) {
      // No predictions to score — mark complete immediately
      await ctx.scheduler.runAfter(0, internal.results.checkScoringComplete, {
        resultId: args.resultId,
        raceId: args.raceId,
        sessionType: args.sessionType,
        suppressNotifications: args.suppressNotifications ?? false,
      });
      return;
    }

    if (batch.length > 0) {
      await ctx.scheduler.runAfter(0, internal.results.scoreTopFiveBatch, {
        predictionIds: batch,
        classification: args.classification,
        raceId: args.raceId,
        sessionType: args.sessionType,
        season: args.season,
        resultId: args.resultId,
        suppressNotifications: args.suppressNotifications ?? false,
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
    suppressNotifications: v.optional(v.boolean()),
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
          displayName: predUser?.displayName,
          avatarUrl: predUser?.avatarUrl,
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
          displayName: predUser?.displayName,
          avatarUrl: predUser?.avatarUrl,
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
      suppressNotifications: args.suppressNotifications ?? false,
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

    // Build position map from classification
    const classificationPosition = new Map<Id<'drivers'>, number>();
    for (let i = 0; i < args.classification.length; i++) {
      classificationPosition.set(args.classification[i], i + 1);
    }

    // Determine H2H winner for each matchup and upsert h2hResults
    // (bounded by team count ~10, fine in one transaction)
    for await (const matchup of ctx.db
      .query('h2hMatchups')
      .withIndex('by_season', (q) => q.eq('season', args.season))) {
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
    let hasPredictions = false;
    let batch: Id<'h2hPredictions'>[] = [];
    for await (const prediction of ctx.db
      .query('h2hPredictions')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )) {
      hasPredictions = true;
      batch.push(prediction._id);

      if (batch.length < BATCH_SIZE) {
        continue;
      }

      await ctx.scheduler.runAfter(0, internal.results.scoreH2HBatch, {
        h2hPredictionIds: batch,
        raceId: args.raceId,
        sessionType: args.sessionType,
        season: args.season,
      });
      batch = [];
    }

    if (!hasPredictions) {
      return;
    }

    if (batch.length > 0) {
      await ctx.scheduler.runAfter(0, internal.results.scoreH2HBatch, {
        h2hPredictionIds: batch,
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
    const h2hResultMap = new Map<string, Id<'drivers'>>();
    for await (const result of ctx.db
      .query('h2hResults')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )) {
      h2hResultMap.set(result.matchupId.toString(), result.winnerId);
    }

    // Only use the batch to discover affected users. The canonical score for a
    // user/session must always be computed from that user's full prediction set,
    // otherwise later batches overwrite earlier totals with partial counts.
    const affectedUserIds = new Set<Id<'users'>>();
    for (const predId of args.h2hPredictionIds) {
      const pred = await ctx.db.get(predId);
      if (!pred) {
        continue;
      }
      affectedUserIds.add(pred.userId);
    }

    const userIds = new Set<Id<'users'>>();

    for (const userId of affectedUserIds) {
      userIds.add(userId);

      const userPredictions: Array<
        Pick<Doc<'h2hPredictions'>, 'matchupId' | 'predictedWinnerId'>
      > = [];
      for await (const prediction of ctx.db
        .query('h2hPredictions')
        .withIndex('by_user_race_session', (q) =>
          q
            .eq('userId', userId)
            .eq('raceId', args.raceId)
            .eq('sessionType', args.sessionType),
        )) {
        userPredictions.push(prediction);
      }
      const { correctPicks, totalPicks, points } = summarizeH2HScore(
        userPredictions,
        h2hResultMap,
      );

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
    suppressNotifications: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // Check if all predictions for this session have been scored
    for await (const pred of ctx.db
      .query('predictions')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )) {
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

      // Write activity feed events for this session's scores
      await ctx.scheduler.runAfter(0, internal.feed.writeFeedEventsForSession, {
        raceId: args.raceId,
        sessionType: args.sessionType,
      });

      // Check for streak milestones (race sessions only)
      if (args.sessionType === 'race') {
        const raceDoc = await ctx.db.get(args.raceId);
        if (raceDoc) {
          await ctx.scheduler.runAfter(
            0,
            internal.feed.writeStreakEventsForRaceSession,
            { raceId: args.raceId, season: raceDoc.season },
          );
        }
      }

      if (!args.suppressNotifications && !result.notificationsSent) {
        await ctx.db.patch(args.resultId, { notificationsSent: true });

        // Schedule result notification emails (30s delay for standings to settle)
        await ctx.scheduler.runAfter(
          30_000,
          internal.notifications.sendResultEmailsForSession,
          { raceId: args.raceId, sessionType: args.sessionType },
        );

        // Schedule push notifications for results
        await ctx.scheduler.runAfter(
          30_000,
          internal.push.sendPushResultsForSession,
          { raceId: args.raceId, sessionType: args.sessionType },
        );
      }
    }
  },
});
