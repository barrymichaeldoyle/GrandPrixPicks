import { v } from 'convex/values';

import type { Id } from './_generated/dataModel';
import {
  internalMutation,
  internalQuery,
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

async function ensureTestDrivers(ctx: MutationCtx) {
  let drivers = await ctx.db.query('drivers').withIndex('by_code').take(2);
  if (drivers.length >= 2) {
    return drivers;
  }

  const now = Date.now();
  const needed = 2 - drivers.length;
  const createdIds: Array<Id<'drivers'>> = [];
  for (let i = 0; i < needed; i += 1) {
    const index = drivers.length + i + 1;
    const driverId = await ctx.db.insert('drivers', {
      code: `T${index}`.slice(0, 3),
      displayName: `Test Driver ${index}`,
      createdAt: now,
      updatedAt: now,
    });
    createdIds.push(driverId);
  }

  const createdDrivers = await Promise.all(createdIds.map((id) => ctx.db.get(id)));
  return [
    ...drivers,
    ...createdDrivers.filter(
      (
        driver,
      ): driver is NonNullable<typeof driver> => driver !== null,
    ),
  ];
}

async function deleteDocs(
  ctx: MutationCtx,
  docs: Array<{ _id: string }>,
) {
  for (const doc of docs) {
    await ctx.db.delete(doc._id as Id<'users'>);
  }
}

function isPresent<T>(value: T | null): value is T {
  return value !== null;
}

export const createDeletionFixture = internalMutation({
  args: {
    namespace: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ns = args.namespace.trim();
    const primaryClerkUserId = `${ns}__primary`;
    const memberClerkUserId = `${ns}__member`;
    const ownerClerkUserId = `${ns}__owner`;

    const existingPrimary = await ctx.db
      .query('users')
      .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', primaryClerkUserId))
      .unique();
    if (existingPrimary) {
      return {
        namespace: ns,
        primaryUserId: existingPrimary._id,
        primaryClerkUserId,
        alreadyExisted: true,
      };
    }

    const [driver1, driver2] = await ensureTestDrivers(ctx);

    const primaryUserId = await ctx.db.insert('users', {
      clerkUserId: primaryClerkUserId,
      email: `${ns}__primary@example.com`,
      displayName: `${ns} Primary`,
      createdAt: now,
      updatedAt: now,
    });
    const memberUserId = await ctx.db.insert('users', {
      clerkUserId: memberClerkUserId,
      email: `${ns}__member@example.com`,
      displayName: `${ns} Member`,
      createdAt: now,
      updatedAt: now,
    });
    const ownerUserId = await ctx.db.insert('users', {
      clerkUserId: ownerClerkUserId,
      email: `${ns}__owner@example.com`,
      displayName: `${ns} Owner`,
      createdAt: now,
      updatedAt: now,
    });

    const raceId = await ctx.db.insert('races', {
      season: 2026,
      round: 999,
      name: `${ns} Test GP`,
      slug: `${ns.toLowerCase()}-test-gp-2026`,
      raceStartAt: now + 24 * 60 * 60 * 1000,
      predictionLockAt: now + 24 * 60 * 60 * 1000,
      status: 'upcoming',
      createdAt: now,
      updatedAt: now,
    });

    const matchupId = await ctx.db.insert('h2hMatchups', {
      season: 2026,
      team: `${ns} Team`,
      driver1Id: driver1._id,
      driver2Id: driver2._id,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('follows', {
      followerId: primaryUserId,
      followeeId: memberUserId,
      createdAt: now,
    });
    await ctx.db.insert('follows', {
      followerId: ownerUserId,
      followeeId: primaryUserId,
      createdAt: now,
    });
    await ctx.db.insert('supportRequests', {
      userId: primaryUserId,
      subject: `${ns} subject`,
      message: `${ns} message`,
      status: 'open',
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('userSeasonPasses', {
      userId: primaryUserId,
      season: 2026,
      paddleCheckoutId: `${ns}__checkout`,
      paddleProductId: `${ns}__product`,
      createdAt: now,
    });
    await ctx.db.insert('pushSubscriptions', {
      userId: primaryUserId,
      endpoint: `https://push.example.com/${ns}`,
      p256dh: `${ns}__p256dh`,
      auth: `${ns}__auth`,
      createdAt: now,
    });
    await ctx.db.insert('processedPaddleWebhookEvents', {
      eventId: `${ns}__event`,
      clerkUserId: primaryClerkUserId,
      season: 2026,
      status: 'processed',
      createdAt: now,
    });
    await ctx.db.insert('predictions', {
      userId: primaryUserId,
      raceId,
      sessionType: 'race',
      picks: [driver1._id, driver2._id, driver1._id, driver2._id, driver1._id].slice(
        0,
        5,
      ) as Array<Id<'drivers'>>,
      submittedAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('h2hPredictions', {
      userId: primaryUserId,
      raceId,
      sessionType: 'race',
      matchupId,
      predictedWinnerId: driver1._id,
      submittedAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('scores', {
      userId: primaryUserId,
      raceId,
      sessionType: 'race',
      points: 7,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('h2hScores', {
      userId: primaryUserId,
      raceId,
      sessionType: 'race',
      points: 1,
      correctPicks: 1,
      totalPicks: 1,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('seasonStandings', {
      userId: primaryUserId,
      season: 2026,
      totalPoints: 7,
      raceCount: 1,
      updatedAt: now,
    });
    await ctx.db.insert('h2hSeasonStandings', {
      userId: primaryUserId,
      season: 2026,
      totalPoints: 1,
      raceCount: 1,
      correctPicks: 1,
      totalPicks: 1,
      updatedAt: now,
    });

    const ownedLeagueId = await ctx.db.insert('leagues', {
      name: `${ns} Owned League`,
      slug: `${ns.toLowerCase()}-owned-league`,
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
      userId: memberUserId,
      role: 'member',
      joinedAt: now,
    });

    const soloLeagueId = await ctx.db.insert('leagues', {
      name: `${ns} Solo League`,
      slug: `${ns.toLowerCase()}-solo-league`,
      visibility: 'private',
      createdBy: primaryUserId,
      season: 2026,
      memberCount: 1,
      adminCount: 1,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('leagueMembers', {
      leagueId: soloLeagueId,
      userId: primaryUserId,
      role: 'admin',
      joinedAt: now,
    });

    const sharedLeagueId = await ctx.db.insert('leagues', {
      name: `${ns} Shared League`,
      slug: `${ns.toLowerCase()}-shared-league`,
      visibility: 'private',
      createdBy: ownerUserId,
      season: 2026,
      memberCount: 2,
      adminCount: 1,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('leagueMembers', {
      leagueId: sharedLeagueId,
      userId: ownerUserId,
      role: 'admin',
      joinedAt: now,
    });
    await ctx.db.insert('leagueMembers', {
      leagueId: sharedLeagueId,
      userId: primaryUserId,
      role: 'member',
      joinedAt: now,
    });

    return {
      namespace: ns,
      primaryUserId,
      primaryClerkUserId,
      ownedLeagueId,
      soloLeagueId,
      sharedLeagueId,
      alreadyExisted: false,
    };
  },
});

export const getDeletionFixtureState = internalQuery({
  args: {
    namespace: v.string(),
  },
  handler: async (ctx, args) => {
    const ns = args.namespace.trim();
    const primaryClerkUserId = `${ns}__primary`;
    const primaryUser = await ctx.db
      .query('users')
      .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', primaryClerkUserId))
      .unique();

    const leagueRows = await ctx.db.query('leagues').collect();
    const leagues = [];
    for (const league of leagueRows.filter((row) => row.name.startsWith(ns))) {
      const members = await ctx.db
        .query('leagueMembers')
        .withIndex('by_league', (q) => q.eq('leagueId', league._id))
        .take(20);
      leagues.push({
        name: league.name,
        slug: league.slug,
        createdBy: league.createdBy,
        memberCount: league.memberCount ?? null,
        adminCount: league.adminCount ?? null,
        actualMemberCount: members.length,
        actualAdminCount: members.filter((member) => member.role === 'admin')
          .length,
      });
    }

    if (!primaryUser) {
      return {
        namespace: ns,
        primaryExists: false,
        leagues,
      };
    }

    const [followsAsFollower, followsAsFollowee, supportRequests, passes, pushSubs] =
      await Promise.all([
        ctx.db
          .query('follows')
          .withIndex('by_follower', (q) => q.eq('followerId', primaryUser._id))
          .take(20),
        ctx.db
          .query('follows')
          .withIndex('by_followee', (q) => q.eq('followeeId', primaryUser._id))
          .take(20),
        ctx.db
          .query('supportRequests')
          .withIndex('by_user', (q) => q.eq('userId', primaryUser._id))
          .take(20),
        ctx.db
          .query('userSeasonPasses')
          .withIndex('by_user_season', (q) => q.eq('userId', primaryUser._id))
          .take(20),
        ctx.db
          .query('pushSubscriptions')
          .withIndex('by_user', (q) => q.eq('userId', primaryUser._id))
          .take(20),
      ]);

    const processedEvents = await ctx.db
      .query('processedPaddleWebhookEvents')
      .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', primaryClerkUserId))
      .take(20);
    const predictions = await ctx.db
      .query('predictions')
      .withIndex('by_user', (q) => q.eq('userId', primaryUser._id))
      .take(20);
    const h2hPredictions = await ctx.db
      .query('h2hPredictions')
      .withIndex('by_user_race_session', (q) => q.eq('userId', primaryUser._id))
      .take(20);
    const scores = await ctx.db
      .query('scores')
      .withIndex('by_user', (q) => q.eq('userId', primaryUser._id))
      .take(20);
    const h2hScores = await ctx.db
      .query('h2hScores')
      .withIndex('by_user', (q) => q.eq('userId', primaryUser._id))
      .take(20);
    const seasonStandings = await ctx.db
      .query('seasonStandings')
      .withIndex('by_user_season', (q) => q.eq('userId', primaryUser._id))
      .take(20);
    const h2hSeasonStandings = await ctx.db
      .query('h2hSeasonStandings')
      .withIndex('by_user_season', (q) => q.eq('userId', primaryUser._id))
      .take(20);

    return {
      namespace: ns,
      primaryExists: true,
      primaryUserId: primaryUser._id,
      deletingAt: primaryUser.deletingAt ?? null,
      counts: {
        followsAsFollower: followsAsFollower.length,
        followsAsFollowee: followsAsFollowee.length,
        supportRequests: supportRequests.length,
        userSeasonPasses: passes.length,
        pushSubscriptions: pushSubs.length,
        processedPaddleWebhookEvents: processedEvents.length,
        predictions: predictions.length,
        h2hPredictions: h2hPredictions.length,
        scores: scores.length,
        h2hScores: h2hScores.length,
        seasonStandings: seasonStandings.length,
        h2hSeasonStandings: h2hSeasonStandings.length,
      },
      leagues,
    };
  },
});

export const clearDeletionFixture = internalMutation({
  args: {
    namespace: v.string(),
  },
  handler: async (ctx, args) => {
    const ns = args.namespace.trim();
    const primaryClerkUserId = `${ns}__primary`;
    const memberClerkUserId = `${ns}__member`;
    const ownerClerkUserId = `${ns}__owner`;
    const raceSlug = `${ns.toLowerCase()}-test-gp-2026`;
    const leagueSlugs = [
      `${ns.toLowerCase()}-owned-league`,
      `${ns.toLowerCase()}-solo-league`,
      `${ns.toLowerCase()}-shared-league`,
    ];

    const users = (
      await Promise.all([
        ctx.db
          .query('users')
          .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', primaryClerkUserId))
          .unique(),
        ctx.db
          .query('users')
          .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', memberClerkUserId))
          .unique(),
        ctx.db
          .query('users')
          .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', ownerClerkUserId))
          .unique(),
      ])
    ).filter(isPresent);

    for (const user of users) {
      await deleteDocs(
        ctx,
        await ctx.db
          .query('follows')
          .withIndex('by_follower', (q) => q.eq('followerId', user._id))
          .collect(),
      );
      await deleteDocs(
        ctx,
        await ctx.db
          .query('follows')
          .withIndex('by_followee', (q) => q.eq('followeeId', user._id))
          .collect(),
      );
      await deleteDocs(
        ctx,
        await ctx.db
          .query('supportRequests')
          .withIndex('by_user', (q) => q.eq('userId', user._id))
          .collect(),
      );
      await deleteDocs(
        ctx,
        await ctx.db
          .query('userSeasonPasses')
          .withIndex('by_user_season', (q) => q.eq('userId', user._id))
          .collect(),
      );
      await deleteDocs(
        ctx,
        await ctx.db
          .query('pushSubscriptions')
          .withIndex('by_user', (q) => q.eq('userId', user._id))
          .collect(),
      );
      await deleteDocs(
        ctx,
        await ctx.db
          .query('predictions')
          .withIndex('by_user', (q) => q.eq('userId', user._id))
          .collect(),
      );
      await deleteDocs(
        ctx,
        await ctx.db
          .query('h2hPredictions')
          .withIndex('by_user_race_session', (q) => q.eq('userId', user._id))
          .collect(),
      );
      await deleteDocs(
        ctx,
        await ctx.db
          .query('scores')
          .withIndex('by_user', (q) => q.eq('userId', user._id))
          .collect(),
      );
      await deleteDocs(
        ctx,
        await ctx.db
          .query('h2hScores')
          .withIndex('by_user', (q) => q.eq('userId', user._id))
          .collect(),
      );
      await deleteDocs(
        ctx,
        await ctx.db
          .query('seasonStandings')
          .withIndex('by_user_season', (q) => q.eq('userId', user._id))
          .collect(),
      );
      await deleteDocs(
        ctx,
        await ctx.db
          .query('h2hSeasonStandings')
          .withIndex('by_user_season', (q) => q.eq('userId', user._id))
          .collect(),
      );
    }

    await deleteDocs(
      ctx,
      await ctx.db
        .query('processedPaddleWebhookEvents')
        .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', primaryClerkUserId))
        .collect(),
    );

    const leagues = (
      await Promise.all(
        leagueSlugs.map((slug) =>
          ctx.db.query('leagues').withIndex('by_slug', (q) => q.eq('slug', slug)).unique(),
        ),
      )
    ).filter(isPresent);

    for (const league of leagues) {
      await deleteDocs(
        ctx,
        await ctx.db
          .query('leagueMembers')
          .withIndex('by_league', (q) => q.eq('leagueId', league._id))
          .collect(),
      );
      await ctx.db.delete(league._id);
    }

    const race = await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', raceSlug))
      .unique();
    if (race) {
      await ctx.db.delete(race._id);
    }

    for (const matchup of await ctx.db.query('h2hMatchups').collect()) {
      if (matchup.team === `${ns} Team`) {
        await ctx.db.delete(matchup._id);
      }
    }

    for (const user of users) {
      await ctx.db.delete(user._id);
    }

    return {
      namespace: ns,
      deletedUsers: users.length,
      deletedLeagues: leagues.length,
      deletedRace: race !== null,
    };
  },
});

export const createLeagueBackfillFixture = internalMutation({
  args: {
    namespace: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const ns = args.namespace.trim();
    const slug = `${ns.toLowerCase()}-backfill-league`;

    const existing = await ctx.db
      .query('leagues')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique();
    if (existing) {
      return { slug, leagueId: existing._id, alreadyExisted: true };
    }

    const adminUserId = await ctx.db.insert('users', {
      clerkUserId: `${ns}__backfill_admin`,
      email: `${ns}__backfill_admin@example.com`,
      displayName: `${ns} Backfill Admin`,
      createdAt: now,
      updatedAt: now,
    });
    const memberUserId = await ctx.db.insert('users', {
      clerkUserId: `${ns}__backfill_member`,
      email: `${ns}__backfill_member@example.com`,
      displayName: `${ns} Backfill Member`,
      createdAt: now,
      updatedAt: now,
    });

    const leagueId = await ctx.db.insert('leagues', {
      name: `${ns} Backfill League`,
      slug,
      visibility: 'private',
      createdBy: adminUserId,
      season: 2026,
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert('leagueMembers', {
      leagueId,
      userId: adminUserId,
      role: 'admin',
      joinedAt: now,
    });
    await ctx.db.insert('leagueMembers', {
      leagueId,
      userId: memberUserId,
      role: 'member',
      joinedAt: now,
    });

    return { slug, leagueId, alreadyExisted: false };
  },
});

export const getLeagueBackfillFixtureState = internalQuery({
  args: {
    slug: v.string(),
  },
  handler: async (ctx, args) => {
    const league = await ctx.db
      .query('leagues')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();
    if (!league) {
      return null;
    }

    const members = await ctx.db
      .query('leagueMembers')
      .withIndex('by_league', (q) => q.eq('leagueId', league._id))
      .take(20);

    return {
      leagueId: league._id,
      slug: league.slug,
      memberCount: league.memberCount ?? null,
      adminCount: league.adminCount ?? null,
      actualMemberCount: members.length,
      actualAdminCount: members.filter((member) => member.role === 'admin')
        .length,
    };
  },
});

export const clearLeagueBackfillFixture = internalMutation({
  args: {
    namespace: v.string(),
  },
  handler: async (ctx, args) => {
    const ns = args.namespace.trim();
    const slug = `${ns.toLowerCase()}-backfill-league`;
    const adminClerkUserId = `${ns}__backfill_admin`;
    const memberClerkUserId = `${ns}__backfill_member`;

    const league = await ctx.db
      .query('leagues')
      .withIndex('by_slug', (q) => q.eq('slug', slug))
      .unique();
    if (league) {
      await deleteDocs(
        ctx,
        await ctx.db
          .query('leagueMembers')
          .withIndex('by_league', (q) => q.eq('leagueId', league._id))
          .collect(),
      );
      await ctx.db.delete(league._id);
    }

    const users = (
      await Promise.all([
        ctx.db
          .query('users')
          .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', adminClerkUserId))
          .unique(),
        ctx.db
          .query('users')
          .withIndex('by_clerkUserId', (q) => q.eq('clerkUserId', memberClerkUserId))
          .unique(),
      ])
    ).filter(isPresent);

    for (const user of users) {
      await ctx.db.delete(user._id);
    }

    return {
      namespace: ns,
      deletedLeague: league !== null,
      deletedUsers: users.length,
    };
  },
});
