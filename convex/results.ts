import { v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx } from './_generated/server';
import { mutation, query } from './_generated/server';
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

export const getMyScoreForRace = query({
  args: {
    raceId: v.id('races'),
    sessionType: v.optional(sessionTypeValidator),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer) return null;

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

    if (!score) return null;

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

    if (!result) return null;

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
      updatedAt: now,
    });
  } else {
    await ctx.db.insert('seasonStandings', {
      userId,
      season,
      totalPoints,
      raceCount: raceIds.size,
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
      updatedAt: now,
    });
  }
}

export const adminPublishResults = mutation({
  args: {
    raceId: v.id('races'),
    classification: v.array(v.id('drivers')),
    sessionType: v.optional(sessionTypeValidator),
  },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));
    requireAdmin(viewer);

    if (args.classification.length < 5) {
      throw new Error('Classification must include at least top 5');
    }

    const sessionType = args.sessionType ?? 'race';
    const now = Date.now();

    // Check for existing result for this session
    const existing = await ctx.db
      .query('results')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', sessionType),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        classification: args.classification,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert('results', {
        raceId: args.raceId,
        sessionType,
        classification: args.classification,
        publishedAt: now,
        updatedAt: now,
      });
    }

    // Compute scores for everyone who predicted this session
    const predictions = await ctx.db
      .query('predictions')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', sessionType),
      )
      .collect();

    for (const pred of predictions) {
      const { total, breakdown } = scoreTopFive({
        picks: pred.picks,
        classification: args.classification,
      });

      const existingScore = await ctx.db
        .query('scores')
        .withIndex('by_user_race_session', (q) =>
          q
            .eq('userId', pred.userId)
            .eq('raceId', pred.raceId)
            .eq('sessionType', sessionType),
        )
        .unique();

      if (existingScore) {
        await ctx.db.patch(existingScore._id, {
          points: total,
          breakdown,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert('scores', {
          userId: pred.userId,
          raceId: pred.raceId,
          sessionType,
          points: total,
          breakdown,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Upsert season standings for all scored users
    const race = await ctx.db.get(args.raceId);
    const season = race?.season ?? 2026;

    const scoredUserIds = new Set(predictions.map((p) => p.userId));
    for (const userId of scoredUserIds) {
      await upsertStandings(ctx, userId, season);
    }

    // ===== H2H Auto-Scoring =====

    const matchups = await ctx.db
      .query('h2hMatchups')
      .withIndex('by_season', (q) => q.eq('season', season))
      .collect();

    // Build position map from classification
    const classificationPosition = new Map<Id<'drivers'>, number>();
    for (let i = 0; i < args.classification.length; i++) {
      classificationPosition.set(args.classification[i], i + 1);
    }

    // Determine H2H winner for each matchup and upsert h2hResults
    for (const matchup of matchups) {
      const pos1 = classificationPosition.get(matchup.driver1Id);
      const pos2 = classificationPosition.get(matchup.driver2Id);

      // If one DNF (not in classification), the other wins.
      // If both DNF, skip — no H2H result for this matchup.
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
              .eq('sessionType', sessionType)
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
            sessionType,
            matchupId: matchup._id,
            winnerId,
            publishedAt: now,
          });
        }
      }
    }

    // Score all users who submitted H2H predictions for this session
    const h2hPredictions = await ctx.db
      .query('h2hPredictions')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', sessionType),
      )
      .collect();

    // Group by userId
    const h2hByUser = new Map<Id<'users'>, typeof h2hPredictions>();
    for (const pred of h2hPredictions) {
      const userPreds = h2hByUser.get(pred.userId) ?? [];
      userPreds.push(pred);
      h2hByUser.set(pred.userId, userPreds);
    }

    // Build H2H result lookup
    const h2hResults = await ctx.db
      .query('h2hResults')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', sessionType),
      )
      .collect();
    const h2hResultMap = new Map(
      h2hResults.map((r) => [r.matchupId.toString(), r.winnerId]),
    );

    for (const [userId, userPreds] of h2hByUser) {
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
            .eq('sessionType', sessionType),
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
          sessionType,
          points,
          correctPicks,
          totalPicks,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Upsert H2H season standings for all scored users
    for (const userId of h2hByUser.keys()) {
      await upsertH2HStandings(ctx, userId, season);
    }

    // Mark race as finished only when publishing race results
    if (sessionType === 'race') {
      if (race && race.status !== 'finished') {
        await ctx.db.patch(args.raceId, { status: 'finished', updatedAt: now });
      }
    }

    return {
      ok: true,
      scoredCount: predictions.length,
      h2hScoredCount: h2hByUser.size,
    };
  },
});
