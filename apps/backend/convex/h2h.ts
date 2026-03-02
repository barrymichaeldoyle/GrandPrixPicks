import type { SessionType } from '@grandprixpicks/shared/sessions';
import { v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import {
  getOrCreateViewer,
  getViewer,
  requireAdmin,
  requireViewer,
} from './lib/auth';

const sessionTypeValidator = v.union(
  v.literal('quali'),
  v.literal('sprint_quali'),
  v.literal('sprint'),
  v.literal('race'),
);

function getWeekendSessions(hasSprint: boolean): Array<SessionType> {
  return hasSprint
    ? ['quali', 'sprint_quali', 'sprint', 'race']
    : ['quali', 'race'];
}

export function resolveH2HSessionsToUpdate(params: {
  hasSprint: boolean;
  requestedSessionType?: SessionType;
  hasExistingPredictionsForRace: boolean;
}): Array<SessionType> {
  const allSessions = getWeekendSessions(params.hasSprint);

  // First-time H2H submit should always seed the full weekend, even if
  // client sends a specific session.
  if (!params.hasExistingPredictionsForRace) {
    return allSessions;
  }

  if (params.requestedSessionType) {
    return [params.requestedSessionType];
  }

  return allSessions;
}

// ───────────────────────── Queries ─────────────────────────

export const getMatchupsForSeason = query({
  args: { season: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const season = args.season ?? 2026;

    const matchups = await ctx.db
      .query('h2hMatchups')
      .withIndex('by_season', (q) => q.eq('season', season))
      .collect();

    const enriched = await Promise.all(
      matchups.map(async (m) => {
        const driver1 = await ctx.db.get(m.driver1Id);
        const driver2 = await ctx.db.get(m.driver2Id);
        return {
          _id: m._id,
          team: m.team,
          driver1: {
            _id: m.driver1Id,
            code: driver1?.code ?? '???',
            displayName: driver1?.displayName ?? 'Unknown',
            number: driver1?.number ?? null,
            team: driver1?.team ?? null,
            nationality: driver1?.nationality ?? null,
          },
          driver2: {
            _id: m.driver2Id,
            code: driver2?.code ?? '???',
            displayName: driver2?.displayName ?? 'Unknown',
            number: driver2?.number ?? null,
            team: driver2?.team ?? null,
            nationality: driver2?.nationality ?? null,
          },
        };
      }),
    );

    return enriched;
  },
});

export const myH2HPredictionsForRace = query({
  args: { raceId: v.id('races') },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return null;
    }

    const predictions = await ctx.db
      .query('h2hPredictions')
      .withIndex('by_user_race_session', (q) =>
        q.eq('userId', viewer._id).eq('raceId', args.raceId),
      )
      .collect();

    // Group by sessionType → { [matchupId]: predictedWinnerId }
    const bySession: Record<SessionType, Record<string, Id<'drivers'>> | null> =
      {
        quali: null,
        sprint_quali: null,
        sprint: null,
        race: null,
      };

    for (const pred of predictions) {
      if (!bySession[pred.sessionType]) {
        bySession[pred.sessionType] = {};
      }
      bySession[pred.sessionType]![pred.matchupId] = pred.predictedWinnerId;
    }

    return bySession;
  },
});

export const getH2HResultsForRace = query({
  args: {
    raceId: v.id('races'),
    sessionType: v.optional(sessionTypeValidator),
  },
  handler: async (ctx, args) => {
    const sessionType = args.sessionType ?? 'race';

    const results = await ctx.db
      .query('h2hResults')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', sessionType),
      )
      .collect();

    if (results.length === 0) {
      return null;
    }

    const enriched = await Promise.all(
      results.map(async (r) => {
        const matchup = await ctx.db.get(r.matchupId);
        const winner = await ctx.db.get(r.winnerId);
        const driver1 = matchup ? await ctx.db.get(matchup.driver1Id) : null;
        const driver2 = matchup ? await ctx.db.get(matchup.driver2Id) : null;

        function enrichDriver(d: typeof driver1) {
          return d
            ? {
                _id: d._id,
                code: d.code,
                displayName: d.displayName,
                number: d.number ?? null,
                team: d.team ?? null,
                nationality: d.nationality ?? null,
              }
            : null;
        }

        return {
          matchupId: r.matchupId,
          team: matchup?.team ?? 'Unknown',
          winnerId: r.winnerId,
          winnerCode: winner?.code ?? '???',
          driver1: enrichDriver(driver1),
          driver2: enrichDriver(driver2),
        };
      }),
    );

    return enriched;
  },
});

export const getMyH2HScoreForRace = query({
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

    return await ctx.db
      .query('h2hScores')
      .withIndex('by_user_race_session', (q) =>
        q
          .eq('userId', viewer._id)
          .eq('raceId', args.raceId)
          .eq('sessionType', sessionType),
      )
      .unique();
  },
});

export const getMyH2HWeekendScore = query({
  args: { raceId: v.id('races') },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return null;
    }

    const scores = await ctx.db
      .query('h2hScores')
      .withIndex('by_user', (q) => q.eq('userId', viewer._id))
      .collect();

    const forRace = scores.filter((s) => s.raceId === args.raceId);

    if (forRace.length === 0) {
      return null;
    }

    const totalPoints = forRace.reduce((sum, s) => sum + s.points, 0);
    return { totalPoints };
  },
});

export const getH2HSeasonLeaderboard = query({
  args: {
    season: v.optional(v.number()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    const season = args.season ?? 2026;
    const MAX_LIMIT = 100;
    const limit = Math.min(MAX_LIMIT, Math.max(1, args.limit ?? 50));
    const offset = Math.max(0, args.offset ?? 0);

    const standings = await ctx.db
      .query('h2hSeasonStandings')
      .withIndex('by_season_points', (q) => q.eq('season', season))
      .collect();

    const allRows = standings.sort((a, b) => b.totalPoints - a.totalPoints);

    let viewerEntry: {
      rank: number;
      userId: Id<'users'>;
      username: string;
      points: number;
      raceCount: number;
      correctPicks: number;
      totalPicks: number;
      isViewer: boolean;
    } | null = null;

    if (viewer) {
      const viewerIndex = allRows.findIndex((r) => r.userId === viewer._id);
      if (viewerIndex !== -1) {
        const viewerRow = allRows[viewerIndex];
        viewerEntry = {
          rank: viewerIndex + 1,
          userId: viewer._id,
          username: viewer.username ?? 'Anonymous',
          points: viewerRow.totalPoints,
          raceCount: viewerRow.raceCount,
          correctPicks: viewerRow.correctPicks,
          totalPicks: viewerRow.totalPicks,
          isViewer: true,
        };
      }
    }

    // Filter out users who opted out of leaderboard (but always include viewer)
    const privacyMap = new Map<string, boolean>();
    for (const row of allRows) {
      if (viewer && row.userId === viewer._id) {
        continue;
      }
      const user = await ctx.db.get(row.userId);
      privacyMap.set(row.userId, user?.showOnLeaderboard !== false);
    }

    const rows = allRows.filter((row) => {
      if (viewer && row.userId === viewer._id) {
        return true;
      }
      return privacyMap.get(row.userId) !== false;
    });

    const paginatedRows = rows.slice(offset, offset + limit);
    const hasMore = offset + limit < rows.length;

    // Only read user docs for the paginated page
    const enrichedRows = await Promise.all(
      paginatedRows.map(async (row, index) => {
        const user = await ctx.db.get(row.userId);
        const isViewer = viewer ? row.userId === viewer._id : false;
        return {
          rank: offset + index + 1,
          userId: row.userId,
          username: user?.username ?? 'Anonymous',
          avatarUrl: user?.avatarUrl,
          points: row.totalPoints,
          raceCount: row.raceCount,
          correctPicks: row.correctPicks,
          totalPicks: row.totalPicks,
          isViewer,
        };
      }),
    );

    return {
      entries: enrichedRows,
      totalCount: rows.length,
      hasMore,
      viewerEntry,
    };
  },
});

export const myH2HPredictionHistory = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return [];
    }

    const h2hScores = await ctx.db
      .query('h2hScores')
      .withIndex('by_user', (q) => q.eq('userId', viewer._id))
      .collect();

    // Group by raceId
    const byRace = new Map<Id<'races'>, Array<(typeof h2hScores)[number]>>();
    for (const score of h2hScores) {
      const existing = byRace.get(score.raceId) ?? [];
      existing.push(score);
      byRace.set(score.raceId, existing);
    }

    const weekends = await Promise.all(
      Array.from(byRace.entries()).map(async ([raceId, scores]) => {
        const race = await ctx.db.get(raceId);
        if (!race) {
          return null;
        }

        const sessions: Record<
          SessionType,
          { correctPicks: number; totalPicks: number; points: number } | null
        > = {
          quali: null,
          sprint_quali: null,
          sprint: null,
          race: null,
        };

        let totalPoints = 0;
        for (const score of scores) {
          sessions[score.sessionType] = {
            correctPicks: score.correctPicks,
            totalPicks: score.totalPicks,
            points: score.points,
          };
          totalPoints += score.points;
        }

        return {
          raceId,
          raceName: race.name,
          raceRound: race.round,
          raceDate: race.raceStartAt,
          hasSprint: race.hasSprint ?? false,
          sessions,
          totalPoints,
        };
      }),
    );

    return weekends
      .filter((w): w is NonNullable<typeof w> => w !== null)
      .sort((a, b) => b.raceDate - a.raceDate);
  },
});

/** Returns which races have H2H picks (for showing on My Predictions before results). */
export const myH2HPicksByRace = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return [];
    }

    const predictions = await ctx.db
      .query('h2hPredictions')
      .withIndex('by_user_race_session', (q) => q.eq('userId', viewer._id))
      .collect();

    const byRace = new Map<Id<'races'>, Record<SessionType, boolean>>();
    for (const pred of predictions) {
      let sessions = byRace.get(pred.raceId);
      if (!sessions) {
        sessions = {
          quali: false,
          sprint_quali: false,
          sprint: false,
          race: false,
        };
        byRace.set(pred.raceId, sessions);
      }
      sessions[pred.sessionType] = true;
    }

    return Array.from(byRace.entries()).map(([raceId, sessions]) => ({
      raceId,
      sessions,
    }));
  },
});

export const getUserH2HPredictionHistory = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const h2hScores = await ctx.db
      .query('h2hScores')
      .withIndex('by_user', (q) => q.eq('userId', args.userId))
      .collect();

    const byRace = new Map<Id<'races'>, Array<(typeof h2hScores)[number]>>();
    for (const score of h2hScores) {
      const existing = byRace.get(score.raceId) ?? [];
      existing.push(score);
      byRace.set(score.raceId, existing);
    }

    const weekends = await Promise.all(
      Array.from(byRace.entries()).map(async ([raceId, scores]) => {
        const race = await ctx.db.get(raceId);
        if (!race) {
          return null;
        }

        const sessions: Record<
          SessionType,
          { correctPicks: number; totalPicks: number; points: number } | null
        > = {
          quali: null,
          sprint_quali: null,
          sprint: null,
          race: null,
        };

        let totalPoints = 0;
        for (const score of scores) {
          sessions[score.sessionType] = {
            correctPicks: score.correctPicks,
            totalPicks: score.totalPicks,
            points: score.points,
          };
          totalPoints += score.points;
        }

        return {
          raceId,
          raceName: race.name,
          raceRound: race.round,
          raceDate: race.raceStartAt,
          hasSprint: race.hasSprint ?? false,
          sessions,
          totalPoints,
        };
      }),
    );

    return weekends
      .filter((w): w is NonNullable<typeof w> => w !== null)
      .sort((a, b) => b.raceDate - a.raceDate);
  },
});

export const getUserH2HPicksByRace = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    const isOwner = viewer ? viewer._id === args.userId : false;

    const predictions = await ctx.db
      .query('h2hPredictions')
      .withIndex('by_user_race_session', (q) => q.eq('userId', args.userId))
      .collect();

    const now = Date.now();
    const byRace = new Map<Id<'races'>, Record<SessionType, boolean>>();

    for (const pred of predictions) {
      // Check lock time to determine visibility for non-owners
      if (!isOwner) {
        const race = await ctx.db.get(pred.raceId);
        if (race) {
          const lockTimes: Record<SessionType, number | undefined> = {
            quali: race.qualiLockAt,
            sprint_quali: race.sprintQualiLockAt,
            sprint: race.sprintLockAt,
            race: race.predictionLockAt,
          };
          const lockTime = lockTimes[pred.sessionType];
          if (!lockTime || now < lockTime) {
            continue;
          }
        }
      }

      let sessions = byRace.get(pred.raceId);
      if (!sessions) {
        sessions = {
          quali: false,
          sprint_quali: false,
          sprint: false,
          race: false,
        };
        byRace.set(pred.raceId, sessions);
      }
      sessions[pred.sessionType] = true;
    }

    return Array.from(byRace.entries()).map(([raceId, sessions]) => ({
      raceId,
      sessions,
    }));
  },
});

export const getUserH2HDetailedPicks = query({
  args: { userId: v.id('users'), raceId: v.id('races') },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    const isOwner = viewer ? viewer._id === args.userId : false;

    const race = await ctx.db.get(args.raceId);
    if (!race) {
      return null;
    }

    const now = Date.now();

    const lockTimes: Record<SessionType, number | undefined> = {
      quali: race.qualiLockAt,
      sprint_quali: race.sprintQualiLockAt,
      sprint: race.sprintLockAt,
      race: race.predictionLockAt,
    };

    // Fetch predictions for this user+race
    const predictions = await ctx.db
      .query('h2hPredictions')
      .withIndex('by_user_race_session', (q) =>
        q.eq('userId', args.userId).eq('raceId', args.raceId),
      )
      .collect();

    if (predictions.length === 0) {
      return null;
    }

    // Fetch results for this race (all sessions)
    const allResults = await ctx.db
      .query('h2hResults')
      .withIndex('by_race_session', (q) => q.eq('raceId', args.raceId))
      .collect();

    // Fetch matchups for season 2026
    const matchups = await ctx.db
      .query('h2hMatchups')
      .withIndex('by_season', (q) => q.eq('season', race.season))
      .collect();

    // Build driver cache
    const driverIds = new Set<string>();
    for (const m of matchups) {
      driverIds.add(m.driver1Id);
      driverIds.add(m.driver2Id);
    }
    const driverCache = new Map<
      string,
      {
        _id: Id<'drivers'>;
        code: string;
        displayName: string;
        number: number | null;
        team: string | null;
        nationality: string | null;
      }
    >();
    for (const id of driverIds) {
      const d = await ctx.db.get(id as Id<'drivers'>);
      if (d) {
        driverCache.set(id, {
          _id: d._id,
          code: d.code,
          displayName: d.displayName,
          number: d.number ?? null,
          team: d.team ?? null,
          nationality: d.nationality ?? null,
        });
      }
    }

    // Index results by session+matchup
    const resultsByKey = new Map<string, Id<'drivers'>>();
    for (const r of allResults) {
      resultsByKey.set(`${r.sessionType}:${r.matchupId}`, r.winnerId);
    }

    // Index matchups by id
    const matchupById = new Map<string, (typeof matchups)[number]>();
    for (const m of matchups) {
      matchupById.set(m._id, m);
    }

    // Group predictions by session
    const predictionsBySession = new Map<
      SessionType,
      Array<(typeof predictions)[number]>
    >();
    for (const pred of predictions) {
      const arr = predictionsBySession.get(pred.sessionType) ?? [];
      arr.push(pred);
      predictionsBySession.set(pred.sessionType, arr);
    }

    const result: Record<
      SessionType,
      Array<{
        matchupId: Id<'h2hMatchups'>;
        team: string;
        driver1: NonNullable<ReturnType<typeof driverCache.get>>;
        driver2: NonNullable<ReturnType<typeof driverCache.get>>;
        predictedWinnerId: Id<'drivers'>;
        actualWinnerId: Id<'drivers'> | null;
        isCorrect: boolean | null;
      }> | null
    > = {
      quali: null,
      sprint_quali: null,
      sprint: null,
      race: null,
    };

    for (const [sessionType, sessionPredictions] of predictionsBySession) {
      // Visibility check: non-owner can't see picks before lock
      const lockTime = lockTimes[sessionType];
      if (!isOwner && (!lockTime || now < lockTime)) {
        // Hidden — leave as null
        continue;
      }

      const picks = [];
      for (const pred of sessionPredictions) {
        const matchup = matchupById.get(pred.matchupId);
        if (!matchup) {
          continue;
        }

        const d1 = driverCache.get(matchup.driver1Id);
        const d2 = driverCache.get(matchup.driver2Id);
        if (!d1 || !d2) {
          continue;
        }

        const actualWinnerId =
          resultsByKey.get(`${sessionType}:${pred.matchupId}`) ?? null;

        picks.push({
          matchupId: pred.matchupId,
          team: matchup.team,
          driver1: d1,
          driver2: d2,
          predictedWinnerId: pred.predictedWinnerId,
          actualWinnerId,
          isCorrect:
            actualWinnerId === null
              ? null
              : pred.predictedWinnerId === actualWinnerId,
        });
      }

      result[sessionType] = picks;
    }

    return result;
  },
});

// ───────────────────────── Mutations ─────────────────────────

export const submitH2HPredictions = mutation({
  args: {
    raceId: v.id('races'),
    picks: v.array(
      v.object({
        matchupId: v.id('h2hMatchups'),
        predictedWinnerId: v.id('drivers'),
      }),
    ),
    sessionType: v.optional(sessionTypeValidator),
  },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));
    const race = await ctx.db.get(args.raceId);

    if (!race) {
      throw new Error('Race not found');
    }

    const now = Date.now();

    // Only allow predictions for the next upcoming race
    const allRaces = await ctx.db.query('races').collect();
    const upcomingRaces = allRaces
      .filter((r) => r.raceStartAt > now)
      .sort((a, b) => a.raceStartAt - b.raceStartAt);
    const nextRace = upcomingRaces[0];

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- runtime validation
    if (!nextRace || nextRace._id !== args.raceId) {
      throw new Error(
        'H2H predictions are only open for the next upcoming race',
      );
    }

    // Gate: user must have main predictions submitted first
    const mainPrediction = await ctx.db
      .query('predictions')
      .withIndex('by_user_race_session', (q) =>
        q.eq('userId', viewer._id).eq('raceId', args.raceId),
      )
      .first();
    if (!mainPrediction) {
      throw new Error('Submit your top 5 predictions first');
    }

    // Validate each pick
    for (const pick of args.picks) {
      const matchup = await ctx.db.get(pick.matchupId);
      if (!matchup) {
        throw new Error('Matchup not found');
      }
      if (
        pick.predictedWinnerId !== matchup.driver1Id &&
        pick.predictedWinnerId !== matchup.driver2Id
      ) {
        throw new Error(
          'Predicted winner must be one of the drivers in the matchup',
        );
      }
    }

    const existingForRace = await ctx.db
      .query('h2hPredictions')
      .withIndex('by_user_race_session', (q) =>
        q.eq('userId', viewer._id).eq('raceId', args.raceId),
      )
      .collect();
    const hasExistingPredictionsForRace = existingForRace.length > 0;

    const sessionsToUpdate = resolveH2HSessionsToUpdate({
      hasSprint: Boolean(race.hasSprint),
      requestedSessionType: args.sessionType,
      hasExistingPredictionsForRace,
    });
    const isTargetedSessionUpdate = Boolean(
      args.sessionType && hasExistingPredictionsForRace,
    );

    const lockTimes: Record<SessionType, number | undefined> = {
      quali: race.qualiLockAt,
      sprint_quali: race.sprintQualiLockAt,
      sprint: race.sprintLockAt,
      race: race.predictionLockAt,
    };

    let updatedCount = 0;

    for (const sessionType of sessionsToUpdate) {
      const lockTime = lockTimes[sessionType];

      if (lockTime && now >= lockTime) {
        if (isTargetedSessionUpdate) {
          throw new Error(`H2H predictions are locked for ${sessionType}`);
        }
        continue;
      }

      for (const pick of args.picks) {
        const existing = await ctx.db
          .query('h2hPredictions')
          .withIndex('by_user_race_session_matchup', (q) =>
            q
              .eq('userId', viewer._id)
              .eq('raceId', args.raceId)
              .eq('sessionType', sessionType)
              .eq('matchupId', pick.matchupId),
          )
          .unique();

        if (existing) {
          await ctx.db.patch(existing._id, {
            predictedWinnerId: pick.predictedWinnerId,
            updatedAt: now,
          });
        } else {
          await ctx.db.insert('h2hPredictions', {
            userId: viewer._id,
            raceId: args.raceId,
            sessionType,
            matchupId: pick.matchupId,
            predictedWinnerId: pick.predictedWinnerId,
            submittedAt: now,
            updatedAt: now,
          });
        }
        updatedCount++;
      }
    }

    if (updatedCount === 0) {
      throw new Error('All sessions are locked');
    }

    return { ok: true, updatedCount };
  },
});

export const adminBackfillMissingH2HSessionsForRace = mutation({
  args: {
    raceId: v.id('races'),
    dryRun: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));
    requireAdmin(viewer);

    const race = await ctx.db.get(args.raceId);
    if (!race) {
      throw new Error('Race not found');
    }

    const weekendSessions = getWeekendSessions(Boolean(race.hasSprint));
    const dryRun = args.dryRun ?? false;
    const now = Date.now();

    const users = await ctx.db.query('users').collect();
    let usersScanned = 0;
    let usersWithH2H = 0;
    let usersBackfilled = 0;
    let sessionsBackfilled = 0;
    let picksBackfilled = 0;

    for (const user of users) {
      usersScanned++;

      const userPredictions = await ctx.db
        .query('h2hPredictions')
        .withIndex('by_user_race_session', (q) =>
          q.eq('userId', user._id).eq('raceId', args.raceId),
        )
        .collect();

      if (userPredictions.length === 0) {
        continue;
      }
      usersWithH2H++;

      const existingSessions = new Set(
        userPredictions.map((p) => p.sessionType as SessionType),
      );
      const missingSessions = weekendSessions.filter(
        (session) => !existingSessions.has(session),
      );

      if (missingSessions.length === 0) {
        continue;
      }

      const latestPrediction = userPredictions.reduce((latest, current) =>
        current.updatedAt > latest.updatedAt ? current : latest,
      );
      const sourceSession = latestPrediction.sessionType as SessionType;
      const sourceSessionPredictions = userPredictions.filter(
        (p) => p.sessionType === sourceSession,
      );

      if (sourceSessionPredictions.length === 0) {
        continue;
      }

      usersBackfilled++;
      sessionsBackfilled += missingSessions.length;
      picksBackfilled +=
        missingSessions.length * sourceSessionPredictions.length;

      if (dryRun) {
        continue;
      }

      for (const sessionType of missingSessions) {
        for (const sourcePick of sourceSessionPredictions) {
          await ctx.db.insert('h2hPredictions', {
            userId: user._id,
            raceId: args.raceId,
            sessionType,
            matchupId: sourcePick.matchupId,
            predictedWinnerId: sourcePick.predictedWinnerId,
            submittedAt: sourcePick.submittedAt,
            updatedAt: now,
          });
        }
      }
    }

    return {
      dryRun,
      raceId: args.raceId,
      usersScanned,
      usersWithH2H,
      usersBackfilled,
      sessionsBackfilled,
      picksBackfilled,
    };
  },
});
