import { v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import {
  internalMutation,
  type MutationCtx,
  mutation,
} from './_generated/server';
import { getRaceTimeZoneFromSlug } from './lib/raceTimezones';
import { scheduleReminder } from './notifications';

/**
 * Test helper mutations for Playwright e2e tests.
 * These are internal mutations - they can only be called from the Convex dashboard
 * or via the ConvexHttpClient with proper authentication.
 *
 * IMPORTANT: Only deploy this file to test deployments, not production.
 */

// Create a test user directly (bypasses Clerk for e2e tests)
export const createTestUser = internalMutation({
  args: {
    clerkUserId: v.string(),
    displayName: v.string(),
    email: v.optional(v.string()),
    isAdmin: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if user already exists
    const existing = await ctx.db
      .query('users')
      .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', args.clerkUserId))
      .unique();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert('users', {
      clerkUserId: args.clerkUserId,
      displayName: args.displayName,
      email: args.email,
      isAdmin: args.isAdmin ?? false,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Create a test race with controllable timing
export const createTestRace = internalMutation({
  args: {
    name: v.string(),
    slug: v.string(),
    round: v.number(),
    startsInMs: v.number(), // positive = future, negative = past
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const raceStartAt = now + args.startsInMs;
    const predictionLockAt = raceStartAt;
    const timeZone = getRaceTimeZoneFromSlug(args.slug);

    // Check if race already exists
    const existing = await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert('races', {
      season: 2026,
      round: args.round,
      name: args.name,
      slug: args.slug,
      timeZone,
      raceStartAt,
      predictionLockAt,
      status: args.status ?? 'upcoming',
      createdAt: now,
      updatedAt: now,
    });
  },
});

const sessionTypeValidator = v.union(
  v.literal('quali'),
  v.literal('sprint_quali'),
  v.literal('sprint'),
  v.literal('race'),
);

// Create test prediction for a user
export const createTestPrediction = internalMutation({
  args: {
    userId: v.id('users'),
    raceId: v.id('races'),
    picks: v.array(v.id('drivers')),
    sessionType: v.optional(sessionTypeValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const sessionType = args.sessionType ?? 'race';

    // Check if prediction already exists
    const existing = await ctx.db
      .query('predictions')
      .withIndex('by_user_race_session', (q) =>
        q
          .eq('userId', args.userId)
          .eq('raceId', args.raceId)
          .eq('sessionType', sessionType),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        picks: args.picks,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert('predictions', {
      userId: args.userId,
      raceId: args.raceId,
      sessionType,
      picks: args.picks,
      submittedAt: now,
      updatedAt: now,
    });
  },
});

// Publish test results for a race
export const publishTestResults = internalMutation({
  args: {
    raceId: v.id('races'),
    classification: v.array(v.id('drivers')),
    sessionType: v.optional(sessionTypeValidator),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const sessionType = args.sessionType ?? 'race';

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
      return existing._id;
    }

    return await ctx.db.insert('results', {
      raceId: args.raceId,
      sessionType,
      classification: args.classification,
      publishedAt: now,
      updatedAt: now,
    });
  },
});

// Clean up all test data (keeps drivers as reference data)
export const cleanupTestData = internalMutation({
  args: {
    keepDrivers: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const keepDrivers = args.keepDrivers ?? true;
    const tables = [
      'scores',
      'predictions',
      'results',
      'races',
      'users',
    ] as const;

    const counts: Record<string, number> = {};

    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      counts[table] = docs.length;
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
    }

    if (!keepDrivers) {
      const drivers = await ctx.db.query('drivers').collect();
      counts['drivers'] = drivers.length;
      for (const driver of drivers) {
        await ctx.db.delete(driver._id);
      }
    }

    return { deleted: counts };
  },
});

// Clear all predictions including H2H (dev/test only)
export const clearAllPredictions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const tables = ['predictions', 'h2hPredictions', 'h2hScores'] as const;
    const counts: Record<string, number> = {};

    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      counts[table] = docs.length;
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
      }
    }

    return { deleted: counts };
  },
});

// Clear one user's predictions/scores/standings (dev/test helper)
export const clearUserCompetitionData = internalMutation({
  args: {
    email: v.optional(v.string()),
    username: v.optional(v.string()),
    clerkUserId: v.optional(v.string()),
    clearPredictions: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const clearPredictions = args.clearPredictions ?? true;
    const email = args.email?.trim().toLowerCase();

    const user = args.clerkUserId
      ? await ctx.db
          .query('users')
          .withIndex('by_clerkUserId', (q) =>
            q.eq('clerkUserId', args.clerkUserId!),
          )
          .unique()
      : args.username
        ? await ctx.db
            .query('users')
            .withIndex('by_username', (q) => q.eq('username', args.username))
            .unique()
        : email
          ? ((await ctx.db.query('users').collect()).find(
              (u) => u.email?.trim().toLowerCase() === email,
            ) ?? null)
          : null;

    if (!user) {
      throw new Error('User not found');
    }

    const deleted = {
      predictions: 0,
      scores: 0,
      h2hPredictions: 0,
      h2hScores: 0,
      seasonStandings: 0,
      h2hSeasonStandings: 0,
    };

    if (clearPredictions) {
      const predictions = await ctx.db
        .query('predictions')
        .withIndex('by_user', (q) => q.eq('userId', user._id))
        .collect();
      for (const doc of predictions) {
        await ctx.db.delete(doc._id);
      }
      deleted.predictions = predictions.length;

      const h2hPredictions = await ctx.db
        .query('h2hPredictions')
        .withIndex('by_user_race_session', (q) => q.eq('userId', user._id))
        .collect();
      for (const doc of h2hPredictions) {
        await ctx.db.delete(doc._id);
      }
      deleted.h2hPredictions = h2hPredictions.length;
    }

    const scores = await ctx.db
      .query('scores')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();
    for (const doc of scores) {
      await ctx.db.delete(doc._id);
    }
    deleted.scores = scores.length;

    const h2hScores = await ctx.db
      .query('h2hScores')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .collect();
    for (const doc of h2hScores) {
      await ctx.db.delete(doc._id);
    }
    deleted.h2hScores = h2hScores.length;

    const standings = await ctx.db
      .query('seasonStandings')
      .withIndex('by_user_season', (q) => q.eq('userId', user._id))
      .collect();
    for (const doc of standings) {
      await ctx.db.delete(doc._id);
    }
    deleted.seasonStandings = standings.length;

    const h2hStandings = await ctx.db
      .query('h2hSeasonStandings')
      .withIndex('by_user_season', (q) => q.eq('userId', user._id))
      .collect();
    for (const doc of h2hStandings) {
      await ctx.db.delete(doc._id);
    }
    deleted.h2hSeasonStandings = h2hStandings.length;

    return {
      userId: user._id,
      email: user.email ?? null,
      username: user.username ?? null,
      clerkUserId: user.clerkUserId,
      clearPredictions,
      deleted,
    };
  },
});

// Get all driver IDs (useful for creating test predictions)
export const getDriverIds = internalMutation({
  args: {},
  handler: async (ctx) => {
    const drivers = await ctx.db.query('drivers').collect();
    return drivers.map((d) => ({ id: d._id, code: d.code }));
  },
});

type TestScenario =
  | 'upcoming_race'
  | 'locked_race'
  | 'finished_race'
  | 'full_season';

// Set up complete test scenarios
export const seedTestScenario = internalMutation({
  args: {
    scenario: v.union(
      v.literal('upcoming_race'),
      v.literal('locked_race'),
      v.literal('finished_race'),
      v.literal('full_season'),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const HOUR = 60 * 60 * 1000;
    const DAY = 24 * HOUR;

    // Get drivers for predictions
    const drivers = await ctx.db.query('drivers').collect();
    if (drivers.length < 5) {
      throw new Error(
        'Seed drivers first using: npx convex run seed:seedDrivers',
      );
    }

    const driverIds = drivers.map((d) => d._id);

    // Create test user
    const userId = await ctx.db.insert('users', {
      clerkUserId: 'test_user_e2e',
      displayName: 'Test User',
      email: 'testuser@example.com',
      isAdmin: false,
      createdAt: now,
      updatedAt: now,
    });

    // Create admin user
    const adminId = await ctx.db.insert('users', {
      clerkUserId: 'test_admin_e2e',
      displayName: 'Test Admin',
      email: 'testadmin@example.com',
      isAdmin: true,
      createdAt: now,
      updatedAt: now,
    });

    const result: {
      scenario: TestScenario;
      userId: Id<'users'>;
      adminId: Id<'users'>;
      driverIds: Array<Id<'drivers'>>;
      raceId?: Id<'races'>;
      races?: Array<{ id: Id<'races'>; slug: string; status: string }>;
    } = {
      scenario: args.scenario,
      userId,
      adminId,
      driverIds,
    };

    if (args.scenario === 'upcoming_race') {
      // Race in 7 days, predictions open (lock at race start)
      const raceId = await ctx.db.insert('races', {
        season: 2026,
        round: 99,
        name: 'Test Grand Prix',
        slug: 'test-gp-2026',
        raceStartAt: now + 7 * DAY,
        predictionLockAt: now + 7 * DAY,
        status: 'upcoming',
        createdAt: now,
        updatedAt: now,
      });
      result.raceId = raceId;
    }

    if (args.scenario === 'locked_race') {
      // Race "started" 30 mins ago (lock = race start, so predictions locked)
      const raceId = await ctx.db.insert('races', {
        season: 2026,
        round: 98,
        name: 'Locked Test GP',
        slug: 'locked-test-gp-2026',
        raceStartAt: now - 30 * 60 * 1000,
        predictionLockAt: now - 30 * 60 * 1000,
        status: 'locked',
        createdAt: now,
        updatedAt: now,
      });

      // User already made a prediction before lock
      await ctx.db.insert('predictions', {
        userId,
        raceId,
        sessionType: 'race',
        picks: driverIds.slice(0, 5),
        submittedAt: now - 2 * HOUR,
        updatedAt: now - 2 * HOUR,
      });

      result.raceId = raceId;
    }

    if (args.scenario === 'finished_race') {
      // Race finished yesterday (lock at race start)
      const raceId = await ctx.db.insert('races', {
        season: 2026,
        round: 97,
        name: 'Finished Test GP',
        slug: 'finished-test-gp-2026',
        raceStartAt: now - DAY,
        predictionLockAt: now - DAY,
        status: 'finished',
        createdAt: now,
        updatedAt: now,
      });

      // User prediction
      const picks = driverIds.slice(0, 5);
      await ctx.db.insert('predictions', {
        userId,
        raceId,
        sessionType: 'race',
        picks,
        submittedAt: now - 2 * DAY,
        updatedAt: now - 2 * DAY,
      });

      // Race results (shuffled order for scoring)
      const classification = [...driverIds];
      // Shuffle to make it interesting
      for (let i = classification.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [classification[i], classification[j]] = [
          classification[j],
          classification[i],
        ];
      }

      await ctx.db.insert('results', {
        raceId,
        sessionType: 'race',
        classification,
        publishedAt: now - 12 * HOUR,
        updatedAt: now - 12 * HOUR,
      });

      result.raceId = raceId;
    }

    if (args.scenario === 'full_season') {
      const races: Array<{ id: Id<'races'>; slug: string; status: string }> =
        [];

      // Past finished race (lock at race start)
      const finishedRaceId = await ctx.db.insert('races', {
        season: 2026,
        round: 1,
        name: 'Season Opener GP',
        slug: 'season-opener-2026',
        raceStartAt: now - 14 * DAY,
        predictionLockAt: now - 14 * DAY,
        status: 'finished',
        createdAt: now,
        updatedAt: now,
      });
      races.push({
        id: finishedRaceId,
        slug: 'season-opener-2026',
        status: 'finished',
      });

      // Add prediction and results for finished race
      await ctx.db.insert('predictions', {
        userId,
        raceId: finishedRaceId,
        sessionType: 'race',
        picks: driverIds.slice(0, 5),
        submittedAt: now - 15 * DAY,
        updatedAt: now - 15 * DAY,
      });

      await ctx.db.insert('results', {
        raceId: finishedRaceId,
        sessionType: 'race',
        classification: driverIds,
        publishedAt: now - 13 * DAY,
        updatedAt: now - 13 * DAY,
      });

      // Current upcoming race (lock at race start)
      const upcomingRaceId = await ctx.db.insert('races', {
        season: 2026,
        round: 2,
        name: 'Current GP',
        slug: 'current-gp-2026',
        raceStartAt: now + 3 * DAY,
        predictionLockAt: now + 3 * DAY,
        status: 'upcoming',
        createdAt: now,
        updatedAt: now,
      });
      races.push({
        id: upcomingRaceId,
        slug: 'current-gp-2026',
        status: 'upcoming',
      });

      // Future race (lock at race start)
      const futureRaceId = await ctx.db.insert('races', {
        season: 2026,
        round: 3,
        name: 'Future GP',
        slug: 'future-gp-2026',
        raceStartAt: now + 17 * DAY,
        predictionLockAt: now + 17 * DAY,
        status: 'upcoming',
        createdAt: now,
        updatedAt: now,
      });
      races.push({
        id: futureRaceId,
        slug: 'future-gp-2026',
        status: 'upcoming',
      });

      result.races = races;
      result.raceId = upcomingRaceId;
    }

    return result;
  },
});

const REMINDER_DELAY_MINUTES = 5;

/**
 * DEV ONLY: Clear your predictions for a race and reschedule the reminder
 * so it fires in ~5 minutes. Sets quali to start 24h + REMINDER_DELAY_MINUTES from now.
 *
 * Run via: npx convex run testing:setupReminderTest '{"raceSlug": "australia-2026"}'
 */
export const setupReminderTest = mutation({
  args: { raceSlug: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const HOUR = 60 * 60 * 1000;
    const MINUTE = 60 * 1000;

    // Find the race
    const race = await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', args.raceSlug))
      .first();
    if (!race) {
      throw new Error(`Race not found: ${args.raceSlug}`);
    }

    // Clear all predictions for this race
    const predictions = await ctx.db
      .query('predictions')
      .withIndex('by_race_session', (q) => q.eq('raceId', race._id))
      .collect();
    for (const p of predictions) {
      await ctx.db.delete(p._id);
    }

    // Set quali to 24h + REMINDER_DELAY_MINUTES from now so reminder fires in ~5 mins
    const qualiStartAt = now + 24 * HOUR + REMINDER_DELAY_MINUTES * MINUTE;
    const raceStartAt = now + 48 * HOUR;

    await ctx.db.patch(race._id, {
      qualiStartAt,
      qualiLockAt: qualiStartAt,
      raceStartAt,
      predictionLockAt: raceStartAt,
      status: 'upcoming',
      updatedAt: now,
    });

    // Schedule the reminder (fires ~30 mins from now)
    const updatedRace = await ctx.db.get(race._id);
    if (updatedRace) {
      await scheduleReminder(ctx, updatedRace);
    }

    return {
      raceId: race._id,
      predictionsCleared: predictions.length,
      qualiStartAt: new Date(qualiStartAt).toISOString(),
      reminderFiresAt: new Date(qualiStartAt - 24 * HOUR).toISOString(),
    };
  },
});

async function deleteDocs(
  ctx: MutationCtx,
  docs: Array<{ _id: string }>,
) {
  for (const doc of docs) {
    await ctx.db.delete(doc._id as never);
  }
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}

async function findUserByEmail(ctx: MutationCtx, email?: string) {
  if (!email) {
    return null;
  }

  for await (const user of ctx.db.query('users')) {
    if (user.email === email) {
      return user;
    }
  }

  return null;
}

async function upsertLeagueSmokeUser(
  ctx: MutationCtx,
  args: {
    clerkUserId: string;
    email?: string;
    displayName: string;
  },
) {
  const now = Date.now();
  const existingByClerkUserId = await ctx.db
    .query('users')
    .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', args.clerkUserId))
    .unique();
  const existingByEmail =
    existingByClerkUserId || !args.email
      ? null
      : await findUserByEmail(ctx, args.email);
  const existing = existingByClerkUserId ?? existingByEmail;

  if (existing) {
    await ctx.db.patch(existing._id, {
      email: args.email ?? existing.email,
      displayName: args.displayName,
      updatedAt: now,
    });
    return existing._id;
  }

  return await ctx.db.insert('users', {
    clerkUserId: args.clerkUserId,
    email: args.email,
    displayName: args.displayName,
    createdAt: now,
    updatedAt: now,
  });
}

export const createLeagueSmokeFixture = internalMutation({
  args: {
    namespace: v.string(),
    primaryClerkUserId: v.string(),
    primaryEmail: v.optional(v.string()),
    primaryDisplayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ns = args.namespace.trim();
    const ownedLeagueSlug = `${ns.toLowerCase()}-pit-wall`;
    const publicLeagueSlug = `${ns.toLowerCase()}-open-paddock`;
    const mateClerkUserId = `${ns}__mate`;
    const hostClerkUserId = `${ns}__host`;

    const existingLeagues = (
      await Promise.all([
        ctx.db
          .query('leagues')
          .withIndex('by_slug', (q) => q.eq('slug', ownedLeagueSlug))
          .unique(),
        ctx.db
          .query('leagues')
          .withIndex('by_slug', (q) => q.eq('slug', publicLeagueSlug))
          .unique(),
      ])
    ).filter(isPresent);

    for (const league of existingLeagues) {
      await deleteDocs(
        ctx,
        await ctx.db
          .query('leagueMembers')
          .withIndex('by_league', (q) => q.eq('leagueId', league._id))
          .collect(),
      );
      await ctx.db.delete(league._id);
    }

    const primaryUserId = await upsertLeagueSmokeUser(ctx, {
      clerkUserId: args.primaryClerkUserId,
      email: args.primaryEmail,
      displayName: args.primaryDisplayName ?? 'Scenario Primary',
    });
    const mateUserId = await upsertLeagueSmokeUser(ctx, {
      clerkUserId: mateClerkUserId,
      email: `${ns}__mate@example.com`,
      displayName: 'League Mate',
    });
    const hostUserId = await upsertLeagueSmokeUser(ctx, {
      clerkUserId: hostClerkUserId,
      email: `${ns}__host@example.com`,
      displayName: 'League Host',
    });

    const ownedLeagueId = await ctx.db.insert('leagues', {
      name: 'Pit Wall Club',
      slug: ownedLeagueSlug,
      description: 'A private test league for smoke coverage.',
      visibility: 'private',
      createdBy: primaryUserId,
      season: 2026,
      memberCount: 2,
      adminCount: 1,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('leagueMembers', {
      leagueId: ownedLeagueId,
      userId: primaryUserId,
      role: 'admin',
      joinedAt: now,
    });
    await ctx.db.insert('leagueMembers', {
      leagueId: ownedLeagueId,
      userId: mateUserId,
      role: 'member',
      joinedAt: now,
    });

    const publicLeagueId = await ctx.db.insert('leagues', {
      name: 'Open Paddock',
      slug: publicLeagueSlug,
      description: 'A public league for discover-tab smoke coverage.',
      visibility: 'public',
      createdBy: hostUserId,
      season: 2026,
      memberCount: 1,
      adminCount: 1,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('leagueMembers', {
      leagueId: publicLeagueId,
      userId: hostUserId,
      role: 'admin',
      joinedAt: now,
    });

    return {
      namespace: ns,
      ownedLeague: {
        id: ownedLeagueId,
        name: 'Pit Wall Club',
        slug: ownedLeagueSlug,
        route: `/leagues/${ownedLeagueSlug}`,
      },
      publicLeague: {
        id: publicLeagueId,
        name: 'Open Paddock',
        slug: publicLeagueSlug,
        route: `/leagues/${publicLeagueSlug}`,
      },
    };
  },
});
