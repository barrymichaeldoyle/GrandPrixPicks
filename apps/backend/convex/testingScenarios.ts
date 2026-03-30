import { v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import {
  internalMutation,
  internalQuery,
  mutation,
  query,
} from './_generated/server';
import { getOrCreateViewer, getViewer, requireAdmin } from './lib/auth';
import { getRaceTimeZoneFromSlug } from './lib/raceTimezones';
import {
  getScenarioDefinition,
  scenarioList,
  scenarioNameValidator,
  type RacePhase,
  type ScenarioDefinition,
  type ScenarioName,
  type WeekendType,
} from './lib/testing/scenarioDefinitions';

type SessionType = 'quali' | 'sprint_quali' | 'sprint' | 'race';

type ScenarioActor = {
  role: 'primary' | 'secondary';
  userId: Id<'users'>;
  clerkUserId: string;
  email: string;
  displayName: string;
};

type ScenarioContext = {
  namespace: string;
  slugPrefix: string;
  definition: ScenarioDefinition;
  now: number;
  drivers: Array<Doc<'drivers'>>;
  primary: ScenarioActor;
  secondary: ScenarioActor;
  matchupIds: Array<Id<'h2hMatchups'>>;
};

type ReadCtx = QueryCtx | MutationCtx;

export const listScenarios = internalQuery({
  args: {},
  handler: async () => {
    return scenarioList;
  },
});

export const listScenariosAdmin = query({
  args: {},
  handler: async (ctx) => {
    requireAdmin(await getViewer(ctx));
    return scenarioList;
  },
});

export const applyScenario = internalMutation({
  args: {
    scenario: scenarioNameValidator,
    namespace: v.optional(v.string()),
    resetFirst: v.optional(v.boolean()),
    primaryClerkUserId: v.optional(v.string()),
    primaryEmail: v.optional(v.string()),
    primaryDisplayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const definition = getScenarioDefinition(args.scenario);
    const namespace = args.namespace ?? defaultNamespace(args.scenario);

    if (args.resetFirst ?? true) {
      await clearNamespaceData(ctx, namespace);
    }

    const drivers = await ctx.db.query('drivers').collect();
    if (drivers.length < 5) {
      throw new Error('Seed drivers first before applying a testing scenario.');
    }

    const now = Date.now();
    const slugPrefix = toSlug(namespace);
    const primary = await upsertScenarioUser(ctx, {
      namespace,
      role: 'primary',
      displayName: args.primaryDisplayName ?? 'Scenario Primary',
      isAdmin: false,
      clerkUserId: args.primaryClerkUserId,
      email: args.primaryEmail,
    });
    const secondary = await upsertScenarioUser(ctx, {
      namespace,
      role: 'secondary',
      displayName: 'Scenario Rival',
      isAdmin: false,
    });

    const scenarioContext: ScenarioContext = {
      namespace,
      slugPrefix,
      definition,
      now,
      drivers,
      primary,
      secondary,
      matchupIds: await ensureScenarioMatchups(ctx, drivers),
    };

    const race = await buildScenario(ctx, scenarioContext);
    return await buildScenarioSummary(ctx, {
      namespace,
      scenario: args.scenario,
      raceId: race._id,
    });
  },
});

export const applyScenarioAdmin = mutation({
  args: {
    scenario: scenarioNameValidator,
    namespace: v.optional(v.string()),
    resetFirst: v.optional(v.boolean()),
    primaryClerkUserId: v.optional(v.string()),
    primaryEmail: v.optional(v.string()),
    primaryDisplayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    requireAdmin(await getOrCreateViewer(ctx));
    const definition = getScenarioDefinition(args.scenario);
    const namespace = args.namespace ?? defaultNamespace(args.scenario);

    if (args.resetFirst ?? true) {
      await clearNamespaceData(ctx, namespace);
    }

    const drivers = await ctx.db.query('drivers').collect();
    if (drivers.length < 5) {
      throw new Error('Seed drivers first before applying a testing scenario.');
    }

    const now = Date.now();
    const slugPrefix = toSlug(namespace);
    const primary = await upsertScenarioUser(ctx, {
      namespace,
      role: 'primary',
      displayName: args.primaryDisplayName ?? 'Scenario Primary',
      isAdmin: false,
      clerkUserId: args.primaryClerkUserId,
      email: args.primaryEmail,
    });
    const secondary = await upsertScenarioUser(ctx, {
      namespace,
      role: 'secondary',
      displayName: 'Scenario Rival',
      isAdmin: false,
    });

    const scenarioContext: ScenarioContext = {
      namespace,
      slugPrefix,
      definition,
      now,
      drivers,
      primary,
      secondary,
      matchupIds: await ensureScenarioMatchups(ctx, drivers),
    };

    const race = await buildScenario(ctx, scenarioContext);
    return await buildScenarioSummary(ctx, {
      namespace,
      scenario: args.scenario,
      raceId: race._id,
    });
  },
});

export const clearScenario = internalMutation({
  args: {
    namespace: v.string(),
  },
  handler: async (ctx, args) => {
    return await clearNamespaceData(ctx, args.namespace);
  },
});

export const clearScenarioAdmin = mutation({
  args: {
    namespace: v.string(),
  },
  handler: async (ctx, args) => {
    requireAdmin(await getOrCreateViewer(ctx));
    return await clearNamespaceData(ctx, args.namespace);
  },
});

export const getScenarioSummary = internalQuery({
  args: {
    namespace: v.string(),
  },
  handler: async (ctx, args) => {
    return await buildScenarioSummary(ctx, {
      namespace: args.namespace,
    });
  },
});

export const getScenarioSummaryAdmin = query({
  args: {
    namespace: v.string(),
  },
  handler: async (ctx, args) => {
    requireAdmin(await getViewer(ctx));
    return await buildScenarioSummary(ctx, {
      namespace: args.namespace,
    });
  },
});

async function buildScenario(ctx: MutationCtx, scenario: ScenarioContext) {
  if (scenario.definition.racePhase === 'upcoming_open') {
    await upsertScenarioPreviousRace(ctx, scenario);
  }

  const race = await upsertScenarioRace(ctx, scenario, {
    name: readableRaceName(scenario.definition.name),
    weekendType: scenario.definition.weekendType,
    phase: scenario.definition.racePhase,
  });

  if (
    scenario.definition.predictionShape === 'complete' ||
    scenario.definition.predictionShape === 'top5_only'
  ) {
    await upsertWeekendPredictions(ctx, {
      raceId: race._id,
      userId: scenario.primary.userId,
      drivers: scenario.drivers,
      submittedAt: scenario.now - 2 * HOUR,
      hasSprint: scenario.definition.weekendType === 'sprint',
    });
  }

  if (scenario.definition.predictionShape === 'top5_only') {
  } else if (scenario.definition.predictionShape === 'complete') {
    await upsertWeekendH2HPredictions(ctx, {
      raceId: race._id,
      userId: scenario.primary.userId,
      matchupIds: scenario.matchupIds,
      drivers: scenario.drivers,
      submittedAt: scenario.now - 2 * HOUR,
      hasSprint: scenario.definition.weekendType === 'sprint',
    });
  }

  if (scenario.definition.resultsShape === 'partial') {
    const earlyClassification = [
      scenario.drivers[1]._id,
      scenario.drivers[0]._id,
      scenario.drivers[2]._id,
      scenario.drivers[3]._id,
      scenario.drivers[4]._id,
    ];
    const earlySession: Extract<SessionType, 'quali' | 'sprint_quali'> =
      scenario.definition.weekendType === 'sprint' ? 'sprint_quali' : 'quali';

    await upsertResult(ctx, {
      raceId: race._id,
      sessionType: earlySession,
      classification: earlyClassification,
      publishedAt: scenario.now - HOUR,
    });

    await upsertScore(ctx, {
      raceId: race._id,
      user: scenario.primary,
      sessionType: earlySession,
      points: 18,
      picks: driverIdsFromDocs(scenario.drivers),
      classification: earlyClassification,
    });

    await upsertScore(ctx, {
      raceId: race._id,
      user: scenario.secondary,
      sessionType: earlySession,
      points: 21,
      picks: [
        scenario.drivers[1]._id,
        scenario.drivers[0]._id,
        scenario.drivers[2]._id,
        scenario.drivers[3]._id,
        scenario.drivers[4]._id,
      ],
      classification: earlyClassification,
    });

    if (scenario.definition.predictionShape === 'complete') {
      await upsertH2HResultsAndScores(ctx, {
        raceId: race._id,
        sessionType: earlySession,
        matchupIds: scenario.matchupIds,
        drivers: scenario.drivers,
        primary: scenario.primary,
        secondary: scenario.secondary,
        publishedAt: scenario.now - HOUR,
      });
    }
  }

  if (scenario.definition.resultsShape === 'complete') {
    const qualiClassification = [
      scenario.drivers[1]._id,
      scenario.drivers[0]._id,
      scenario.drivers[2]._id,
      scenario.drivers[3]._id,
      scenario.drivers[4]._id,
    ];
    const raceClassification = [
      scenario.drivers[0]._id,
      scenario.drivers[2]._id,
      scenario.drivers[1]._id,
      scenario.drivers[4]._id,
      scenario.drivers[3]._id,
    ];
    const sprintQualiClassification = [
      scenario.drivers[2]._id,
      scenario.drivers[0]._id,
      scenario.drivers[1]._id,
      scenario.drivers[3]._id,
      scenario.drivers[4]._id,
    ];
    const sprintClassification = [
      scenario.drivers[0]._id,
      scenario.drivers[1]._id,
      scenario.drivers[3]._id,
      scenario.drivers[2]._id,
      scenario.drivers[4]._id,
    ];

    if (scenario.definition.weekendType === 'sprint') {
      await upsertResult(ctx, {
        raceId: race._id,
        sessionType: 'sprint_quali',
        classification: sprintQualiClassification,
        publishedAt: scenario.now - 12 * HOUR,
      });
      await upsertResult(ctx, {
        raceId: race._id,
        sessionType: 'sprint',
        classification: sprintClassification,
        publishedAt: scenario.now - 9 * HOUR,
      });
      await upsertScore(ctx, {
        raceId: race._id,
        user: scenario.primary,
        sessionType: 'sprint_quali',
        points: 14,
        picks: driverIdsFromDocs(scenario.drivers),
        classification: sprintQualiClassification,
      });
      await upsertScore(ctx, {
        raceId: race._id,
        user: scenario.primary,
        sessionType: 'sprint',
        points: 17,
        picks: driverIdsFromDocs(scenario.drivers),
        classification: sprintClassification,
      });
      await upsertScore(ctx, {
        raceId: race._id,
        user: scenario.secondary,
        sessionType: 'sprint_quali',
        points: 19,
        picks: sprintQualiClassification,
        classification: sprintQualiClassification,
      });
      await upsertScore(ctx, {
        raceId: race._id,
        user: scenario.secondary,
        sessionType: 'sprint',
        points: 20,
        picks: sprintClassification,
        classification: sprintClassification,
      });

      if (scenario.definition.predictionShape === 'complete') {
        await upsertH2HResultsAndScores(ctx, {
          raceId: race._id,
          sessionType: 'sprint_quali',
          matchupIds: scenario.matchupIds,
          drivers: scenario.drivers,
          primary: scenario.primary,
          secondary: scenario.secondary,
          publishedAt: scenario.now - 12 * HOUR,
        });
        await upsertH2HResultsAndScores(ctx, {
          raceId: race._id,
          sessionType: 'sprint',
          matchupIds: scenario.matchupIds,
          drivers: scenario.drivers,
          primary: scenario.primary,
          secondary: scenario.secondary,
          publishedAt: scenario.now - 9 * HOUR,
        });
      }
    }

    await upsertResult(ctx, {
      raceId: race._id,
      sessionType: 'quali',
      classification: qualiClassification,
      publishedAt: scenario.now - 6 * HOUR,
    });
    await upsertResult(ctx, {
      raceId: race._id,
      sessionType: 'race',
      classification: raceClassification,
      publishedAt: scenario.now - 3 * HOUR,
    });

    await upsertScore(ctx, {
      raceId: race._id,
      user: scenario.primary,
      sessionType: 'quali',
      points: 18,
      picks: driverIdsFromDocs(scenario.drivers),
      classification: qualiClassification,
    });
    await upsertScore(ctx, {
      raceId: race._id,
      user: scenario.primary,
      sessionType: 'race',
      points: 16,
      picks: driverIdsFromDocs(scenario.drivers),
      classification: raceClassification,
    });
    await upsertScore(ctx, {
      raceId: race._id,
      user: scenario.secondary,
      sessionType: 'quali',
      points: 20,
      picks: qualiClassification,
      classification: qualiClassification,
    });
    await upsertScore(ctx, {
      raceId: race._id,
      user: scenario.secondary,
      sessionType: 'race',
      points: 22,
      picks: raceClassification,
      classification: raceClassification,
    });

    if (scenario.definition.predictionShape === 'complete') {
      await upsertH2HResultsAndScores(ctx, {
        raceId: race._id,
        sessionType: 'quali',
        matchupIds: scenario.matchupIds,
        drivers: scenario.drivers,
        primary: scenario.primary,
        secondary: scenario.secondary,
        publishedAt: scenario.now - 6 * HOUR,
      });
      await upsertH2HResultsAndScores(ctx, {
        raceId: race._id,
        sessionType: 'race',
        matchupIds: scenario.matchupIds,
        drivers: scenario.drivers,
        primary: scenario.primary,
        secondary: scenario.secondary,
        publishedAt: scenario.now - 3 * HOUR,
      });
    }
  }

  return race;
}

async function buildScenarioSummary(
  ctx: ReadCtx,
  args: {
    namespace: string;
    scenario?: ScenarioName;
    raceId?: Id<'races'>;
  },
) {
  const slugPrefix = `${toSlug(args.namespace)}-`;
  const primaryEmail = scenarioPrimaryEmail(args.namespace);
  const users = (await ctx.db.query('users').collect()).filter((user) =>
    user.clerkUserId.startsWith(`${args.namespace}__`) ||
    user.email === primaryEmail,
  );
  const races = (await ctx.db.query('races').collect()).filter((race) =>
    race.slug.startsWith(slugPrefix),
  );
  const race =
    (args.raceId
      ? races.find((item) => item._id === args.raceId)
      : races.sort((a, b) => b.createdAt - a.createdAt)[0]) ?? null;

  const scenarioName =
    args.scenario ?? parseScenarioNameFromNamespace(args.namespace);
  const scenario = scenarioName ? getScenarioDefinition(scenarioName) : null;

  const predictions = race
    ? await ctx.db
        .query('predictions')
        .withIndex('by_race_session', (q) => q.eq('raceId', race._id))
        .collect()
    : [];
  const results = race
    ? await ctx.db
        .query('results')
        .withIndex('by_race_session', (q) => q.eq('raceId', race._id))
        .collect()
    : [];
  const scores = race
    ? await ctx.db
        .query('scores')
        .withIndex('by_race_session', (q) => q.eq('raceId', race._id))
        .collect()
    : [];

  const primaryUser =
    users.find(
      (user) =>
        user.clerkUserId.endsWith('__primary') || user.email === primaryEmail,
    ) ?? null;

  return {
    scenario: scenario?.name ?? null,
    namespace: args.namespace,
    description: scenario?.description ?? null,
    actor: primaryUser
      ? {
          clerkUserId: primaryUser.clerkUserId,
          email: primaryUser.email ?? null,
          displayName: primaryUser.displayName ?? null,
        }
      : null,
    race: race
      ? {
          raceId: race._id,
          slug: race.slug,
          name: race.name,
          status: race.status,
          hasSprint: race.hasSprint ?? false,
        }
      : null,
    state: scenario
      ? {
          signedIn: scenario.signedIn,
          weekendType: scenario.weekendType,
          racePhase: scenario.racePhase,
          predictionShape: scenario.predictionShape,
          resultsShape: scenario.resultsShape,
          hasRank: scenario.hasRank,
        }
      : null,
    data: {
      userCount: users.length,
      raceCount: races.length,
      predictionCount: predictions.length,
      resultSessions: results.map((result) => result.sessionType),
      scoreSessions: scores.map((score) => ({
        userId: score.userId,
        sessionType: score.sessionType,
        points: score.points,
      })),
    },
    routes: race
      ? {
          webRaceDetail: `/races/${race.slug}`,
          webLeaderboard: '/leaderboard',
        }
      : null,
  };
}

async function clearNamespaceData(ctx: MutationCtx, namespace: string) {
  const slugPrefix = `${toSlug(namespace)}-`;
  const primaryEmail = scenarioPrimaryEmail(namespace);
  const users = (await ctx.db.query('users').collect()).filter((user) =>
    user.clerkUserId.startsWith(`${namespace}__`) || user.email === primaryEmail,
  );
  const races = (await ctx.db.query('races').collect()).filter((race) =>
    race.slug.startsWith(slugPrefix),
  );

  for (const user of users) {
    await deletePredictionsByUser(ctx, user._id);
    await deleteScoresByUser(ctx, user._id);
    await deleteH2HPredictionsByUser(ctx, user._id);
    await deleteH2HScoresByUser(ctx, user._id);
    await deleteStandingsByUser(ctx, 'seasonStandings', user._id);
    await deleteStandingsByUser(ctx, 'h2hSeasonStandings', user._id);
  }

  for (const race of races) {
    await deletePredictionsByRace(ctx, race._id);
    await deleteScoresByRace(ctx, race._id);
    await deleteResultsByRace(ctx, 'results', race._id);
    await deleteH2HPredictionsByRace(ctx, race._id);
    await deleteH2HScoresByRace(ctx, race._id);
    await deleteResultsByRace(ctx, 'h2hResults', race._id);
    await ctx.db.delete(race._id);
  }

  for (const user of users) {
    await ctx.db.delete(user._id);
  }

  return {
    namespace,
    deleted: {
      users: users.length,
      races: races.length,
    },
  };
}

async function upsertScenarioUser(
  ctx: MutationCtx,
  args: {
    namespace: string;
    role: 'primary' | 'secondary';
    displayName: string;
    isAdmin: boolean;
    clerkUserId?: string;
    email?: string;
  },
): Promise<ScenarioActor> {
  const now = Date.now();
  const clerkUserId = args.clerkUserId ?? `${args.namespace}__${args.role}`;
  const email = args.email ?? `${clerkUserId}@example.com`;

  const existing = await ctx.db
    .query('users')
    .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', clerkUserId))
    .unique();

  const userId = existing
    ? existing._id
    : await ctx.db.insert('users', {
        clerkUserId,
        email,
        displayName: args.displayName,
        isAdmin: args.isAdmin,
        createdAt: now,
        updatedAt: now,
      });

  if (existing) {
    await ctx.db.patch(existing._id, {
      email,
      displayName: args.displayName,
      isAdmin: args.isAdmin,
      updatedAt: now,
    });
  }

  return {
    role: args.role,
    userId,
    clerkUserId,
    email,
    displayName: args.displayName,
  };
}

async function upsertScenarioRace(
  ctx: MutationCtx,
  scenario: ScenarioContext,
  args: {
    name: string;
    weekendType: WeekendType;
    phase: RacePhase;
  },
) {
  const timings = buildTimings(args.phase, scenario.now);
  const slug = `${scenario.slugPrefix}-race`;
  const round = getScenarioRaceRound(scenario.definition);
  const existing = await ctx.db
    .query('races')
    .withIndex('by_slug', (q) => q.eq('slug', slug))
    .unique();
  const payload = {
    season: 2026,
    round,
    name: args.name,
    slug,
    timeZone: getRaceTimeZoneFromSlug('australia-2026') ?? 'UTC',
    hasSprint: args.weekendType === 'sprint',
    sprintQualiStartAt:
      args.weekendType === 'sprint' ? timings.sprintQualiStartAt : undefined,
    sprintQualiLockAt:
      args.weekendType === 'sprint' ? timings.sprintQualiLockAt : undefined,
    sprintStartAt:
      args.weekendType === 'sprint' ? timings.sprintStartAt : undefined,
    sprintLockAt:
      args.weekendType === 'sprint' ? timings.sprintLockAt : undefined,
    qualiStartAt: timings.qualiStartAt,
    qualiLockAt: timings.qualiLockAt,
    raceStartAt: timings.raceStartAt,
    predictionLockAt: timings.predictionLockAt,
    status: timings.status,
    updatedAt: scenario.now,
  };

  if (existing) {
    await ctx.db.patch(existing._id, payload);
    return (await ctx.db.get(existing._id))!;
  }

  const raceId = await ctx.db.insert('races', {
    ...payload,
    createdAt: scenario.now,
  });
  return (await ctx.db.get(raceId))!;
}

async function upsertScenarioPreviousRace(
  ctx: MutationCtx,
  scenario: ScenarioContext,
) {
  const slug = `${scenario.slugPrefix}-previous-race`;
  const currentRound = getScenarioRaceRound(scenario.definition);
  const existing = await ctx.db
    .query('races')
    .withIndex('by_slug', (q) => q.eq('slug', slug))
    .unique();

  const payload = {
    season: 2026,
    round: currentRound - 1,
    name: `${readableRaceName(scenario.definition.name)} Previous`,
    slug,
    timeZone: getRaceTimeZoneFromSlug('australia-2026') ?? 'UTC',
    hasSprint: false,
    sprintQualiStartAt: undefined,
    sprintQualiLockAt: undefined,
    sprintStartAt: undefined,
    sprintLockAt: undefined,
    qualiStartAt: scenario.now - 6 * DAY,
    qualiLockAt: scenario.now - 6 * DAY,
    raceStartAt: scenario.now - 5 * DAY,
    predictionLockAt: scenario.now - 5 * DAY,
    status: 'finished' as const,
    updatedAt: scenario.now,
  };

  if (existing) {
    await ctx.db.patch(existing._id, payload);
    return (await ctx.db.get(existing._id))!;
  }

  const raceId = await ctx.db.insert('races', {
    ...payload,
    createdAt: scenario.now,
  });
  return (await ctx.db.get(raceId))!;
}

async function upsertWeekendPredictions(
  ctx: MutationCtx,
  args: {
    raceId: Id<'races'>;
    userId: Id<'users'>;
    drivers: Array<Doc<'drivers'>>;
    submittedAt: number;
    hasSprint: boolean;
  },
) {
  const picks = driverIdsFromDocs(args.drivers);
  const sessions: Array<
    Extract<SessionType, 'quali' | 'sprint_quali' | 'sprint' | 'race'>
  > = args.hasSprint
    ? ['sprint_quali', 'sprint', 'quali', 'race']
    : ['quali', 'race'];
  for (const sessionType of sessions) {
    await upsertPrediction(ctx, {
      raceId: args.raceId,
      userId: args.userId,
      sessionType,
      picks,
      submittedAt: args.submittedAt,
    });
  }
}

async function upsertWeekendH2HPredictions(
  ctx: MutationCtx,
  args: {
    raceId: Id<'races'>;
    userId: Id<'users'>;
    matchupIds: Array<Id<'h2hMatchups'>>;
    drivers: Array<Doc<'drivers'>>;
    submittedAt: number;
    hasSprint: boolean;
  },
) {
  const sessions: Array<
    Extract<SessionType, 'quali' | 'sprint_quali' | 'sprint' | 'race'>
  > = args.hasSprint
    ? ['sprint_quali', 'sprint', 'quali', 'race']
    : ['quali', 'race'];

  for (const sessionType of sessions) {
    for (const matchupId of args.matchupIds) {
      await upsertH2HPrediction(ctx, {
        raceId: args.raceId,
        userId: args.userId,
        matchupId,
        sessionType,
        predictedWinnerId: args.drivers[0]._id,
        submittedAt: args.submittedAt,
      });
    }
  }
}

async function upsertPrediction(
  ctx: MutationCtx,
  args: {
    raceId: Id<'races'>;
    userId: Id<'users'>;
    sessionType: Extract<
      SessionType,
      'quali' | 'sprint_quali' | 'sprint' | 'race'
    >;
    picks: Array<Id<'drivers'>>;
    submittedAt: number;
  },
) {
  const existing = await ctx.db
    .query('predictions')
    .withIndex('by_user_race_session', (q) =>
      q
        .eq('userId', args.userId)
        .eq('raceId', args.raceId)
        .eq('sessionType', args.sessionType),
    )
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      picks: args.picks,
      submittedAt: args.submittedAt,
      updatedAt: args.submittedAt,
    });
    return existing._id;
  }

  return await ctx.db.insert('predictions', {
    userId: args.userId,
    raceId: args.raceId,
    sessionType: args.sessionType,
    picks: args.picks,
    submittedAt: args.submittedAt,
    updatedAt: args.submittedAt,
  });
}

async function upsertResult(
  ctx: MutationCtx,
  args: {
    raceId: Id<'races'>;
    sessionType: Extract<
      SessionType,
      'quali' | 'sprint_quali' | 'sprint' | 'race'
    >;
    classification: Array<Id<'drivers'>>;
    publishedAt: number;
  },
) {
  const existing = await ctx.db
    .query('results')
    .withIndex('by_race_session', (q) =>
      q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
    )
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      classification: args.classification,
      scoringStatus: 'complete',
      publishedAt: args.publishedAt,
      updatedAt: args.publishedAt,
    });
    return existing._id;
  }

  return await ctx.db.insert('results', {
    raceId: args.raceId,
    sessionType: args.sessionType,
    classification: args.classification,
    scoringStatus: 'complete',
    publishedAt: args.publishedAt,
    updatedAt: args.publishedAt,
  });
}

async function upsertScore(
  ctx: MutationCtx,
  args: {
    raceId: Id<'races'>;
    user: ScenarioActor;
    sessionType: Extract<
      SessionType,
      'quali' | 'sprint_quali' | 'sprint' | 'race'
    >;
    points: number;
    picks: Array<Id<'drivers'>>;
    classification: Array<Id<'drivers'>>;
  },
) {
  const now = Date.now();
  const breakdown = args.picks.map((driverId, index) => {
    const actualPosition = args.classification.findIndex(
      (id) => id === driverId,
    );
    return {
      driverId,
      predictedPosition: index + 1,
      actualPosition: actualPosition >= 0 ? actualPosition + 1 : undefined,
      points: index === actualPosition ? 5 : actualPosition >= 0 ? 1 : 0,
    };
  });

  const existing = await ctx.db
    .query('scores')
    .withIndex('by_user_race_session', (q) =>
      q
        .eq('userId', args.user.userId)
        .eq('raceId', args.raceId)
        .eq('sessionType', args.sessionType),
    )
    .unique();

  const payload = {
    points: args.points,
    breakdown,
    displayName: args.user.displayName,
    updatedAt: now,
  };

  if (existing) {
    await ctx.db.patch(existing._id, payload);
    return existing._id;
  }

  return await ctx.db.insert('scores', {
    userId: args.user.userId,
    raceId: args.raceId,
    sessionType: args.sessionType,
    points: args.points,
    breakdown,
    displayName: args.user.displayName,
    createdAt: now,
    updatedAt: now,
  });
}

async function upsertH2HPrediction(
  ctx: MutationCtx,
  args: {
    raceId: Id<'races'>;
    userId: Id<'users'>;
    matchupId: Id<'h2hMatchups'>;
    sessionType: Extract<
      SessionType,
      'quali' | 'sprint_quali' | 'sprint' | 'race'
    >;
    predictedWinnerId: Id<'drivers'>;
    submittedAt: number;
  },
) {
  const existing = await ctx.db
    .query('h2hPredictions')
    .withIndex('by_user_race_session_matchup', (q) =>
      q
        .eq('userId', args.userId)
        .eq('raceId', args.raceId)
        .eq('sessionType', args.sessionType)
        .eq('matchupId', args.matchupId),
    )
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      predictedWinnerId: args.predictedWinnerId,
      submittedAt: args.submittedAt,
      updatedAt: args.submittedAt,
    });
    return existing._id;
  }

  return await ctx.db.insert('h2hPredictions', {
    userId: args.userId,
    raceId: args.raceId,
    sessionType: args.sessionType,
    matchupId: args.matchupId,
    predictedWinnerId: args.predictedWinnerId,
    submittedAt: args.submittedAt,
    updatedAt: args.submittedAt,
  });
}

async function upsertH2HResult(
  ctx: MutationCtx,
  args: {
    raceId: Id<'races'>;
    matchupId: Id<'h2hMatchups'>;
    sessionType: Extract<
      SessionType,
      'quali' | 'sprint_quali' | 'sprint' | 'race'
    >;
    winnerId: Id<'drivers'>;
    publishedAt: number;
  },
) {
  const existing = await ctx.db
    .query('h2hResults')
    .withIndex('by_race_session_matchup', (q) =>
      q
        .eq('raceId', args.raceId)
        .eq('sessionType', args.sessionType)
        .eq('matchupId', args.matchupId),
    )
    .unique();

  if (existing) {
    await ctx.db.patch(existing._id, {
      winnerId: args.winnerId,
      publishedAt: args.publishedAt,
    });
    return existing._id;
  }

  return await ctx.db.insert('h2hResults', {
    raceId: args.raceId,
    sessionType: args.sessionType,
    matchupId: args.matchupId,
    winnerId: args.winnerId,
    publishedAt: args.publishedAt,
  });
}

async function upsertH2HScore(
  ctx: MutationCtx,
  args: {
    raceId: Id<'races'>;
    user: ScenarioActor;
    sessionType: Extract<
      SessionType,
      'quali' | 'sprint_quali' | 'sprint' | 'race'
    >;
    correctPicks: number;
    totalPicks: number;
    points: number;
  },
) {
  const now = Date.now();
  const existing = await ctx.db
    .query('h2hScores')
    .withIndex('by_user_race_session', (q) =>
      q
        .eq('userId', args.user.userId)
        .eq('raceId', args.raceId)
        .eq('sessionType', args.sessionType),
    )
    .unique();

  const payload = {
    points: args.points,
    correctPicks: args.correctPicks,
    totalPicks: args.totalPicks,
    updatedAt: now,
  };

  if (existing) {
    await ctx.db.patch(existing._id, payload);
    return existing._id;
  }

  return await ctx.db.insert('h2hScores', {
    userId: args.user.userId,
    raceId: args.raceId,
    sessionType: args.sessionType,
    points: args.points,
    correctPicks: args.correctPicks,
    totalPicks: args.totalPicks,
    createdAt: now,
    updatedAt: now,
  });
}

async function upsertH2HResultsAndScores(
  ctx: MutationCtx,
  args: {
    raceId: Id<'races'>;
    sessionType: Extract<
      SessionType,
      'quali' | 'sprint_quali' | 'sprint' | 'race'
    >;
    matchupIds: Array<Id<'h2hMatchups'>>;
    drivers: Array<Doc<'drivers'>>;
    primary: ScenarioActor;
    secondary: ScenarioActor;
    publishedAt: number;
  },
) {
  for (const [index, matchupId] of args.matchupIds.entries()) {
    await upsertH2HResult(ctx, {
      raceId: args.raceId,
      matchupId,
      sessionType: args.sessionType,
      winnerId: index % 2 === 0 ? args.drivers[0]._id : args.drivers[1]._id,
      publishedAt: args.publishedAt,
    });
  }

  const totalPicks = args.matchupIds.length;
  await upsertH2HScore(ctx, {
    raceId: args.raceId,
    user: args.primary,
    sessionType: args.sessionType,
    correctPicks: Math.max(0, totalPicks - 2),
    totalPicks,
    points: Math.max(0, totalPicks - 2),
  });
  await upsertH2HScore(ctx, {
    raceId: args.raceId,
    user: args.secondary,
    sessionType: args.sessionType,
    correctPicks: Math.max(0, totalPicks - 1),
    totalPicks,
    points: Math.max(0, totalPicks - 1),
  });
}

async function ensureScenarioMatchups(
  ctx: MutationCtx,
  drivers: Array<Doc<'drivers'>>,
): Promise<Array<Id<'h2hMatchups'>>> {
  const existing = await ctx.db
    .query('h2hMatchups')
    .withIndex('by_season', (q) => q.eq('season', 2026))
    .collect();

  const ids: Array<Id<'h2hMatchups'>> = existing.map((matchup) => matchup._id);
  const existingTeams = new Set(existing.map((matchup) => matchup.team));
  const byTeam = new Map<string, Array<Doc<'drivers'>>>();

  for (const driver of drivers) {
    if (!driver.team) {
      continue;
    }
    const list = byTeam.get(driver.team) ?? [];
    list.push(driver);
    byTeam.set(driver.team, list);
  }

  for (const [team, teamDrivers] of byTeam.entries()) {
    if (teamDrivers.length < 2 || existingTeams.has(team)) {
      continue;
    }
    const matchupId = await ctx.db.insert('h2hMatchups', {
      season: 2026,
      team,
      driver1Id: teamDrivers[0]._id,
      driver2Id: teamDrivers[1]._id,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    ids.push(matchupId);
  }

  return ids;
}

async function deletePredictionsByUser(ctx: MutationCtx, userId: Id<'users'>) {
  const docs = await ctx.db
    .query('predictions')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect();
  for (const doc of docs) {
    await ctx.db.delete(doc._id);
  }
}

async function deletePredictionsByRace(ctx: MutationCtx, raceId: Id<'races'>) {
  const docs = await ctx.db
    .query('predictions')
    .withIndex('by_race_session', (q) => q.eq('raceId', raceId))
    .collect();
  for (const doc of docs) {
    await ctx.db.delete(doc._id);
  }
}

async function deleteScoresByUser(ctx: MutationCtx, userId: Id<'users'>) {
  const docs = await ctx.db
    .query('scores')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect();
  for (const doc of docs) {
    await ctx.db.delete(doc._id);
  }
}

async function deleteScoresByRace(ctx: MutationCtx, raceId: Id<'races'>) {
  const docs = await ctx.db
    .query('scores')
    .withIndex('by_race_session', (q) => q.eq('raceId', raceId))
    .collect();
  for (const doc of docs) {
    await ctx.db.delete(doc._id);
  }
}

async function deleteH2HPredictionsByUser(
  ctx: MutationCtx,
  userId: Id<'users'>,
) {
  const docs = await ctx.db
    .query('h2hPredictions')
    .withIndex('by_user_race_session', (q) => q.eq('userId', userId))
    .collect();
  for (const doc of docs) {
    await ctx.db.delete(doc._id);
  }
}

async function deleteH2HPredictionsByRace(
  ctx: MutationCtx,
  raceId: Id<'races'>,
) {
  const docs = await ctx.db
    .query('h2hPredictions')
    .withIndex('by_race_session', (q) => q.eq('raceId', raceId))
    .collect();
  for (const doc of docs) {
    await ctx.db.delete(doc._id);
  }
}

async function deleteH2HScoresByUser(ctx: MutationCtx, userId: Id<'users'>) {
  const docs = await ctx.db
    .query('h2hScores')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect();
  for (const doc of docs) {
    await ctx.db.delete(doc._id);
  }
}

async function deleteH2HScoresByRace(ctx: MutationCtx, raceId: Id<'races'>) {
  const docs = await ctx.db
    .query('h2hScores')
    .withIndex('by_race_session', (q) => q.eq('raceId', raceId))
    .collect();
  for (const doc of docs) {
    await ctx.db.delete(doc._id);
  }
}

async function deleteResultsByRace(
  ctx: MutationCtx,
  table: 'results' | 'h2hResults',
  raceId: Id<'races'>,
) {
  const docs = await ctx.db
    .query(table)
    .withIndex('by_race_session', (q) => q.eq('raceId', raceId))
    .collect();
  for (const doc of docs) {
    await ctx.db.delete(doc._id);
  }
}

async function deleteStandingsByUser(
  ctx: MutationCtx,
  table: 'seasonStandings' | 'h2hSeasonStandings',
  userId: Id<'users'>,
) {
  const docs = await ctx.db
    .query(table)
    .withIndex('by_user_season', (q) => q.eq('userId', userId))
    .collect();
  for (const doc of docs) {
    await ctx.db.delete(doc._id);
  }
}

function buildTimings(phase: RacePhase, now: number) {
  if (phase === 'upcoming_open') {
    return {
      status: 'upcoming',
      sprintQualiStartAt: now + DAY,
      sprintQualiLockAt: now + DAY,
      sprintStartAt: now + 36 * HOUR,
      sprintLockAt: now + 36 * HOUR,
      qualiStartAt: now + 2 * DAY,
      qualiLockAt: now + 2 * DAY,
      raceStartAt: now + 3 * DAY,
      predictionLockAt: now + 3 * DAY,
    };
  }

  if (phase === 'locked_pending_results' || phase === 'partial_results') {
    return {
      status: 'locked',
      sprintQualiStartAt: now - 50 * HOUR,
      sprintQualiLockAt: now - 50 * HOUR,
      sprintStartAt: now - 30 * HOUR,
      sprintLockAt: now - 30 * HOUR,
      qualiStartAt: now - 26 * HOUR,
      qualiLockAt: now - 26 * HOUR,
      raceStartAt: now - 30 * MINUTE,
      predictionLockAt: now - 30 * MINUTE,
    };
  }

  return {
    status: 'finished',
    sprintQualiStartAt: now - 54 * HOUR,
    sprintQualiLockAt: now - 54 * HOUR,
    sprintStartAt: now - 30 * HOUR,
    sprintLockAt: now - 30 * HOUR,
    qualiStartAt: now - 30 * HOUR,
    qualiLockAt: now - 30 * HOUR,
    raceStartAt: now - 6 * HOUR,
    predictionLockAt: now - 6 * HOUR,
  };
}

function driverIdsFromDocs(drivers: Array<Doc<'drivers'>>) {
  return drivers.slice(0, 5).map((driver) => driver._id);
}

function defaultNamespace(scenario: ScenarioName) {
  return `scenario__${scenario}`;
}

function scenarioPrimaryEmail(namespace: string) {
  return `${namespace}@example.com`;
}

function getScenarioRaceRound(definition: ScenarioDefinition) {
  if (definition.racePhase !== 'upcoming_open') {
    return 99;
  }

  switch (definition.name) {
    case 'race_upcoming_signed_in_no_picks':
      return -20;
    case 'race_upcoming_signed_in_complete':
      return -19;
    case 'race_upcoming_signed_in_top5_only':
      return -18;
    case 'race_upcoming_signed_in_complete_h2h':
      return -17;
    default:
      return 0;
  }
}

function parseScenarioNameFromNamespace(
  namespace: string,
): ScenarioName | null {
  if (!namespace.startsWith('scenario__')) {
    return null;
  }

  const candidate = namespace.split('__').slice(1).join('__') as ScenarioName;
  return candidate in SCENARIO_NAME_MAP ? candidate : null;
}

function toSlug(value: string) {
  return value
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function readableRaceName(scenarioName: ScenarioName) {
  return scenarioName
    .replace(/^race_/, '')
    .split('_')
    .map((part) => part[0].toUpperCase() + part.slice(1))
    .join(' ');
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const SCENARIO_NAME_MAP: Record<ScenarioName, true> = {
  race_upcoming_signed_in_no_picks: true,
  race_upcoming_signed_in_complete: true,
  race_upcoming_signed_in_top5_only: true,
  race_upcoming_signed_in_complete_h2h: true,
  race_locked_signed_in_no_picks: true,
  race_locked_signed_in_complete_no_results: true,
  race_locked_signed_in_complete_h2h_no_results: true,
  race_partial_results_standard: true,
  race_partial_results_sprint: true,
  race_finished_scored_standard: true,
  race_finished_scored_sprint: true,
  race_finished_scored_h2h_standard: true,
};
