import { v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import type { MutationCtx, QueryCtx } from './_generated/server';
import { internalMutation, internalQuery } from './_generated/server';
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
};

type ReadCtx = QueryCtx | MutationCtx;

export const listScenarios = internalQuery({
  args: {},
  handler: async () => {
    return scenarioList;
  },
});

export const applyScenario = internalMutation({
  args: {
    scenario: scenarioNameValidator,
    namespace: v.optional(v.string()),
    resetFirst: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const definition = getScenarioDefinition(args.scenario);
    const namespace = args.namespace ?? defaultNamespace(args.scenario);

    if (args.resetFirst ?? true) {
      await clearNamespaceData(ctx, namespace);
    }

    const drivers = await ctx.db.query('drivers').collect();
    if (drivers.length < 5) {
      throw new Error(
        'Seed drivers first before applying a testing scenario.',
      );
    }

    const now = Date.now();
    const slugPrefix = toSlug(namespace);
    const primary = await upsertScenarioUser(ctx, {
      namespace,
      role: 'primary',
      displayName: 'Scenario Primary',
      isAdmin: false,
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

async function buildScenario(
  ctx: MutationCtx,
  scenario: ScenarioContext,
) {
  const race = await upsertScenarioRace(ctx, scenario, {
    name: readableRaceName(scenario.definition.name),
    weekendType: scenario.definition.weekendType,
    phase: scenario.definition.racePhase,
  });

  if (scenario.definition.predictionShape === 'complete') {
    await upsertStandardPredictions(ctx, {
      raceId: race._id,
      userId: scenario.primary.userId,
      drivers: scenario.drivers,
      submittedAt: scenario.now - 2 * HOUR,
    });
  }

  if (scenario.definition.resultsShape === 'partial') {
    const qualiClassification = [
      scenario.drivers[1]._id,
      scenario.drivers[0]._id,
      scenario.drivers[2]._id,
      scenario.drivers[3]._id,
      scenario.drivers[4]._id,
    ];

    await upsertResult(ctx, {
      raceId: race._id,
      sessionType: 'quali',
      classification: qualiClassification,
      publishedAt: scenario.now - HOUR,
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
      user: scenario.secondary,
      sessionType: 'quali',
      points: 21,
      picks: [
        scenario.drivers[1]._id,
        scenario.drivers[0]._id,
        scenario.drivers[2]._id,
        scenario.drivers[3]._id,
        scenario.drivers[4]._id,
      ],
      classification: qualiClassification,
    });
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
  const users = (await ctx.db.query('users').collect()).filter((user) =>
    user.clerkUserId.startsWith(`${args.namespace}__`),
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
    users.find((user) => user.clerkUserId.endsWith('__primary')) ?? null;

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

async function clearNamespaceData(
  ctx: MutationCtx,
  namespace: string,
) {
  const slugPrefix = `${toSlug(namespace)}-`;
  const users = (await ctx.db.query('users').collect()).filter((user) =>
    user.clerkUserId.startsWith(`${namespace}__`),
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
  },
): Promise<ScenarioActor> {
  const now = Date.now();
  const clerkUserId = `${args.namespace}__${args.role}`;
  const email = `${clerkUserId}@example.com`;

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
  const existing = await ctx.db
    .query('races')
    .withIndex('by_slug', (q) => q.eq('slug', slug))
    .unique();
  const payload = {
    season: 2026,
    round: 99,
    name: args.name,
    slug,
    timeZone: getRaceTimeZoneFromSlug('australia-2026') ?? 'UTC',
    hasSprint: args.weekendType === 'sprint',
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

async function upsertStandardPredictions(
  ctx: MutationCtx,
  args: {
    raceId: Id<'races'>;
    userId: Id<'users'>;
    drivers: Array<Doc<'drivers'>>;
    submittedAt: number;
  },
) {
  const picks = driverIdsFromDocs(args.drivers);
  await upsertPrediction(ctx, {
    raceId: args.raceId,
    userId: args.userId,
    sessionType: 'quali',
    picks,
    submittedAt: args.submittedAt,
  });
  await upsertPrediction(ctx, {
    raceId: args.raceId,
    userId: args.userId,
    sessionType: 'race',
    picks,
    submittedAt: args.submittedAt,
  });
}

async function upsertPrediction(
  ctx: MutationCtx,
  args: {
    raceId: Id<'races'>;
    userId: Id<'users'>;
    sessionType: Extract<SessionType, 'quali' | 'race'>;
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
    sessionType: Extract<SessionType, 'quali' | 'race'>;
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
    sessionType: Extract<SessionType, 'quali' | 'race'>;
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

async function deletePredictionsByUser(
  ctx: MutationCtx,
  userId: Id<'users'>,
) {
  const docs = await ctx.db
    .query('predictions')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect();
  for (const doc of docs) {
    await ctx.db.delete(doc._id);
  }
}

async function deletePredictionsByRace(
  ctx: MutationCtx,
  raceId: Id<'races'>,
) {
  const docs = await ctx.db
    .query('predictions')
    .withIndex('by_race_session', (q) => q.eq('raceId', raceId))
    .collect();
  for (const doc of docs) {
    await ctx.db.delete(doc._id);
  }
}

async function deleteScoresByUser(
  ctx: MutationCtx,
  userId: Id<'users'>,
) {
  const docs = await ctx.db
    .query('scores')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect();
  for (const doc of docs) {
    await ctx.db.delete(doc._id);
  }
}

async function deleteScoresByRace(
  ctx: MutationCtx,
  raceId: Id<'races'>,
) {
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

async function deleteH2HScoresByUser(
  ctx: MutationCtx,
  userId: Id<'users'>,
) {
  const docs = await ctx.db
    .query('h2hScores')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect();
  for (const doc of docs) {
    await ctx.db.delete(doc._id);
  }
}

async function deleteH2HScoresByRace(
  ctx: MutationCtx,
  raceId: Id<'races'>,
) {
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
      qualiStartAt: now + 2 * DAY,
      qualiLockAt: now + 2 * DAY,
      raceStartAt: now + 3 * DAY,
      predictionLockAt: now + 3 * DAY,
    };
  }

  if (phase === 'locked_pending_results' || phase === 'partial_results') {
    return {
      status: 'locked',
      qualiStartAt: now - 26 * HOUR,
      qualiLockAt: now - 26 * HOUR,
      raceStartAt: now - 30 * MINUTE,
      predictionLockAt: now - 30 * MINUTE,
    };
  }

  return {
    status: 'finished',
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

function parseScenarioNameFromNamespace(namespace: string): ScenarioName | null {
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
  race_locked_signed_in_no_picks: true,
  race_locked_signed_in_complete_no_results: true,
  race_partial_results_standard: true,
  race_finished_scored_standard: true,
};
