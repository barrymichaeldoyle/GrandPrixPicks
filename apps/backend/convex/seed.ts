import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { internalAction, internalMutation } from './_generated/server';
import { scheduleSessionLockNotifications } from './inAppNotifications';
import { getRaceTimeZoneFromSlug } from './lib/raceTimezones';
import { scoreTopFive } from './lib/scoring';
import { scheduleReminder } from './notifications';

type SessionType = 'quali' | 'sprint_quali' | 'sprint' | 'race';

const F1_DRIVERS_2026 = [
  // McLaren (Constructors' Champions)
  {
    code: 'NOR',
    givenName: 'Lando',
    familyName: 'Norris',
    displayName: 'Lando Norris',
    number: 1,
    team: 'McLaren',
    nationality: 'GB',
  },
  {
    code: 'PIA',
    givenName: 'Oscar',
    familyName: 'Piastri',
    displayName: 'Oscar Piastri',
    number: 81,
    team: 'McLaren',
    nationality: 'AU',
  },

  // Ferrari
  {
    code: 'LEC',
    givenName: 'Charles',
    familyName: 'Leclerc',
    displayName: 'Charles Leclerc',
    number: 16,
    team: 'Ferrari',
    nationality: 'MC',
  },
  {
    code: 'HAM',
    givenName: 'Lewis',
    familyName: 'Hamilton',
    displayName: 'Lewis Hamilton',
    number: 44,
    team: 'Ferrari',
    nationality: 'GB',
  },

  // Red Bull Racing
  {
    code: 'VER',
    givenName: 'Max',
    familyName: 'Verstappen',
    displayName: 'Max Verstappen',
    number: 3,
    team: 'Red Bull Racing',
    nationality: 'NL',
  },
  {
    code: 'HAD',
    givenName: 'Isack',
    familyName: 'Hadjar',
    displayName: 'Isack Hadjar',
    number: 6,
    team: 'Red Bull Racing',
    nationality: 'FR',
  },

  // Mercedes
  {
    code: 'RUS',
    givenName: 'George',
    familyName: 'Russell',
    displayName: 'George Russell',
    number: 63,
    team: 'Mercedes',
    nationality: 'GB',
  },
  {
    code: 'ANT',
    givenName: 'Kimi',
    familyName: 'Antonelli',
    displayName: 'Kimi Antonelli',
    number: 12,
    team: 'Mercedes',
    nationality: 'IT',
  },

  // Aston Martin
  {
    code: 'ALO',
    givenName: 'Fernando',
    familyName: 'Alonso',
    displayName: 'Fernando Alonso',
    number: 14,
    team: 'Aston Martin',
    nationality: 'ES',
  },
  {
    code: 'STR',
    givenName: 'Lance',
    familyName: 'Stroll',
    displayName: 'Lance Stroll',
    number: 18,
    team: 'Aston Martin',
    nationality: 'CA',
  },

  // Alpine
  {
    code: 'GAS',
    givenName: 'Pierre',
    familyName: 'Gasly',
    displayName: 'Pierre Gasly',
    number: 10,
    team: 'Alpine',
    nationality: 'FR',
  },
  {
    code: 'COL',
    givenName: 'Franco',
    familyName: 'Colapinto',
    displayName: 'Franco Colapinto',
    number: 43,
    team: 'Alpine',
    nationality: 'AR',
  },

  // Williams
  {
    code: 'ALB',
    givenName: 'Alex',
    familyName: 'Albon',
    displayName: 'Alex Albon',
    number: 23,
    team: 'Williams',
    nationality: 'TH',
  },
  {
    code: 'SAI',
    givenName: 'Carlos',
    familyName: 'Sainz',
    displayName: 'Carlos Sainz',
    number: 55,
    team: 'Williams',
    nationality: 'ES',
  },

  // Racing Bulls
  {
    code: 'LAW',
    givenName: 'Liam',
    familyName: 'Lawson',
    displayName: 'Liam Lawson',
    number: 30,
    team: 'Racing Bulls',
    nationality: 'NZ',
  },
  {
    code: 'LIN',
    givenName: 'Arvid',
    familyName: 'Lindblad',
    displayName: 'Arvid Lindblad',
    number: 41,
    team: 'Racing Bulls',
    nationality: 'GB',
  },

  // Audi (formerly Sauber)
  {
    code: 'HUL',
    givenName: 'Nico',
    familyName: 'Hülkenberg',
    displayName: 'Nico Hülkenberg',
    number: 27,
    team: 'Audi',
    nationality: 'DE',
  },
  {
    code: 'BOR',
    givenName: 'Gabriel',
    familyName: 'Bortoleto',
    displayName: 'Gabriel Bortoleto',
    number: 5,
    team: 'Audi',
    nationality: 'BR',
  },

  // Haas
  {
    code: 'OCO',
    givenName: 'Esteban',
    familyName: 'Ocon',
    displayName: 'Esteban Ocon',
    number: 31,
    team: 'Haas',
    nationality: 'FR',
  },
  {
    code: 'BEA',
    givenName: 'Oliver',
    familyName: 'Bearman',
    displayName: 'Oliver Bearman',
    number: 87,
    team: 'Haas',
    nationality: 'GB',
  },

  // Cadillac (New for 2026)
  {
    code: 'BOT',
    givenName: 'Valtteri',
    familyName: 'Bottas',
    displayName: 'Valtteri Bottas',
    number: 77,
    team: 'Cadillac',
    nationality: 'FI',
  },
  {
    code: 'PER',
    givenName: 'Sergio',
    familyName: 'Pérez',
    displayName: 'Sergio Pérez',
    number: 11,
    team: 'Cadillac',
    nationality: 'MX',
  },
];

export const seedDrivers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let created = 0;
    let updated = 0;

    for (const driver of F1_DRIVERS_2026) {
      // Check if driver already exists by code
      const existing = await ctx.db
        .query('drivers')
        .withIndex('by_code', (q) => q.eq('code', driver.code))
        .first();

      if (existing) {
        // Update existing driver with new fields (team, number)
        await ctx.db.patch(existing._id, {
          ...driver,
          updatedAt: now,
        });
        updated++;
        continue;
      }

      await ctx.db.insert('drivers', {
        ...driver,
        createdAt: now,
        updatedAt: now,
      });
      created++;
    }

    return { created, updated, total: F1_DRIVERS_2026.length };
  },
});

// 2026 F1 Calendar
// Standard weekend: Fri practice, Sat quali, Sun race
// Sprint weekend: Fri sprint quali, Sat sprint + quali, Sun race
// Times are approximate based on typical F1 scheduling
const F1_RACES_2026: Array<{
  round: number;
  name: string;
  slug: string;
  raceDate: string;
  qualiDate: string;
  hasSprint?: boolean;
  sprintQualiDate?: string;
  sprintDate?: string;
  cancelled?: boolean;
}> = [
  {
    round: 1,
    name: 'Australian Grand Prix',
    slug: 'australia-2026',
    qualiDate: '2026-03-07T05:00:00Z',
    raceDate: '2026-03-08T04:00:00Z',
  },
  {
    round: 2,
    name: 'Chinese Grand Prix',
    slug: 'china-2026',
    hasSprint: true,
    sprintQualiDate: '2026-03-13T07:30:00Z',
    sprintDate: '2026-03-14T03:00:00Z',
    qualiDate: '2026-03-14T07:00:00Z',
    raceDate: '2026-03-15T07:00:00Z',
  },
  {
    round: 3,
    name: 'Japanese Grand Prix',
    slug: 'japan-2026',
    qualiDate: '2026-03-28T06:00:00Z',
    raceDate: '2026-03-29T05:00:00Z',
  },
  {
    round: 4,
    name: 'Bahrain Grand Prix',
    slug: 'bahrain-2026',
    qualiDate: '2026-04-11T16:00:00Z',
    raceDate: '2026-04-12T15:00:00Z',
    cancelled: true,
  },
  {
    round: 5,
    name: 'Saudi Arabian Grand Prix',
    slug: 'saudi-arabia-2026',
    qualiDate: '2026-04-18T17:00:00Z',
    raceDate: '2026-04-19T17:00:00Z',
    cancelled: true,
  },
  {
    round: 6,
    name: 'Miami Grand Prix',
    slug: 'miami-2026',
    hasSprint: true,
    sprintQualiDate: '2026-05-01T20:30:00Z',
    sprintDate: '2026-05-02T16:00:00Z',
    qualiDate: '2026-05-02T20:00:00Z',
    raceDate: '2026-05-03T20:00:00Z',
  },
  {
    round: 7,
    name: 'Canadian Grand Prix',
    slug: 'canada-2026',
    hasSprint: true,
    sprintQualiDate: '2026-05-22T20:30:00Z',
    sprintDate: '2026-05-23T16:00:00Z',
    qualiDate: '2026-05-23T20:00:00Z',
    raceDate: '2026-05-24T20:00:00Z',
  },
  {
    round: 8,
    name: 'Monaco Grand Prix',
    slug: 'monaco-2026',
    qualiDate: '2026-06-06T14:00:00Z',
    raceDate: '2026-06-07T13:00:00Z',
  },
  {
    round: 9,
    name: 'Spanish Grand Prix',
    slug: 'spain-2026',
    qualiDate: '2026-06-13T14:00:00Z',
    raceDate: '2026-06-14T13:00:00Z',
  },
  {
    round: 10,
    name: 'Austrian Grand Prix',
    slug: 'austria-2026',
    qualiDate: '2026-06-27T14:00:00Z',
    raceDate: '2026-06-28T13:00:00Z',
  },
  {
    round: 11,
    name: 'British Grand Prix',
    slug: 'britain-2026',
    hasSprint: true,
    sprintQualiDate: '2026-07-03T15:30:00Z',
    sprintDate: '2026-07-04T11:00:00Z',
    qualiDate: '2026-07-04T15:00:00Z',
    raceDate: '2026-07-05T14:00:00Z',
  },
  {
    round: 12,
    name: 'Belgian Grand Prix',
    slug: 'belgium-2026',
    qualiDate: '2026-07-18T14:00:00Z',
    raceDate: '2026-07-19T13:00:00Z',
  },
  {
    round: 13,
    name: 'Hungarian Grand Prix',
    slug: 'hungary-2026',
    qualiDate: '2026-07-25T14:00:00Z',
    raceDate: '2026-07-26T13:00:00Z',
  },
  {
    round: 14,
    name: 'Dutch Grand Prix',
    slug: 'netherlands-2026',
    hasSprint: true,
    sprintQualiDate: '2026-08-21T14:30:00Z',
    sprintDate: '2026-08-22T10:00:00Z',
    qualiDate: '2026-08-22T14:00:00Z',
    raceDate: '2026-08-23T13:00:00Z',
  },
  {
    round: 15,
    name: 'Italian Grand Prix',
    slug: 'italy-2026',
    qualiDate: '2026-09-05T14:00:00Z',
    raceDate: '2026-09-06T13:00:00Z',
  },
  {
    round: 16,
    name: 'Madrid Grand Prix',
    slug: 'madrid-2026',
    qualiDate: '2026-09-12T14:00:00Z',
    raceDate: '2026-09-13T13:00:00Z',
  },
  {
    round: 17,
    name: 'Azerbaijan Grand Prix',
    slug: 'azerbaijan-2026',
    qualiDate: '2026-09-25T12:00:00Z',
    raceDate: '2026-09-26T11:00:00Z',
  },
  {
    round: 18,
    name: 'Singapore Grand Prix',
    slug: 'singapore-2026',
    hasSprint: true,
    sprintQualiDate: '2026-10-10T12:30:00Z',
    sprintDate: '2026-10-11T09:00:00Z',
    qualiDate: '2026-10-10T13:00:00Z',
    raceDate: '2026-10-11T12:00:00Z',
  },
  {
    round: 19,
    name: 'United States Grand Prix',
    slug: 'usa-2026',
    qualiDate: '2026-10-24T21:00:00Z',
    raceDate: '2026-10-25T20:00:00Z',
  },
  {
    round: 20,
    name: 'Mexican Grand Prix',
    slug: 'mexico-2026',
    qualiDate: '2026-10-31T21:00:00Z',
    raceDate: '2026-11-01T20:00:00Z',
  },
  {
    round: 21,
    name: 'Brazilian Grand Prix',
    slug: 'brazil-2026',
    qualiDate: '2026-11-07T18:00:00Z',
    raceDate: '2026-11-08T17:00:00Z',
  },
  {
    round: 22,
    name: 'Las Vegas Grand Prix',
    slug: 'las-vegas-2026',
    qualiDate: '2026-11-20T04:00:00Z',
    raceDate: '2026-11-21T04:00:00Z',
  },
  {
    round: 23,
    name: 'Qatar Grand Prix',
    slug: 'qatar-2026',
    qualiDate: '2026-11-28T18:00:00Z',
    raceDate: '2026-11-29T16:00:00Z',
  },
  {
    round: 24,
    name: 'Abu Dhabi Grand Prix',
    slug: 'abu-dhabi-2026',
    qualiDate: '2026-12-05T14:00:00Z',
    raceDate: '2026-12-06T13:00:00Z',
  },
];

// H2H matchups - teammate pairings for 2026
const H2H_MATCHUPS_2026 = [
  { team: 'McLaren', driver1Code: 'NOR', driver2Code: 'PIA' },
  { team: 'Ferrari', driver1Code: 'LEC', driver2Code: 'HAM' },
  { team: 'Red Bull Racing', driver1Code: 'VER', driver2Code: 'HAD' },
  { team: 'Mercedes', driver1Code: 'RUS', driver2Code: 'ANT' },
  { team: 'Aston Martin', driver1Code: 'ALO', driver2Code: 'STR' },
  { team: 'Alpine', driver1Code: 'GAS', driver2Code: 'COL' },
  { team: 'Williams', driver1Code: 'ALB', driver2Code: 'SAI' },
  { team: 'Racing Bulls', driver1Code: 'LAW', driver2Code: 'LIN' },
  { team: 'Audi', driver1Code: 'HUL', driver2Code: 'BOR' },
  { team: 'Haas', driver1Code: 'OCO', driver2Code: 'BEA' },
  { team: 'Cadillac', driver1Code: 'BOT', driver2Code: 'PER' },
];

export const seedRaces = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let created = 0;
    let updated = 0;
    const skipped = 0;

    for (const race of F1_RACES_2026) {
      const raceStartAt = new Date(race.raceDate).getTime();
      const qualiStartAt = new Date(race.qualiDate).getTime();

      // Lock times: at each session's scheduled start time
      const predictionLockAt = raceStartAt;
      const qualiLockAt = qualiStartAt;

      // Sprint times (if applicable)
      const sprintQualiStartAt = race.sprintQualiDate
        ? new Date(race.sprintQualiDate).getTime()
        : undefined;
      const sprintStartAt = race.sprintDate
        ? new Date(race.sprintDate).getTime()
        : undefined;
      const sprintQualiLockAt = sprintQualiStartAt;
      const sprintLockAt = sprintStartAt;
      const timeZone = getRaceTimeZoneFromSlug(race.slug);

      // Check if race already exists by slug
      const existing = await ctx.db
        .query('races')
        .withIndex('by_slug', (q) => q.eq('slug', race.slug))
        .first();

      if (existing) {
        // Full sync: overwrite all session and lock times from seed so new
        // fields (e.g. sprint for Canada) and time fixes are applied.
        // Only force status to 'cancelled' from seed data — never overwrite
        // 'finished' with 'upcoming', as that would reset completed races.
        await ctx.db.patch(existing._id, {
          raceStartAt,
          predictionLockAt,
          qualiStartAt,
          qualiLockAt,
          hasSprint: race.hasSprint ?? false,
          sprintQualiStartAt,
          sprintQualiLockAt,
          sprintStartAt,
          sprintLockAt,
          timeZone,
          ...(race.cancelled ? { status: 'cancelled' } : {}),
          updatedAt: now,
        });
        const updatedRace = await ctx.db.get(existing._id);
        if (updatedRace) {
          await scheduleReminder(ctx, updatedRace);
          await scheduleSessionLockNotifications(ctx, updatedRace);
        }
        updated++;
        continue;
      }

      const raceId = await ctx.db.insert('races', {
        season: 2026,
        round: race.round,
        name: race.name,
        slug: race.slug,
        qualiStartAt,
        qualiLockAt,
        hasSprint: race.hasSprint ?? false,
        sprintQualiStartAt,
        sprintQualiLockAt,
        sprintStartAt,
        sprintLockAt,
        timeZone,
        raceStartAt,
        predictionLockAt,
        status: race.cancelled ? 'cancelled' : 'upcoming',
        createdAt: now,
        updatedAt: now,
      });
      const insertedRace = await ctx.db.get(raceId);
      if (insertedRace) {
        await scheduleReminder(ctx, insertedRace);
        await scheduleSessionLockNotifications(ctx, insertedRace);
      }
      created++;
    }

    return { created, updated, skipped, total: F1_RACES_2026.length };
  },
});

export const seedH2HMatchups = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    let created = 0;
    let skipped = 0;

    // First, get all drivers by code
    const drivers = await ctx.db.query('drivers').collect();
    const driverByCode = new Map(drivers.map((d) => [d.code, d]));

    for (const matchup of H2H_MATCHUPS_2026) {
      const driver1 = driverByCode.get(matchup.driver1Code);
      const driver2 = driverByCode.get(matchup.driver2Code);

      if (!driver1 || !driver2) {
        console.warn(
          `Skipping ${matchup.team}: missing driver ${matchup.driver1Code} or ${matchup.driver2Code}`,
        );
        skipped++;
        continue;
      }

      // Check if matchup already exists
      const existing = await ctx.db
        .query('h2hMatchups')
        .withIndex('by_season_team', (q) =>
          q.eq('season', 2026).eq('team', matchup.team),
        )
        .first();

      if (existing) {
        skipped++;
        continue;
      }

      await ctx.db.insert('h2hMatchups', {
        season: 2026,
        team: matchup.team,
        driver1Id: driver1._id,
        driver2Id: driver2._id,
        createdAt: now,
        updatedAt: now,
      });
      created++;
    }

    return { created, skipped, total: H2H_MATCHUPS_2026.length };
  },
});

/**
 * Seed development data for testing post-race features.
 * Creates finished races with results, predictions, and scores.
 *
 * Run via Convex dashboard or CLI:
 *   npx convex run seed:seedDevData
 *
 * Optional: pass a clerkUserId to create predictions for a specific user.
 */
export const seedDevData = internalMutation({
  args: {
    clerkUserId: v.optional(v.string()),
    numFinishedRaces: v.optional(v.number()), // defaults to 3
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const numFinished = args.numFinishedRaces ?? 3;

    // Get all drivers
    const drivers = await ctx.db.query('drivers').collect();
    if (drivers.length < 5) {
      throw new Error(
        'Need at least 5 drivers. Run seedDrivers first: npx convex run seed:seedDrivers',
      );
    }
    const driverIds = drivers.map((d) => d._id);

    // Get races sorted by round
    const races = await ctx.db.query('races').collect();
    if (races.length === 0) {
      throw new Error(
        'No races found. Run seedRaces first: npx convex run seed:seedRaces',
      );
    }
    const sortedRaces = races.sort((a, b) => a.round - b.round);
    const racesToFinish = sortedRaces.slice(0, numFinished);

    // Find or create dev user
    let devUser = args.clerkUserId
      ? await ctx.db
          .query('users')
          .withIndex('by_clerkUserId', (q) =>
            q.eq('clerkUserId', args.clerkUserId!),
          )
          .unique()
      : await ctx.db.query('users').first();

    if (!devUser) {
      // Create a dev user
      const devUserId = await ctx.db.insert('users', {
        clerkUserId: 'dev_test_user',
        email: 'dev@example.com',
        displayName: 'Dev Tester',
        isAdmin: true,
        createdAt: now,
        updatedAt: now,
      });
      devUser = await ctx.db.get(devUserId);
    }

    if (!devUser) {
      throw new Error('Failed to get or create dev user');
    }

    const stats = {
      racesFinished: 0,
      resultsCreated: 0,
      predictionsCreated: 0,
      scoresCreated: 0,
    };

    // Simple shuffle using Fisher-Yates
    function shuffle<T>(arr: Array<T>): Array<T> {
      const result = [...arr];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    }

    // Scoring patterns: each produces a different mix of exact/close/inTop5/miss
    const PICK_PATTERNS: Record<
      string,
      (
        top5: Array<Id<'drivers'>>,
        others: Array<Id<'drivers'>>,
      ) => Array<Id<'drivers'>>
    > = {
      // P1 exact, P2/P3 swapped (off-by-1 each), P4 miss, P5 exact → 16 pts
      quali: (top5, others) => [
        top5[0],
        top5[2],
        top5[1],
        others[0] ?? top5[3],
        top5[4],
      ],
      // P1 miss, P2 exact, P3 in-top-5, P4 exact, P5 off-by-1 → 14 pts
      race: (top5, others) => [
        others[1] ?? top5[0],
        top5[1],
        top5[4],
        top5[3],
        top5[3],
      ],
      // P1/P2 swapped, P3 in-top-5, P4 exact, P5 in-top-5 → 13 pts
      sprint: (top5) => [top5[1], top5[0], top5[4], top5[3], top5[2]],
      // P1 exact, P2-P4 miss, P5 exact → 10 pts
      sprint_quali: (top5, others) => [
        top5[0],
        others[2] ?? top5[1],
        others[3] ?? top5[2],
        others[4] ?? top5[3],
        top5[4],
      ],
    };

    for (const race of racesToFinish) {
      // 1. Mark race as finished (set dates in the past)
      const pastRaceStart =
        now - (numFinished - race.round + 1) * 7 * 24 * 60 * 60 * 1000; // weeks ago
      const pastQuali = pastRaceStart - 24 * 60 * 60 * 1000;
      const pastSprintQuali = pastQuali - 24 * 60 * 60 * 1000;
      const pastSprint = pastQuali - 12 * 60 * 60 * 1000;

      await ctx.db.patch(race._id, {
        status: 'finished',
        raceStartAt: pastRaceStart,
        predictionLockAt: pastRaceStart,
        qualiStartAt: pastQuali,
        qualiLockAt: pastQuali,
        ...(race.hasSprint && {
          sprintQualiStartAt: pastSprintQuali,
          sprintQualiLockAt: pastSprintQuali,
          sprintStartAt: pastSprint,
          sprintLockAt: pastSprint,
        }),
        updatedAt: now,
      });
      stats.racesFinished++;

      // 2. Determine which sessions this race has
      const sessions: Array<SessionType> = race.hasSprint
        ? ['sprint_quali', 'sprint', 'quali', 'race']
        : ['quali', 'race'];

      // 3. For each session: create results, prediction, score
      for (const sessionType of sessions) {
        const classification = shuffle(driverIds);
        const top5 = classification.slice(0, 5);
        const others = classification.slice(5, 15);

        // Create result if it doesn't exist
        const existingResult = await ctx.db
          .query('results')
          .withIndex('by_race_session', (q) =>
            q.eq('raceId', race._id).eq('sessionType', sessionType),
          )
          .unique();

        if (!existingResult) {
          await ctx.db.insert('results', {
            raceId: race._id,
            sessionType,
            classification,
            publishedAt: now,
            updatedAt: now,
          });
          stats.resultsCreated++;
        }

        // Create prediction if it doesn't exist
        const existingPrediction = await ctx.db
          .query('predictions')
          .withIndex('by_user_race_session', (q) =>
            q
              .eq('userId', devUser._id)
              .eq('raceId', race._id)
              .eq('sessionType', sessionType),
          )
          .first();

        let picks: typeof driverIds;
        if (!existingPrediction) {
          const patternFn = PICK_PATTERNS[sessionType];
          picks = patternFn(top5, others);

          await ctx.db.insert('predictions', {
            userId: devUser._id,
            raceId: race._id,
            sessionType,
            picks,
            submittedAt: pastRaceStart - 60 * 60 * 1000,
            updatedAt: pastRaceStart - 60 * 60 * 1000,
          });
          stats.predictionsCreated++;
        } else {
          picks = existingPrediction.picks;
        }

        // Compute score if it doesn't exist
        const existingScore = await ctx.db
          .query('scores')
          .withIndex('by_user_race_session', (q) =>
            q
              .eq('userId', devUser._id)
              .eq('raceId', race._id)
              .eq('sessionType', sessionType),
          )
          .unique();

        if (!existingScore) {
          const { total, breakdown } = scoreTopFive({
            picks,
            classification,
          });

          await ctx.db.insert('scores', {
            userId: devUser._id,
            raceId: race._id,
            sessionType,
            points: total,
            breakdown,
            createdAt: now,
            updatedAt: now,
          });
          stats.scoresCreated++;
        }
      }
    }

    return {
      ...stats,
      devUserId: devUser._id,
      devUserEmail: devUser.email,
    };
  },
});

/**
 * Seed H2H predictions, results, and scores for a user's finished races.
 * Creates realistic H2H data so the WeekendCard H2H row shows scored results.
 *
 * Run via: npx convex run seed:seedH2HDevData
 * Or with a specific user: npx convex run seed:seedH2HDevData '{"clerkUserId": "user_xxx"}'
 */
export const seedH2HDevData = internalMutation({
  args: {
    clerkUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find user
    const user = args.clerkUserId
      ? await ctx.db
          .query('users')
          .withIndex('by_clerkUserId', (q) =>
            q.eq('clerkUserId', args.clerkUserId!),
          )
          .unique()
      : await ctx.db.query('users').first();

    if (!user) {
      throw new Error('User not found');
    }

    // Get matchups for 2026
    const matchups = await ctx.db
      .query('h2hMatchups')
      .withIndex('by_season', (q) => q.eq('season', 2026))
      .collect();

    if (matchups.length === 0) {
      throw new Error('No H2H matchups found. Run seedH2HMatchups first.');
    }

    // Get finished races
    const races = await ctx.db.query('races').collect();
    const finishedRaces = races.filter((r) => r.status === 'finished');

    if (finishedRaces.length === 0) {
      throw new Error('No finished races. Run seedDevData first.');
    }

    const stats = {
      h2hResultsCreated: 0,
      h2hPredictionsCreated: 0,
      h2hScoresCreated: 0,
    };

    for (const race of finishedRaces) {
      const sessions: Array<SessionType> = race.hasSprint
        ? ['sprint_quali', 'sprint', 'quali', 'race']
        : ['quali', 'race'];

      // Get actual results per session to determine H2H winners
      for (const sessionType of sessions) {
        const result = await ctx.db
          .query('results')
          .withIndex('by_race_session', (q) =>
            q.eq('raceId', race._id).eq('sessionType', sessionType),
          )
          .unique();

        if (!result) {
          continue;
        }

        const classification = result.classification;
        const positionMap = new Map<string, number>();
        for (let i = 0; i < classification.length; i++) {
          positionMap.set(classification[i], i);
        }

        let correctPicks = 0;
        let totalPicks = 0;

        for (const matchup of matchups) {
          const pos1 = positionMap.get(matchup.driver1Id);
          const pos2 = positionMap.get(matchup.driver2Id);

          // Skip if either driver wasn't classified
          if (pos1 === undefined || pos2 === undefined) {
            continue;
          }

          // Winner = whoever finished higher (lower position index)
          const winnerId = pos1 < pos2 ? matchup.driver1Id : matchup.driver2Id;

          // Create H2H result if it doesn't exist
          const existingResult = await ctx.db
            .query('h2hResults')
            .withIndex('by_race_session_matchup', (q) =>
              q
                .eq('raceId', race._id)
                .eq('sessionType', sessionType)
                .eq('matchupId', matchup._id),
            )
            .unique();

          if (!existingResult) {
            await ctx.db.insert('h2hResults', {
              raceId: race._id,
              sessionType,
              matchupId: matchup._id,
              winnerId,
              publishedAt: now,
            });
            stats.h2hResultsCreated++;
          }

          // Create H2H prediction for user (pick correct ~60% of the time)
          const existingPred = await ctx.db
            .query('h2hPredictions')
            .withIndex('by_user_race_session_matchup', (q) =>
              q
                .eq('userId', user._id)
                .eq('raceId', race._id)
                .eq('sessionType', sessionType)
                .eq('matchupId', matchup._id),
            )
            .unique();

          // Use a deterministic-ish pattern: correct for ~60% of matchups
          const matchupIndex = matchups.indexOf(matchup);
          const sessionIndex = sessions.indexOf(sessionType);
          const isCorrect =
            (matchupIndex + sessionIndex + race.round) % 5 !== 0;
          const predictedWinnerId = isCorrect
            ? winnerId
            : winnerId === matchup.driver1Id
              ? matchup.driver2Id
              : matchup.driver1Id;

          if (!existingPred) {
            await ctx.db.insert('h2hPredictions', {
              userId: user._id,
              raceId: race._id,
              sessionType,
              matchupId: matchup._id,
              predictedWinnerId,
              submittedAt: now - 60 * 60 * 1000,
              updatedAt: now,
            });
            stats.h2hPredictionsCreated++;
          }

          totalPicks++;
          if (isCorrect) {
            correctPicks++;
          }
        }

        // Create H2H score if it doesn't exist
        if (totalPicks > 0) {
          const existingScore = await ctx.db
            .query('h2hScores')
            .withIndex('by_user_race_session', (q) =>
              q
                .eq('userId', user._id)
                .eq('raceId', race._id)
                .eq('sessionType', sessionType),
            )
            .unique();

          if (!existingScore) {
            await ctx.db.insert('h2hScores', {
              userId: user._id,
              raceId: race._id,
              sessionType,
              points: correctPicks,
              correctPicks,
              totalPicks,
              createdAt: now,
              updatedAt: now,
            });
            stats.h2hScoresCreated++;
          }
        }
      }
    }

    return {
      ...stats,
      userId: user._id,
      racesProcessed: finishedRaces.length,
      matchupsPerSession: matchups.length,
    };
  },
});

/**
 * Seed a specific user's dev weekends into clear UI scenarios:
 * 1) no predictions
 * 2) partial predictions (Top 5 only, no H2H)
 * 3) full predictions (Top 5 + H2H)
 * 4) halfway weekend (some sessions scored, weekend in progress)
 *
 * Run via:
 *   npx convex run seed:seedDevUserRaceScenarios '{"username": "barrymichaeldoyle"}'
 *   npx convex run seed:seedDevUserRaceScenarios '{"clerkUserId": "user_xxx"}'
 */
export const seedDevUserRaceScenarios = internalMutation({
  args: {
    clerkUserId: v.optional(v.string()),
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

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
        : await ctx.db.query('users').first();

    if (!user) {
      throw new Error('User not found');
    }
    const currentUser = user;

    // Build baseline: finished races, results, top-5 predictions/scores and H2H data.
    await ctx.runMutation(internal.seed.seedDevData, {
      clerkUserId: user.clerkUserId,
      numFinishedRaces: 5,
    });
    await ctx.runMutation(internal.seed.seedH2HDevData, {
      clerkUserId: user.clerkUserId,
    });

    const allRaces = (await ctx.db.query('races').collect()).sort(
      (a, b) => a.round - b.round,
    );
    const finishedRaces = allRaces.filter((r) => r.status === 'finished');

    if (finishedRaces.length < 4) {
      throw new Error('Need at least 4 finished races to build all scenarios.');
    }

    const noPredictionsRace = finishedRaces[0];
    const partialRace = finishedRaces[1];
    const fullRace = finishedRaces[2];

    const usedRaceIds = new Set([
      noPredictionsRace._id,
      partialRace._id,
      fullRace._id,
    ]);

    const halfwayRace =
      finishedRaces.find((r) => r.hasSprint && !usedRaceIds.has(r._id)) ??
      finishedRaces.find((r) => !usedRaceIds.has(r._id));

    if (!halfwayRace) {
      throw new Error('Failed to pick a race for the halfway scenario.');
    }

    function sessionsForRace(r: { hasSprint?: boolean }): Array<SessionType> {
      return r.hasSprint
        ? ['sprint_quali', 'sprint', 'quali', 'race']
        : ['quali', 'race'];
    }

    async function deleteTop5ForSession(
      raceId: Id<'races'>,
      sessionType: SessionType,
    ) {
      const prediction = await ctx.db
        .query('predictions')
        .withIndex('by_user_race_session', (q) =>
          q
            .eq('userId', currentUser._id)
            .eq('raceId', raceId)
            .eq('sessionType', sessionType),
        )
        .unique();
      if (prediction) {
        await ctx.db.delete(prediction._id);
      }

      const score = await ctx.db
        .query('scores')
        .withIndex('by_user_race_session', (q) =>
          q
            .eq('userId', currentUser._id)
            .eq('raceId', raceId)
            .eq('sessionType', sessionType),
        )
        .unique();
      if (score) {
        await ctx.db.delete(score._id);
      }
    }

    async function deleteH2HForSession(
      raceId: Id<'races'>,
      sessionType: SessionType,
      opts?: { deleteResults?: boolean },
    ) {
      const predictions = await ctx.db
        .query('h2hPredictions')
        .withIndex('by_user_race_session', (q) =>
          q
            .eq('userId', currentUser._id)
            .eq('raceId', raceId)
            .eq('sessionType', sessionType),
        )
        .collect();
      for (const pred of predictions) {
        await ctx.db.delete(pred._id);
      }

      const score = await ctx.db
        .query('h2hScores')
        .withIndex('by_user_race_session', (q) =>
          q
            .eq('userId', currentUser._id)
            .eq('raceId', raceId)
            .eq('sessionType', sessionType),
        )
        .unique();
      if (score) {
        await ctx.db.delete(score._id);
      }

      if (opts?.deleteResults) {
        const results = await ctx.db
          .query('h2hResults')
          .withIndex('by_race_session', (q) =>
            q.eq('raceId', raceId).eq('sessionType', sessionType),
          )
          .collect();
        for (const result of results) {
          await ctx.db.delete(result._id);
        }
      }
    }

    // Scenario 1: No predictions at all.
    for (const sessionType of sessionsForRace(noPredictionsRace)) {
      await deleteTop5ForSession(noPredictionsRace._id, sessionType);
      await deleteH2HForSession(noPredictionsRace._id, sessionType);
    }

    // Scenario 2: Partial (Top 5 exists, H2H removed).
    for (const sessionType of sessionsForRace(partialRace)) {
      await deleteH2HForSession(partialRace._id, sessionType);
    }

    // Scenario 3: Full stays as seeded.

    // Scenario 4: Halfway weekend (session results exist, but weekend not complete).
    const halfwaySessions = sessionsForRace(halfwayRace);
    const publishedSessions: Array<SessionType> = halfwayRace.hasSprint
      ? ['sprint_quali', 'sprint', 'quali']
      : ['quali'];
    const pendingSessions = halfwaySessions.filter(
      (sessionType) => !publishedSessions.includes(sessionType),
    );

    for (const sessionType of pendingSessions) {
      const top5Result = await ctx.db
        .query('results')
        .withIndex('by_race_session', (q) =>
          q.eq('raceId', halfwayRace._id).eq('sessionType', sessionType),
        )
        .unique();
      if (top5Result) {
        await ctx.db.delete(top5Result._id);
      }

      const score = await ctx.db
        .query('scores')
        .withIndex('by_user_race_session', (q) =>
          q
            .eq('userId', user._id)
            .eq('raceId', halfwayRace._id)
            .eq('sessionType', sessionType),
        )
        .unique();
      if (score) {
        await ctx.db.delete(score._id);
      }

      await deleteH2HForSession(halfwayRace._id, sessionType, {
        deleteResults: true,
      });
    }

    const hour = 60 * 60 * 1000;
    await ctx.db.patch(halfwayRace._id, {
      status: 'locked',
      raceStartAt: now - 30 * 60 * 1000,
      predictionLockAt: now - 30 * 60 * 1000,
      qualiStartAt: now - 2 * 24 * hour,
      qualiLockAt: now - 2 * 24 * hour,
      ...(halfwayRace.hasSprint
        ? {
            sprintQualiStartAt: now - 3 * 24 * hour,
            sprintQualiLockAt: now - 3 * 24 * hour,
            sprintStartAt: now - 2.5 * 24 * hour,
            sprintLockAt: now - 2.5 * 24 * hour,
          }
        : {}),
      updatedAt: now,
    });

    return {
      userId: user._id,
      username: user.username,
      scenarios: {
        noPredictions: noPredictionsRace.slug,
        partialTop5Only: partialRace.slug,
        fullPredictions: fullRace.slug,
        halfwayWeekend: halfwayRace.slug,
      },
      halfwayPublishedSessions: publishedSessions,
      halfwayPendingSessions: pendingSessions,
      includesSprintExample:
        noPredictionsRace.hasSprint ||
        partialRace.hasSprint ||
        fullRace.hasSprint ||
        halfwayRace.hasSprint,
    };
  },
});

/**
 * Seed a locked weekend where the current user and a second public user both
 * have picks, so the race page and public profile reveal rules can be tested.
 *
 * Run via:
 *   npx convex run seed:seedLockedPicksVisibilityScenario '{"username": "barrymichaeldoyle"}'
 *   npx convex run seed:seedLockedPicksVisibilityScenario '{"clerkUserId": "user_xxx"}'
 */
export const seedLockedPicksVisibilityScenario = internalMutation({
  args: {
    clerkUserId: v.optional(v.string()),
    username: v.optional(v.string()),
    friendUsername: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const hour = 60 * 60 * 1000;

    const viewer = args.clerkUserId
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
        : await ctx.db.query('users').first();

    if (!viewer) {
      throw new Error('User not found');
    }

    let drivers = await ctx.db.query('drivers').collect();
    if (drivers.length < 5) {
      await ctx.runMutation(internal.seed.seedDrivers);
      drivers = await ctx.db.query('drivers').collect();
    }
    if (drivers.length < 5) {
      throw new Error(
        'Need at least 5 drivers to seed locked picks visibility',
      );
    }

    const driverIds = drivers.map((driver) => driver._id);
    const viewerPicks = driverIds.slice(0, 5);
    const friendPicks = [...driverIds.slice(1, 5), driverIds[0]];

    const friendUsername =
      args.friendUsername?.trim() || 'locked-friend-visibility';
    let friend = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', friendUsername))
      .unique();

    if (!friend) {
      const friendId = await ctx.db.insert('users', {
        clerkUserId: `seed_locked_friend_${friendUsername}`,
        email: `${friendUsername}@example.com`,
        displayName: 'Locked Friend',
        username: friendUsername,
        createdAt: now,
        updatedAt: now,
      });
      friend = await ctx.db.get(friendId);
    }

    if (!friend) {
      throw new Error('Failed to create locked-friend seed user');
    }

    let matchups = await ctx.db
      .query('h2hMatchups')
      .withIndex('by_season', (q) => q.eq('season', 2026))
      .collect();
    if (matchups.length === 0) {
      await ctx.runMutation(internal.seed.seedH2HMatchups);
      matchups = await ctx.db
        .query('h2hMatchups')
        .withIndex('by_season', (q) => q.eq('season', 2026))
        .collect();
    }

    const raceSlug = 'locked-picks-visibility-2026';
    const existingRace = await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', raceSlug))
      .unique();

    const racePatch = {
      season: 2026,
      round: 998,
      name: 'Locked Picks Visibility GP',
      slug: raceSlug,
      timeZone: 'UTC',
      hasSprint: false,
      qualiStartAt: now - 26 * hour,
      qualiLockAt: now - 26 * hour,
      raceStartAt: now - hour,
      predictionLockAt: now - hour,
      status: 'locked',
      updatedAt: now,
    } as const;

    const raceId = existingRace
      ? (await ctx.db.patch(existingRace._id, racePatch), existingRace._id)
      : await ctx.db.insert('races', {
          ...racePatch,
          createdAt: now,
        });

    const existingViewerPredictions = await ctx.db
      .query('predictions')
      .withIndex('by_user_race_session', (q) =>
        q.eq('userId', viewer._id).eq('raceId', raceId),
      )
      .collect();
    for (const prediction of existingViewerPredictions) {
      await ctx.db.delete(prediction._id);
    }

    const existingFriendPredictions = await ctx.db
      .query('predictions')
      .withIndex('by_user_race_session', (q) =>
        q.eq('userId', friend._id).eq('raceId', raceId),
      )
      .collect();
    for (const prediction of existingFriendPredictions) {
      await ctx.db.delete(prediction._id);
    }

    const existingViewerH2H = await ctx.db
      .query('h2hPredictions')
      .withIndex('by_user_race_session', (q) =>
        q.eq('userId', viewer._id).eq('raceId', raceId),
      )
      .collect();
    for (const prediction of existingViewerH2H) {
      await ctx.db.delete(prediction._id);
    }

    const existingFriendH2H = await ctx.db
      .query('h2hPredictions')
      .withIndex('by_user_race_session', (q) =>
        q.eq('userId', friend._id).eq('raceId', raceId),
      )
      .collect();
    for (const prediction of existingFriendH2H) {
      await ctx.db.delete(prediction._id);
    }

    await ctx.db.insert('predictions', {
      userId: viewer._id,
      raceId,
      sessionType: 'quali',
      picks: viewerPicks,
      submittedAt: now - 30 * hour,
      updatedAt: now - 30 * hour,
    });
    await ctx.db.insert('predictions', {
      userId: viewer._id,
      raceId,
      sessionType: 'race',
      picks: viewerPicks,
      submittedAt: now - 3 * hour,
      updatedAt: now - 3 * hour,
    });

    await ctx.db.insert('predictions', {
      userId: friend._id,
      raceId,
      sessionType: 'quali',
      picks: friendPicks,
      submittedAt: now - 29 * hour,
      updatedAt: now - 29 * hour,
    });
    await ctx.db.insert('predictions', {
      userId: friend._id,
      raceId,
      sessionType: 'race',
      picks: friendPicks,
      submittedAt: now - 2 * hour,
      updatedAt: now - 2 * hour,
    });

    for (const matchup of matchups) {
      await ctx.db.insert('h2hPredictions', {
        userId: viewer._id,
        raceId,
        sessionType: 'quali',
        matchupId: matchup._id,
        predictedWinnerId: matchup.driver1Id,
        submittedAt: now - 30 * hour,
        updatedAt: now - 30 * hour,
      });
      await ctx.db.insert('h2hPredictions', {
        userId: viewer._id,
        raceId,
        sessionType: 'race',
        matchupId: matchup._id,
        predictedWinnerId: matchup.driver2Id,
        submittedAt: now - 3 * hour,
        updatedAt: now - 3 * hour,
      });

      await ctx.db.insert('h2hPredictions', {
        userId: friend._id,
        raceId,
        sessionType: 'quali',
        matchupId: matchup._id,
        predictedWinnerId: matchup.driver2Id,
        submittedAt: now - 29 * hour,
        updatedAt: now - 29 * hour,
      });
      await ctx.db.insert('h2hPredictions', {
        userId: friend._id,
        raceId,
        sessionType: 'race',
        matchupId: matchup._id,
        predictedWinnerId: matchup.driver1Id,
        submittedAt: now - 2 * hour,
        updatedAt: now - 2 * hour,
      });
    }

    return {
      raceSlug,
      raceId,
      viewerUsername: viewer.username ?? null,
      friendUsername: friend.username ?? null,
      h2hMatchupCount: matchups.length,
      viewerPicks: drivers.slice(0, 5).map((driver) => driver.code),
      friendPicks: [
        ...drivers.slice(1, 5).map((driver) => driver.code),
        drivers[0]?.code ?? '???',
      ],
      notes: [
        'Race status is locked with no published results.',
        'Open the locked race page to verify your own picks are still visible.',
        'Open the seeded friend profile to verify locked picks are visible publicly.',
      ],
    };
  },
});

/**
 * Seed session results for a specific race.
 * Useful for testing the results display with different session types.
 *
 * Run via Convex dashboard or CLI:
 *   npx convex run seed:seedSessionResult --args '{"raceSlug": "china-2026", "sessionType": "quali"}'
 */
export const seedSessionResult = internalMutation({
  args: {
    raceSlug: v.string(),
    sessionType: v.union(
      v.literal('quali'),
      v.literal('sprint_quali'),
      v.literal('sprint'),
      v.literal('race'),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find the race
    const race = await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', args.raceSlug))
      .unique();

    if (!race) {
      throw new Error(`Race not found: ${args.raceSlug}`);
    }

    // Get all drivers
    const drivers = await ctx.db.query('drivers').collect();
    if (drivers.length < 5) {
      throw new Error('Need at least 5 drivers. Run seedDrivers first.');
    }

    // Shuffle drivers for classification
    const shuffled = [...drivers];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const classification = shuffled.map((d) => d._id);

    // Check for existing result
    const existing = await ctx.db
      .query('results')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', race._id).eq('sessionType', args.sessionType),
      )
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, {
        classification,
        updatedAt: now,
      });
      return {
        action: 'updated',
        raceId: race._id,
        raceName: race.name,
        sessionType: args.sessionType,
        top5: shuffled.slice(0, 5).map((d) => d.code),
      };
    }

    await ctx.db.insert('results', {
      raceId: race._id,
      sessionType: args.sessionType as SessionType,
      classification: classification as Array<Id<'drivers'>>,
      publishedAt: now,
      updatedAt: now,
    });

    // Also update race status to locked if it's still upcoming
    if (race.status === 'upcoming') {
      await ctx.db.patch(race._id, { status: 'locked', updatedAt: now });
    }

    return {
      action: 'created',
      raceId: race._id,
      raceName: race.name,
      sessionType: args.sessionType,
      top5: shuffled.slice(0, 5).map((d) => d.code),
    };
  },
});

/**
 * Sync all users from Clerk to update usernames.
 * Requires CLERK_SECRET_KEY environment variable in Convex.
 *
 * First, set the env var:
 *   npx convex env set CLERK_SECRET_KEY sk_test_...
 *
 * Then run:
 *   npx convex run seed:syncUsersFromClerk
 */
export const syncUsersFromClerk = internalAction({
  args: {},
  handler: async (
    ctx,
  ): Promise<{ updated: number; notFound: number; total: number }> => {
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      throw new Error(
        'CLERK_SECRET_KEY not set. Run: npx convex env set CLERK_SECRET_KEY <your_key>',
      );
    }

    // Fetch all users from Clerk
    const response = await fetch('https://api.clerk.com/v1/users?limit=100', {
      headers: {
        Authorization: `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(
        `Clerk API error: ${response.status} ${response.statusText}`,
      );
    }

    const clerkUsers: Array<{
      id: string;
      username: string | null;
      first_name: string | null;
      last_name: string | null;
      email_addresses: Array<{ email_address: string }>;
    }> = await response.json();

    // Update each user in Convex
    return await ctx.runMutation(internal.seed.syncUsersFromClerkMutation, {
      users: clerkUsers.map((u) => ({
        clerkUserId: u.id,
        username: u.username,
        displayName:
          u.first_name && u.last_name
            ? `${u.first_name} ${u.last_name}`
            : (u.first_name ?? u.last_name ?? null),
        email: u.email_addresses[0]?.email_address ?? null,
      })),
    });
  },
});

export const syncUsersFromClerkMutation = internalMutation({
  args: {
    users: v.array(
      v.object({
        clerkUserId: v.string(),
        username: v.union(v.string(), v.null()),
        displayName: v.union(v.string(), v.null()),
        email: v.union(v.string(), v.null()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    let updated = 0;
    let notFound = 0;

    for (const clerkUser of args.users) {
      const user = await ctx.db
        .query('users')
        .withIndex('by_clerkUserId', (q) =>
          q.eq('clerkUserId', clerkUser.clerkUserId),
        )
        .unique();

      if (!user) {
        notFound++;
        continue;
      }

      // Only update if there are changes
      const updates: Record<string, unknown> = {};
      if (clerkUser.username && user.username !== clerkUser.username) {
        updates.username = clerkUser.username;
      }
      if (clerkUser.displayName && user.displayName !== clerkUser.displayName) {
        updates.displayName = clerkUser.displayName;
      }
      if (clerkUser.email && user.email !== clerkUser.email) {
        updates.email = clerkUser.email;
      }

      if (Object.keys(updates).length > 0) {
        updates.updatedAt = now;
        await ctx.db.patch(user._id, updates);
        updated++;
      }
    }

    return { updated, notFound, total: args.users.length };
  },
});

// Random username generator parts
const USERNAME_ADJECTIVES = [
  'Fast',
  'Speed',
  'Turbo',
  'Racing',
  'Quick',
  'Swift',
  'Rapid',
  'Flash',
  'Thunder',
  'Storm',
  'Fire',
  'Ice',
  'Shadow',
  'Ghost',
  'Phantom',
  'Stealth',
  'Apex',
  'Prime',
  'Elite',
  'Pro',
  'Ultra',
  'Mega',
  'Super',
  'Hyper',
  'Red',
  'Blue',
  'Silver',
  'Golden',
  'Dark',
  'Bright',
  'Neon',
  'Chrome',
];

const USERNAME_NOUNS = [
  'Racer',
  'Driver',
  'Pilot',
  'Rider',
  'Champ',
  'Legend',
  'Master',
  'King',
  'Wolf',
  'Fox',
  'Hawk',
  'Eagle',
  'Tiger',
  'Lion',
  'Bear',
  'Shark',
  'Bolt',
  'Streak',
  'Blaze',
  'Fury',
  'Force',
  'Power',
  'Spirit',
  'Soul',
  'Ace',
  'Star',
  'Hero',
  'Ninja',
  'Samurai',
  'Viking',
  'Knight',
  'Warrior',
];

function generateUsername(index: number): string {
  const adj = USERNAME_ADJECTIVES[index % USERNAME_ADJECTIVES.length];
  const noun =
    USERNAME_NOUNS[
      Math.floor(index / USERNAME_ADJECTIVES.length) % USERNAME_NOUNS.length
    ];
  const num = Math.floor(
    index / (USERNAME_ADJECTIVES.length * USERNAME_NOUNS.length),
  );
  return num > 0 ? `${adj}${noun}${num}` : `${adj}${noun}`;
}

/**
 * Seed fake users with predictions and scores for a populated leaderboard.
 *
 * Run via: npx convex run seed:seedFakeLeaderboard '{"userCount": 50}'
 */
export const seedFakeLeaderboard = internalMutation({
  args: {
    userCount: v.optional(v.number()), // defaults to 50
    clearExisting: v.optional(v.boolean()), // clear existing fake users first
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const userCount = args.userCount ?? 50;

    // Get all races with results
    const allResults = await ctx.db.query('results').collect();
    const raceIdsWithResults = [...new Set(allResults.map((r) => r.raceId))];

    if (raceIdsWithResults.length === 0) {
      throw new Error('No results found. Seed some race results first.');
    }

    // Get results grouped by race and session
    const resultsByRaceSession = new Map<string, (typeof allResults)[0]>();
    for (const result of allResults) {
      const key = `${result.raceId}_${result.sessionType}`;
      resultsByRaceSession.set(key, result);
    }

    // Optionally clear existing fake users
    if (args.clearExisting) {
      const fakeUsers = await ctx.db.query('users').collect();
      for (const user of fakeUsers) {
        if (user.clerkUserId.startsWith('fake_user_')) {
          // Delete scores
          const scores = await ctx.db
            .query('scores')
            .withIndex('by_user', (q) => q.eq('userId', user._id))
            .collect();
          for (const score of scores) {
            await ctx.db.delete(score._id);
          }
          // Delete predictions
          const preds = await ctx.db
            .query('predictions')
            .withIndex('by_user', (q) => q.eq('userId', user._id))
            .collect();
          for (const pred of preds) {
            await ctx.db.delete(pred._id);
          }
          // Delete user
          await ctx.db.delete(user._id);
        }
      }
    }

    const stats = { usersCreated: 0, predictionsCreated: 0, scoresCreated: 0 };

    for (let i = 0; i < userCount; i++) {
      const username = generateUsername(i);
      const clerkUserId = `fake_user_${i}_${Date.now()}`;

      // Create fake user
      const userId = await ctx.db.insert('users', {
        clerkUserId,
        username,
        displayName: username,
        email: `${username.toLowerCase()}@example.com`,
        isAdmin: false,
        createdAt: now,
        updatedAt: now,
      });
      stats.usersCreated++;

      // For each race with results, create prediction and score
      for (const raceId of raceIdsWithResults) {
        const race = await ctx.db.get(raceId);
        if (!race) {
          continue;
        }

        // Determine sessions for this race
        const sessions: Array<SessionType> = race.hasSprint
          ? ['quali', 'sprint_quali', 'sprint', 'race']
          : ['quali', 'race'];

        for (const sessionType of sessions) {
          const result = resultsByRaceSession.get(`${raceId}_${sessionType}`);
          if (!result) {
            continue;
          }

          // Generate random-ish prediction with varied scoring
          // Use user index + session to create varied but deterministic results
          const seed = i * 7 + sessions.indexOf(sessionType) * 3;
          const top5 = result.classification.slice(0, 5);
          const others = result.classification.slice(5, 15);

          // Different scoring patterns based on seed
          const pattern = seed % 5;
          let picks: Array<Id<'drivers'>>;

          switch (pattern) {
            case 0: // Great: 2 exact, 2 off-by-1, 1 in top5
              picks = [top5[0], top5[1], top5[4], top5[2], top5[4]];
              break;
            case 1: // Good: 1 exact, 2 off-by-1, 2 in top5
              picks = [
                top5[0],
                top5[2],
                top5[1],
                top5[4],
                others[0] ?? top5[4],
              ];
              break;
            case 2: // Medium: 1 exact, 1 off-by-1, 1 in top5, 2 wrong
              picks = [
                top5[0],
                others[0] ?? top5[1],
                top5[4],
                others[1] ?? top5[3],
                others[2] ?? top5[4],
              ];
              break;
            case 3: // Poor: 0 exact, 2 off-by-1, 1 in top5
              picks = [
                top5[1],
                top5[0],
                top5[4],
                others[0] ?? top5[3],
                others[1] ?? top5[4],
              ];
              break;
            default: // Bad: 0 exact, 1 off-by-1, 1 in top5
              picks = [
                top5[1],
                others[0] ?? top5[1],
                others[1] ?? top5[2],
                top5[4],
                others[2] ?? top5[4],
              ];
              break;
          }

          // Ensure picks are valid driver IDs
          picks = picks.map((p, idx) => p || top5[idx % 5]);

          // Create prediction
          await ctx.db.insert('predictions', {
            userId,
            raceId,
            sessionType,
            picks,
            submittedAt: now - 60 * 60 * 1000,
            updatedAt: now,
          });
          stats.predictionsCreated++;

          // Compute actual score
          const { total, breakdown } = scoreTopFive({
            picks,
            classification: result.classification,
          });

          await ctx.db.insert('scores', {
            userId,
            raceId,
            sessionType,
            points: total,
            breakdown,
            createdAt: now,
            updatedAt: now,
          });
          stats.scoresCreated++;
        }
      }
    }

    return stats;
  },
});

/**
 * Manually set a user's username (for users who haven't synced from Clerk yet).
 *
 * Run via: npx convex run seed:setUsername '{"email": "user@example.com", "username": "their_username"}'
 */
export const setUsername = internalMutation({
  args: {
    email: v.optional(v.string()),
    clerkUserId: v.optional(v.string()),
    username: v.string(),
  },
  handler: async (ctx, args) => {
    let user;

    if (args.clerkUserId) {
      user = await ctx.db
        .query('users')
        .withIndex('by_clerkUserId', (q) =>
          q.eq('clerkUserId', args.clerkUserId!),
        )
        .unique();
    } else if (args.email) {
      const users = await ctx.db.query('users').collect();
      user = users.find((u) => u.email === args.email);
    }

    if (!user) {
      throw new Error('User not found');
    }

    await ctx.db.patch(user._id, {
      username: args.username,
      updatedAt: Date.now(),
    });

    return {
      userId: user._id,
      email: user.email,
      username: args.username,
    };
  },
});

/**
 * Migration: Set sessionType='race' on all records that don't have it.
 * Run this before updating the schema to make sessionType required.
 *
 * Run via: npx convex run seed:migrateSessionTypes
 */
export const migrateSessionTypes = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const stats = {
      predictions: 0,
      results: 0,
      scores: 0,
    };

    // Migrate predictions (for legacy data without sessionType)
    const predictions = await ctx.db.query('predictions').collect();
    for (const pred of predictions) {
      if (!(pred as { sessionType?: string }).sessionType) {
        await ctx.db.patch(pred._id, { sessionType: 'race', updatedAt: now });
        stats.predictions++;
      }
    }

    // Migrate results (for legacy data without sessionType)
    const results = await ctx.db.query('results').collect();
    for (const result of results) {
      if (!(result as { sessionType?: string }).sessionType) {
        await ctx.db.patch(result._id, { sessionType: 'race', updatedAt: now });
        stats.results++;
      }
    }

    // Migrate scores (for legacy data without sessionType)
    const scores = await ctx.db.query('scores').collect();
    for (const score of scores) {
      if (!(score as { sessionType?: string }).sessionType) {
        await ctx.db.patch(score._id, { sessionType: 'race', updatedAt: now });
        stats.scores++;
      }
    }

    return { migrated: stats };
  },
});

/** Backfill race timezones from known slug mapping. */
export const backfillRaceTimeZones = internalMutation({
  args: {
    overwriteExisting: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const overwriteExisting = args.overwriteExisting ?? false;
    const races = await ctx.db.query('races').collect();
    let updated = 0;
    let skipped = 0;

    for (const race of races) {
      if (race.timeZone && !overwriteExisting) {
        skipped++;
        continue;
      }

      const timeZone = getRaceTimeZoneFromSlug(race.slug);
      if (!timeZone) {
        skipped++;
        continue;
      }

      await ctx.db.patch(race._id, {
        timeZone,
        updatedAt: Date.now(),
      });
      updated++;
    }

    return { updated, skipped, total: races.length };
  },
});

/**
 * Debug: List all real (non-fake) users with their data.
 */
export const debugListRealUsers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query('users').collect();
    return users
      .filter((u) => !u.clerkUserId.startsWith('fake_user_'))
      .map((u) => ({
        id: u._id,
        clerkUserId: u.clerkUserId,
        username: u.username,
        displayName: u.displayName,
        email: u.email,
      }));
  },
});

/**
 * Seed a prediction with score for a user for a specific race session.
 * The prediction will partially match the results for interesting scoring.
 *
 * Run via: npx convex run seed:seedUserPrediction '{"raceSlug": "china-2026", "sessionType": "quali"}'
 */
export const seedUserPrediction = internalMutation({
  args: {
    raceSlug: v.string(),
    sessionType: v.union(
      v.literal('quali'),
      v.literal('sprint_quali'),
      v.literal('sprint'),
      v.literal('race'),
    ),
    clerkUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Find the race
    const race = await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', args.raceSlug))
      .unique();

    if (!race) {
      throw new Error(`Race not found: ${args.raceSlug}`);
    }

    // Find the user
    const user = args.clerkUserId
      ? await ctx.db
          .query('users')
          .withIndex('by_clerkUserId', (q) =>
            q.eq('clerkUserId', args.clerkUserId!),
          )
          .unique()
      : await ctx.db.query('users').first();

    if (!user) {
      throw new Error('No user found. Sign in first or provide clerkUserId.');
    }

    // Get the results for this session
    const result = await ctx.db
      .query('results')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', race._id).eq('sessionType', args.sessionType),
      )
      .unique();

    if (!result) {
      throw new Error(
        `No results found for ${args.raceSlug} ${args.sessionType}. Run seedSessionResult first.`,
      );
    }

    // Create a prediction that partially matches results for interesting scoring
    const top5Result = result.classification.slice(0, 5);

    // Different scoring patterns based on session type for variety
    let picks: typeof top5Result;
    if (args.sessionType === 'quali') {
      // Pattern A: P1 correct, P2/P3 swapped, P4 wrong, P5 correct = 16 pts
      picks = [
        top5Result[0], // P1 correct = 5 pts
        top5Result[2], // Actually P3, predicting P2 = 3 pts (off by 1)
        top5Result[1], // Actually P2, predicting P3 = 3 pts (off by 1)
        result.classification[7] ?? top5Result[3], // P8 driver in P4 = 0 pts
        top5Result[4], // P5 correct = 5 pts
      ];
    } else if (args.sessionType === 'race') {
      // Pattern B: P1 wrong, P2 correct, P3 off by 1, P4 correct, P5 off by 1 = 14 pts
      picks = [
        result.classification[6] ?? top5Result[0], // P7 driver in P1 = 0 pts
        top5Result[1], // P2 correct = 5 pts
        top5Result[4], // Actually P5, predicting P3 = 1 pt (in top 5)
        top5Result[3], // P4 correct = 5 pts
        top5Result[3], // Actually P4, predicting P5 = 3 pts (off by 1)
      ];
    } else if (args.sessionType === 'sprint') {
      // Pattern C: All off by 1 = 15 pts
      picks = [
        top5Result[1], // P2 in P1 = 3 pts
        top5Result[0], // P1 in P2 = 3 pts
        top5Result[4], // P5 in P3 = 1 pt (in top 5)
        top5Result[3], // P4 in P4 = 5 pts (actually correct!)
        top5Result[2], // P3 in P5 = 1 pt (in top 5, off by 2)
      ];
    } else {
      // sprint_quali: Pattern D: 2 correct, rest wrong = 10 pts
      picks = [
        top5Result[0], // P1 correct = 5 pts
        result.classification[8] ?? top5Result[1], // Wrong
        result.classification[9] ?? top5Result[2], // Wrong
        result.classification[10] ?? top5Result[3], // Wrong
        top5Result[4], // P5 correct = 5 pts
      ];
    }

    // Check for existing prediction
    const existingPred = await ctx.db
      .query('predictions')
      .withIndex('by_user_race_session', (q) =>
        q
          .eq('userId', user._id)
          .eq('raceId', race._id)
          .eq('sessionType', args.sessionType),
      )
      .unique();

    if (existingPred) {
      await ctx.db.patch(existingPred._id, { picks, updatedAt: now });
    } else {
      await ctx.db.insert('predictions', {
        userId: user._id,
        raceId: race._id,
        sessionType: args.sessionType,
        picks,
        submittedAt: now - 60 * 60 * 1000, // 1 hour ago
        updatedAt: now,
      });
    }

    // Compute and store score
    const { total, breakdown } = scoreTopFive({
      picks,
      classification: result.classification,
    });

    const existingScore = await ctx.db
      .query('scores')
      .withIndex('by_user_race_session', (q) =>
        q
          .eq('userId', user._id)
          .eq('raceId', race._id)
          .eq('sessionType', args.sessionType),
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
        userId: user._id,
        raceId: race._id,
        sessionType: args.sessionType,
        points: total,
        breakdown,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Get driver codes for display
    const drivers = await ctx.db.query('drivers').collect();
    const driverById = new Map(drivers.map((d) => [d._id.toString(), d.code]));

    return {
      raceId: race._id,
      raceName: race.name,
      sessionType: args.sessionType,
      userId: user._id,
      userEmail: user.email,
      points: total,
      picks: picks.map((id) => driverById.get(id.toString()) ?? '???'),
      top5Result: top5Result.map(
        (id) => driverById.get(id.toString()) ?? '???',
      ),
    };
  },
});

// ───────────────────────── Backfill Standings ─────────────────────────

export const backfillStandings = internalMutation({
  args: { season: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const season = args.season ?? 2026;
    const now = Date.now();

    // ── Top 5 standings ──
    const allScores = await ctx.db.query('scores').collect();
    const top5ByUser = new Map<
      string,
      { totalPoints: number; raceIds: Set<string> }
    >();
    for (const s of allScores) {
      const entry = top5ByUser.get(s.userId) ?? {
        totalPoints: 0,
        raceIds: new Set(),
      };
      entry.totalPoints += s.points;
      entry.raceIds.add(s.raceId);
      top5ByUser.set(s.userId, entry);
    }

    let top5Count = 0;
    for (const [userId, data] of top5ByUser) {
      const existing = await ctx.db
        .query('seasonStandings')
        .withIndex('by_user_season', (q) =>
          q.eq('userId', userId as Id<'users'>).eq('season', season),
        )
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          totalPoints: data.totalPoints,
          raceCount: data.raceIds.size,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert('seasonStandings', {
          userId: userId as Id<'users'>,
          season,
          totalPoints: data.totalPoints,
          raceCount: data.raceIds.size,
          updatedAt: now,
        });
      }
      top5Count++;
    }

    // ── H2H standings ──
    const allH2HScores = await ctx.db.query('h2hScores').collect();
    const h2hByUser = new Map<
      string,
      {
        totalPoints: number;
        correctPicks: number;
        totalPicks: number;
        raceIds: Set<string>;
      }
    >();
    for (const s of allH2HScores) {
      const entry = h2hByUser.get(s.userId) ?? {
        totalPoints: 0,
        correctPicks: 0,
        totalPicks: 0,
        raceIds: new Set(),
      };
      entry.totalPoints += s.points;
      entry.correctPicks += s.correctPicks;
      entry.totalPicks += s.totalPicks;
      entry.raceIds.add(s.raceId);
      h2hByUser.set(s.userId, entry);
    }

    let h2hCount = 0;
    for (const [userId, data] of h2hByUser) {
      const existing = await ctx.db
        .query('h2hSeasonStandings')
        .withIndex('by_user_season', (q) =>
          q.eq('userId', userId as Id<'users'>).eq('season', season),
        )
        .unique();

      if (existing) {
        await ctx.db.patch(existing._id, {
          totalPoints: data.totalPoints,
          raceCount: data.raceIds.size,
          correctPicks: data.correctPicks,
          totalPicks: data.totalPicks,
          updatedAt: now,
        });
      } else {
        await ctx.db.insert('h2hSeasonStandings', {
          userId: userId as Id<'users'>,
          season,
          totalPoints: data.totalPoints,
          raceCount: data.raceIds.size,
          correctPicks: data.correctPicks,
          totalPicks: data.totalPicks,
          updatedAt: now,
        });
      }
      h2hCount++;
    }

    return { top5Count, h2hCount };
  },
});

// ─────────────────────── Reset to Pre-Season ───────────────────────

/**
 * Internal: Delete a batch of dev data. Returns { deleted, done }.
 * Called repeatedly by resetToPreSeason until done=true.
 */
export const _clearDevDataBatch = internalMutation({
  args: {},
  handler: async (ctx) => {
    let deleted = 0;
    const BATCH = 200;

    // Clear in dependency order: scores → predictions → results → standings → users
    const scores = await ctx.db.query('scores').take(BATCH);
    for (const doc of scores) {
      await ctx.db.delete(doc._id);
      deleted++;
    }
    if (scores.length === BATCH) {
      return { deleted, done: false };
    }

    const preds = await ctx.db.query('predictions').take(BATCH);
    for (const doc of preds) {
      await ctx.db.delete(doc._id);
      deleted++;
    }
    if (preds.length === BATCH) {
      return { deleted, done: false };
    }

    const results = await ctx.db.query('results').take(BATCH);
    for (const doc of results) {
      await ctx.db.delete(doc._id);
      deleted++;
    }
    if (results.length === BATCH) {
      return { deleted, done: false };
    }

    const standings = await ctx.db.query('seasonStandings').take(BATCH);
    for (const doc of standings) {
      await ctx.db.delete(doc._id);
      deleted++;
    }
    if (standings.length === BATCH) {
      return { deleted, done: false };
    }

    const h2hScores = await ctx.db.query('h2hScores').take(BATCH);
    for (const doc of h2hScores) {
      await ctx.db.delete(doc._id);
      deleted++;
    }
    if (h2hScores.length === BATCH) {
      return { deleted, done: false };
    }

    const h2hPreds = await ctx.db.query('h2hPredictions').take(BATCH);
    for (const doc of h2hPreds) {
      await ctx.db.delete(doc._id);
      deleted++;
    }
    if (h2hPreds.length === BATCH) {
      return { deleted, done: false };
    }

    const h2hResults = await ctx.db.query('h2hResults').take(BATCH);
    for (const doc of h2hResults) {
      await ctx.db.delete(doc._id);
      deleted++;
    }
    if (h2hResults.length === BATCH) {
      return { deleted, done: false };
    }

    const h2hStandings = await ctx.db.query('h2hSeasonStandings').take(BATCH);
    for (const doc of h2hStandings) {
      await ctx.db.delete(doc._id);
      deleted++;
    }
    if (h2hStandings.length === BATCH) {
      return { deleted, done: false };
    }

    const revs = await ctx.db.query('revs').take(BATCH);
    for (const doc of revs) {
      await ctx.db.delete(doc._id);
      deleted++;
    }
    if (revs.length === BATCH) {
      return { deleted, done: false };
    }

    const feedEvents = await ctx.db.query('feedEvents').take(BATCH);
    for (const doc of feedEvents) {
      await ctx.db.delete(doc._id);
      deleted++;
    }
    if (feedEvents.length === BATCH) {
      return { deleted, done: false };
    }

    // Fake users last
    const users = await ctx.db.query('users').collect();
    const fakeUsers = users
      .filter((u) => u.clerkUserId.startsWith('fake_user_'))
      .slice(0, BATCH);
    for (const doc of fakeUsers) {
      await ctx.db.delete(doc._id);
      deleted++;
    }
    if (fakeUsers.length === BATCH) {
      return { deleted, done: false };
    }

    return { deleted, done: true };
  },
});

/**
 * Internal: Reset all races to upcoming with original 2026 calendar dates.
 */
export const _resetRacesToUpcoming = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const races = await ctx.db.query('races').collect();
    let reset = 0;

    for (const race of races) {
      const original = F1_RACES_2026.find((r) => r.slug === race.slug);
      if (!original) {
        continue;
      }

      const raceStartAt = new Date(original.raceDate).getTime();
      const qualiStartAt = new Date(original.qualiDate).getTime();
      const sprintQualiStartAt = original.sprintQualiDate
        ? new Date(original.sprintQualiDate).getTime()
        : undefined;
      const sprintStartAt = original.sprintDate
        ? new Date(original.sprintDate).getTime()
        : undefined;

      await ctx.db.patch(race._id, {
        status: 'upcoming',
        raceStartAt,
        predictionLockAt: raceStartAt,
        qualiStartAt,
        qualiLockAt: qualiStartAt,
        hasSprint: original.hasSprint ?? false,
        sprintQualiStartAt,
        sprintQualiLockAt: sprintQualiStartAt,
        sprintStartAt,
        sprintLockAt: sprintStartAt,
        updatedAt: now,
      });
      reset++;
    }

    return { reset };
  },
});

/**
 * Internal: Create 10 test users with predictions for the first race.
 */
export const _seedPreSeasonUsers = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    const drivers = await ctx.db.query('drivers').collect();
    if (drivers.length < 5) {
      throw new Error('Need at least 5 drivers.');
    }
    const driverIds = drivers.map((d) => d._id);

    const races = await ctx.db.query('races').collect();
    // Take the earliest round; Convex seeds always include at least one race
    const firstRace = races.sort((a, b) => a.round - b.round)[0];

    const TEST_USERS = [
      'SpeedKing',
      'ApexHunter',
      'PitLaneHero',
      'DRSMaster',
      'GridWalker',
      'TyreWhisperer',
      'SlipstreamAce',
      'CheckeredFlag',
      'PolePosition',
      'SafetyCarFan',
    ];

    const sessions: Array<SessionType> = firstRace.hasSprint
      ? ['sprint_quali', 'sprint', 'quali', 'race']
      : ['quali', 'race'];

    let usersCreated = 0;
    let predictionsCreated = 0;

    for (let i = 0; i < TEST_USERS.length; i++) {
      const username = TEST_USERS[i];

      const userId = await ctx.db.insert('users', {
        clerkUserId: `fake_user_${i}_${now}`,
        username,
        displayName: username,
        email: `${username.toLowerCase()}@example.com`,
        isAdmin: false,
        createdAt: now,
        updatedAt: now,
      });
      usersCreated++;

      // Create predictions for each session of the first race
      for (const sessionType of sessions) {
        // Deterministic shuffle for varied but reproducible predictions
        const shuffled = [...driverIds];
        const seed = i * 7 + sessions.indexOf(sessionType) * 13;
        for (let j = shuffled.length - 1; j > 0; j--) {
          const k = Math.abs((seed * 31 + j * 17) % (j + 1));
          [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
        }

        await ctx.db.insert('predictions', {
          userId,
          raceId: firstRace._id,
          sessionType,
          picks: shuffled.slice(0, 5),
          submittedAt: now,
          updatedAt: now,
        });
        predictionsCreated++;
      }
    }

    return { usersCreated, predictionsCreated, raceName: firstRace.name };
  },
});

/**
 * Reset dev database to pre-season state:
 * - Clears ALL predictions, results, scores, and standings
 * - Removes all fake users
 * - Resets all races to upcoming with real 2026 dates
 * - Creates 10 test users with predictions for the first race
 *
 * Run via: npx convex run seed:resetToPreSeason
 */
export const resetToPreSeason = internalAction({
  args: {},
  handler: async (ctx) => {
    // Phase 1: Clear all dev data in batches
    let totalDeleted = 0;
    let iterations = 0;
    // Intentional unbounded loop; we cap via iterations guard below
    while (true) {
      const result: { deleted: number; done: boolean } = await ctx.runMutation(
        internal.seed._clearDevDataBatch,
      );
      totalDeleted += result.deleted;
      iterations++;
      if (result.done) {
        break;
      }
      if (iterations > 200) {
        throw new Error('Too many iterations');
      }
    }

    // Phase 2: Reset races to upcoming with original dates
    const raceResult: { reset: number } = await ctx.runMutation(
      internal.seed._resetRacesToUpcoming,
    );

    // Phase 3: Ensure drivers exist
    await ctx.runMutation(internal.seed.seedDrivers);

    // Phase 4: Create test users with predictions for first race
    const seedResult: {
      usersCreated: number;
      predictionsCreated: number;
      raceName: string;
    } = await ctx.runMutation(internal.seed._seedPreSeasonUsers);

    return {
      cleared: totalDeleted,
      batchIterations: iterations,
      racesReset: raceResult.reset,
      ...seedResult,
    };
  },
});

// ─────────────────── Reseed Dev With Leagues ───────────────────

/**
 * Internal: Clear all leagues and league members.
 */
export const _clearLeagueData = internalMutation({
  args: {},
  handler: async (ctx) => {
    const members = await ctx.db.query('leagueMembers').collect();
    for (const doc of members) {
      await ctx.db.delete(doc._id);
    }
    const leagues = await ctx.db.query('leagues').collect();
    for (const doc of leagues) {
      await ctx.db.delete(doc._id);
    }
    return { membersDeleted: members.length, leaguesDeleted: leagues.length };
  },
});

/**
 * Internal: Push australia-2026 dates into the future so predictions are open.
 * Sets quali to +4 days and race to +5 days from now.
 */
export const _pushAustraliaToFuture = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    const race = await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', 'australia-2026'))
      .unique();

    if (!race) {
      throw new Error('australia-2026 not found. Run seedRaces first.');
    }

    const qualiStartAt = now + 4 * DAY;
    const raceStartAt = now + 5 * DAY;

    await ctx.db.patch(race._id, {
      status: 'upcoming',
      qualiStartAt,
      qualiLockAt: qualiStartAt,
      raceStartAt,
      predictionLockAt: raceStartAt,
      updatedAt: now,
    });

    return { raceId: race._id, qualiStartAt, raceStartAt };
  },
});

const LEAGUE_FAKE_USERS = [
  { username: 'SpeedKing', displayName: 'Speed King' },
  { username: 'ApexHunter', displayName: 'Apex Hunter' },
  { username: 'PitLaneHero', displayName: 'Pit Lane Hero' },
  { username: 'DRSMaster', displayName: 'DRS Master' },
  { username: 'GridWalker', displayName: 'Grid Walker' },
  { username: 'TyreWhisperer', displayName: 'Tyre Whisperer' },
  { username: 'SlipstreamAce', displayName: 'Slipstream Ace' },
  { username: 'CheckeredFlag', displayName: 'Checkered Flag' },
  { username: 'PolePosition', displayName: 'Pole Position' },
];

/**
 * Internal: Create 9 fake users, 2 leagues, and varied australia-2026
 * predictions. The main user gets no predictions and is placed in League 1
 * as admin.
 *
 * League 1 "Pit Wall Prophets" (6 members): main user + fake users 0–4
 *   - User 0: predictions for quali + race
 *   - User 1: predictions for quali + race
 *   - User 2: prediction for quali only
 *   - User 3: no predictions
 *   - User 4: no predictions
 *
 * League 2 "DRS Zone" (4 members): fake users 5–8
 *   - User 5: predictions for quali + race
 *   - User 6: prediction for race only
 *   - User 7: no predictions
 *   - User 8: no predictions
 */
export const _seedLeagueScenario = internalMutation({
  args: { mainUserClerkId: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();

    const mainUser = await ctx.db
      .query('users')
      .withIndex('by_clerkUserId', (q) =>
        q.eq('clerkUserId', args.mainUserClerkId),
      )
      .unique();

    if (!mainUser) {
      throw new Error(
        `Main user not found for clerkUserId: ${args.mainUserClerkId}. Sign in first.`,
      );
    }

    const drivers = await ctx.db.query('drivers').collect();
    if (drivers.length < 5) {
      throw new Error('Need at least 5 drivers. Run seedDrivers first.');
    }
    const driverIds = drivers.map((d) => d._id);

    const australiaRace = await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', 'australia-2026'))
      .unique();

    if (!australiaRace) {
      throw new Error('australia-2026 race not found. Run seedRaces first.');
    }

    // Create 9 fake users
    const fakeUserIds: Array<Id<'users'>> = [];
    for (let i = 0; i < LEAGUE_FAKE_USERS.length; i++) {
      const { username, displayName } = LEAGUE_FAKE_USERS[i];
      const userId = await ctx.db.insert('users', {
        clerkUserId: `fake_user_league_${i}`,
        username,
        displayName,
        email: `${username.toLowerCase()}@example.com`,
        isAdmin: false,
        createdAt: now,
        updatedAt: now,
      });
      fakeUserIds.push(userId);
    }

    // League 1: main user (admin) + fake users 0–4
    const league1Id = await ctx.db.insert('leagues', {
      name: 'Pit Wall Prophets',
      slug: 'pit-wall-prophets-2026',
      description: 'The serious predictors. Probably.',
      visibility: 'private',
      password: 'pitwall',
      createdBy: mainUser._id,
      season: 2026,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('leagueMembers', {
      leagueId: league1Id,
      userId: mainUser._id,
      role: 'admin',
      joinedAt: now,
    });
    for (let i = 0; i <= 4; i++) {
      await ctx.db.insert('leagueMembers', {
        leagueId: league1Id,
        userId: fakeUserIds[i],
        role: 'member',
        joinedAt: now,
      });
    }

    // League 2: fake users 5–8
    const league2Id = await ctx.db.insert('leagues', {
      name: 'DRS Zone',
      slug: 'drs-zone-2026',
      description: 'Living life in the drag reduction zone.',
      visibility: 'private',
      password: 'drszone',
      createdBy: fakeUserIds[5],
      season: 2026,
      createdAt: now,
      updatedAt: now,
    });

    for (let i = 5; i <= 8; i++) {
      await ctx.db.insert('leagueMembers', {
        leagueId: league2Id,
        userId: fakeUserIds[i],
        role: i === 5 ? 'admin' : 'member',
        joinedAt: now,
      });
    }

    // Deterministic picks for a fake user index + session index
    function makePicks(
      userIndex: number,
      sessionIndex: number,
    ): Array<Id<'drivers'>> {
      const shuffled = [...driverIds];
      const seed = userIndex * 7 + sessionIndex * 13;
      for (let j = shuffled.length - 1; j > 0; j--) {
        const k = Math.abs((seed * 31 + j * 17) % (j + 1));
        [shuffled[j], shuffled[k]] = [shuffled[k], shuffled[j]];
      }
      return shuffled.slice(0, 5);
    }

    const sessions: Array<SessionType> = ['quali', 'race'];

    // [userIndex, sessionsToPredict]
    const predictionMap: Array<[number, Array<SessionType>]> = [
      [0, ['quali', 'race']],
      [1, ['quali', 'race']],
      [2, ['quali']],
      // 3, 4: no predictions
      [5, ['quali', 'race']],
      [6, ['race']],
      // 7, 8: no predictions
    ];

    let predictionsCreated = 0;
    for (const [userIndex, predSessions] of predictionMap) {
      for (const sessionType of predSessions) {
        const sessionIndex = sessions.indexOf(sessionType);
        await ctx.db.insert('predictions', {
          userId: fakeUserIds[userIndex],
          raceId: australiaRace._id,
          sessionType,
          picks: makePicks(userIndex, sessionIndex),
          submittedAt: now - 60 * 60 * 1000,
          updatedAt: now,
        });
        predictionsCreated++;
      }
    }

    return {
      mainUserId: mainUser._id,
      mainUserEmail: mainUser.email,
      fakeUsersCreated: fakeUserIds.length,
      league1: { id: league1Id, name: 'Pit Wall Prophets', members: 6 },
      league2: { id: league2Id, name: 'DRS Zone', members: 4 },
      predictionsCreated,
    };
  },
});

/**
 * Reset dev database to a league testing scenario:
 * - Clears all predictions, results, scores, standings, fake users, leagues
 * - Resets all races to upcoming (australia-2026 pushed 4–5 days into future)
 * - Creates 9 fake users split across 2 leagues
 * - Main user goes into League 1 as admin with no predictions
 * - Some fake users have predictions for australia-2026, some don't
 *
 * Run via:
 *   npx convex run seed:reseedDevWithLeagues '{"mainUserClerkId": "user_xxx"}'
 */
export const reseedDevWithLeagues = internalAction({
  args: { mainUserClerkId: v.string() },
  handler: async (ctx, args) => {
    // Phase 1: Clear all dev data in batches
    let totalDeleted = 0;
    let iterations = 0;
    while (true) {
      const result: { deleted: number; done: boolean } = await ctx.runMutation(
        internal.seed._clearDevDataBatch,
      );
      totalDeleted += result.deleted;
      iterations++;
      if (result.done) {
        break;
      }
      if (iterations > 200) {
        throw new Error('Too many iterations clearing dev data');
      }
    }

    // Phase 2: Clear leagues
    await ctx.runMutation(internal.seed._clearLeagueData);

    // Phase 3: Reset races to upcoming with original 2026 dates
    const raceResult: { reset: number } = await ctx.runMutation(
      internal.seed._resetRacesToUpcoming,
    );

    // Phase 4: Push australia-2026 dates into the future so predictions are open
    await ctx.runMutation(internal.seed._pushAustraliaToFuture);

    // Phase 5: Ensure drivers exist
    await ctx.runMutation(internal.seed.seedDrivers);

    // Phase 6: Seed league scenario
    const seedResult: {
      mainUserId: string;
      mainUserEmail: string | null | undefined;
      fakeUsersCreated: number;
      league1: { id: string; name: string; members: number };
      league2: { id: string; name: string; members: number };
      predictionsCreated: number;
    } = await ctx.runMutation(internal.seed._seedLeagueScenario, {
      mainUserClerkId: args.mainUserClerkId,
    });

    return {
      cleared: totalDeleted,
      racesReset: raceResult.reset,
      australiaPushedToFuture: true,
      ...seedResult,
    };
  },
});

/**
 * Reset dev database to reproduce the post-quali / pre-race web scenario:
 * - Clears dev predictions, results, scores, standings, fake users, leagues
 * - Resets races to upcoming dates
 * - Moves australia-2026 so quali is locked but race is still open
 * - Ensures the main user exists with no predictions for that race
 * - Does not seed quali Top 5, race Top 5, or any H2H predictions for the main user
 *
 * Run via:
 *   npx convex run seed:reseedDevForPostQualiRaceOpen '{"mainUserClerkId": "user_xxx"}'
 */
export const reseedDevForPostQualiRaceOpen = internalAction({
  args: { mainUserClerkId: v.string() },
  handler: async (ctx, args) => {
    let totalDeleted = 0;
    let iterations = 0;
    while (true) {
      const result: { deleted: number; done: boolean } = await ctx.runMutation(
        internal.seed._clearDevDataBatch,
      );
      totalDeleted += result.deleted;
      iterations++;
      if (result.done) {
        break;
      }
      if (iterations > 200) {
        throw new Error('Too many iterations clearing dev data');
      }
    }

    await ctx.runMutation(internal.seed._clearLeagueData);

    const raceResult: { reset: number } = await ctx.runMutation(
      internal.seed._resetRacesToUpcoming,
    );

    await ctx.runMutation(internal.seed.seedDrivers);

    const scenario: {
      raceId: Id<'races'>;
      qualiStartAt: number;
      raceStartAt: number;
      mainUserId: Id<'users'>;
      mainUserEmail: string | null | undefined;
    } = await ctx.runMutation(internal.seed._seedPostQualiRaceOpenScenario, {
      mainUserClerkId: args.mainUserClerkId,
    });

    return {
      cleared: totalDeleted,
      racesReset: raceResult.reset,
      ...scenario,
    };
  },
});

/**
 * Reset dev database to a clean upcoming-race banner scenario:
 * - Clears dev predictions, results, scores, standings, fake users, leagues
 * - Resets races to upcoming dates
 * - Ensures drivers and 2026 H2H matchups exist
 * - Configures australia-2026 as an open weekend for the selected user
 * - Supports two variants:
 *   - top5_missing: no predictions, so the "make picks" banner shows
 *   - h2h_missing: Top 5 predictions exist, but H2H is empty
 *
 * Run via:
 *   npx convex run seed:reseedDevForUpcomingPredictionBanner '{"clerkUserId":"user_xxx","variant":"top5_missing"}'
 *   npx convex run seed:reseedDevForUpcomingPredictionBanner '{"username":"barrymichaeldoyle","variant":"h2h_missing"}'
 */
export const reseedDevForUpcomingPredictionBanner = internalAction({
  args: {
    clerkUserId: v.optional(v.string()),
    username: v.optional(v.string()),
    variant: v.optional(
      v.union(v.literal('top5_missing'), v.literal('h2h_missing')),
    ),
  },
  handler: async (ctx, args) => {
    let totalDeleted = 0;
    let iterations = 0;
    while (true) {
      const result: { deleted: number; done: boolean } = await ctx.runMutation(
        internal.seed._clearDevDataBatch,
      );
      totalDeleted += result.deleted;
      iterations++;
      if (result.done) {
        break;
      }
      if (iterations > 200) {
        throw new Error('Too many iterations clearing dev data');
      }
    }

    await ctx.runMutation(internal.seed._clearLeagueData);

    const raceResult: { reset: number } = await ctx.runMutation(
      internal.seed._resetRacesToUpcoming,
    );

    await ctx.runMutation(internal.seed.seedDrivers);
    await ctx.runMutation(internal.seed.seedH2HMatchups);

    const scenario: {
      raceId: Id<'races'>;
      raceSlug: string;
      qualiStartAt: number;
      raceStartAt: number;
      mainUserId: Id<'users'>;
      mainUserEmail: string | null | undefined;
      username: string | undefined;
      variant: 'top5_missing' | 'h2h_missing';
    } = await ctx.runMutation(
      internal.seed._seedUpcomingPredictionBannerScenario,
      {
        clerkUserId: args.clerkUserId,
        username: args.username,
        variant: args.variant ?? 'top5_missing',
      },
    );

    return {
      cleared: totalDeleted,
      racesReset: raceResult.reset,
      ...scenario,
    };
  },
});

/**
 * Reset dev database to the "post-Japan, Bahrain/Saudi cancelled, Miami next" scenario:
 * - Clears dev predictions, results, scores, standings, fake users, leagues
 * - Resets races to their seeded 2026 dates/statuses
 * - Ensures drivers and 2026 H2H matchups exist
 * - Marks japan-2026 as finished with race/quali results published in the past
 * - Leaves bahrain-2026 and saudi-arabia-2026 cancelled from the base calendar seed
 * - Ensures miami-2026 remains upcoming, making it the active prediction race
 *
 * Run via:
 *   npx convex run seed:reseedDevForPostJapanMiamiGap
 */
export const reseedDevForPostJapanMiamiGap = internalAction({
  args: {},
  handler: async (ctx) => {
    let totalDeleted = 0;
    let iterations = 0;
    while (true) {
      const result: { deleted: number; done: boolean } = await ctx.runMutation(
        internal.seed._clearDevDataBatch,
      );
      totalDeleted += result.deleted;
      iterations++;
      if (result.done) {
        break;
      }
      if (iterations > 200) {
        throw new Error('Too many iterations clearing dev data');
      }
    }

    await ctx.runMutation(internal.seed._clearLeagueData);

    const raceResult: { reset: number } = await ctx.runMutation(
      internal.seed._resetRacesToUpcoming,
    );

    await ctx.runMutation(internal.seed.seedDrivers);
    await ctx.runMutation(internal.seed.seedH2HMatchups);

    const scenario: {
      japanRaceId: Id<'races'>;
      japanRaceFinishedAt: number;
      miamiRaceId: Id<'races'>;
      miamiRaceStartAt: number;
      cancelledRaceSlugs: string[];
    } = await ctx.runMutation(internal.seed._seedPostJapanMiamiGapScenario);

    return {
      cleared: totalDeleted,
      racesReset: raceResult.reset,
      ...scenario,
    };
  },
});

/**
 * Internal: configure australia-2026 with quali locked and race still open,
 * leaving the main user with no predictions for that race.
 */
export const _seedPostQualiRaceOpenScenario = internalMutation({
  args: { mainUserClerkId: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const HOUR = 60 * 60 * 1000;
    const DAY = 24 * HOUR;

    const mainUser = await ctx.db
      .query('users')
      .withIndex('by_clerkUserId', (q) =>
        q.eq('clerkUserId', args.mainUserClerkId),
      )
      .unique();

    if (!mainUser) {
      throw new Error(
        `Main user not found for clerkUserId: ${args.mainUserClerkId}. Sign in first.`,
      );
    }

    const race = await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', 'australia-2026'))
      .unique();

    if (!race) {
      throw new Error('australia-2026 not found. Run seedRaces first.');
    }

    const qualiStartAt = now - 2 * HOUR;
    const raceStartAt = now + DAY;

    await ctx.db.patch(race._id, {
      status: 'upcoming',
      qualiStartAt,
      qualiLockAt: qualiStartAt,
      raceStartAt,
      predictionLockAt: raceStartAt,
      updatedAt: now,
    });

    return {
      raceId: race._id,
      qualiStartAt,
      raceStartAt,
      mainUserId: mainUser._id,
      mainUserEmail: mainUser.email,
    };
  },
});

export const _seedUpcomingPredictionBannerScenario = internalMutation({
  args: {
    clerkUserId: v.optional(v.string()),
    username: v.optional(v.string()),
    variant: v.union(v.literal('top5_missing'), v.literal('h2h_missing')),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const HOUR = 60 * 60 * 1000;
    const DAY = 24 * HOUR;

    const mainUser = args.clerkUserId
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
        : await ctx.db.query('users').first();

    if (!mainUser) {
      throw new Error(
        'Main user not found. Sign in first or provide clerkUserId/username.',
      );
    }

    const race = await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', 'australia-2026'))
      .unique();

    if (!race) {
      throw new Error('australia-2026 not found. Run seedRaces first.');
    }

    const drivers = await ctx.db.query('drivers').collect();
    if (drivers.length < 5) {
      throw new Error('Need at least 5 drivers. Run seedDrivers first.');
    }

    const qualiStartAt = now + 2 * DAY;
    const raceStartAt = now + 3 * DAY;

    await ctx.db.patch(race._id, {
      status: 'upcoming',
      qualiStartAt,
      qualiLockAt: qualiStartAt,
      raceStartAt,
      predictionLockAt: raceStartAt,
      updatedAt: now,
    });

    const existingPredictions = await ctx.db
      .query('predictions')
      .withIndex('by_user_race_session', (q) =>
        q.eq('userId', mainUser._id).eq('raceId', race._id),
      )
      .collect();
    for (const prediction of existingPredictions) {
      await ctx.db.delete(prediction._id);
    }

    const existingH2H = await ctx.db
      .query('h2hPredictions')
      .withIndex('by_user_race_session', (q) =>
        q.eq('userId', mainUser._id).eq('raceId', race._id),
      )
      .collect();
    for (const prediction of existingH2H) {
      await ctx.db.delete(prediction._id);
    }

    if (args.variant === 'h2h_missing') {
      const picks = drivers.slice(0, 5).map((driver) => driver._id);
      await ctx.db.insert('predictions', {
        userId: mainUser._id,
        raceId: race._id,
        sessionType: 'quali',
        picks,
        submittedAt: now - HOUR,
        updatedAt: now - HOUR,
      });
      await ctx.db.insert('predictions', {
        userId: mainUser._id,
        raceId: race._id,
        sessionType: 'race',
        picks,
        submittedAt: now - HOUR,
        updatedAt: now - HOUR,
      });
    }

    return {
      raceId: race._id,
      raceSlug: race.slug,
      qualiStartAt,
      raceStartAt,
      mainUserId: mainUser._id,
      mainUserEmail: mainUser.email,
      username: mainUser.username,
      variant: args.variant,
    };
  },
});

export const _seedPostJapanMiamiGapScenario = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const HOUR = 60 * 60 * 1000;

    const drivers = await ctx.db.query('drivers').collect();
    if (drivers.length < 5) {
      throw new Error('Need at least 5 drivers. Run seedDrivers first.');
    }

    const japanRace = await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', 'japan-2026'))
      .unique();
    const bahrainRace = await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', 'bahrain-2026'))
      .unique();
    const saudiRace = await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', 'saudi-arabia-2026'))
      .unique();
    const miamiRace = await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', 'miami-2026'))
      .unique();

    if (!japanRace || !bahrainRace || !saudiRace || !miamiRace) {
      throw new Error(
        'japan-2026, bahrain-2026, saudi-arabia-2026, and miami-2026 races are required. Run seedRaces first.',
      );
    }

    const japanQualiAt = now - 28 * HOUR;
    const japanRaceAt = now - 24 * HOUR;
    const publishedAt = now - 23 * HOUR;
    const classification = drivers.map((driver) => driver._id);
    await ctx.db.patch(japanRace._id, {
      status: 'finished',
      qualiStartAt: japanQualiAt,
      qualiLockAt: japanQualiAt,
      raceStartAt: japanRaceAt,
      predictionLockAt: japanRaceAt,
      updatedAt: now,
    });

    await ctx.db.patch(bahrainRace._id, {
      status: 'cancelled',
      updatedAt: now,
    });
    await ctx.db.patch(saudiRace._id, {
      status: 'cancelled',
      updatedAt: now,
    });
    await ctx.db.patch(miamiRace._id, {
      status: 'upcoming',
      updatedAt: now,
    });

    const existingJapanQuali = await ctx.db
      .query('results')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', japanRace._id).eq('sessionType', 'quali'),
      )
      .unique();
    if (!existingJapanQuali) {
      await ctx.db.insert('results', {
        raceId: japanRace._id,
        sessionType: 'quali',
        classification,
        publishedAt,
        updatedAt: publishedAt,
      });
    }

    const existingJapanRace = await ctx.db
      .query('results')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', japanRace._id).eq('sessionType', 'race'),
      )
      .unique();
    if (!existingJapanRace) {
      await ctx.db.insert('results', {
        raceId: japanRace._id,
        sessionType: 'race',
        classification,
        publishedAt: publishedAt + HOUR,
        updatedAt: publishedAt + HOUR,
      });
    }

    return {
      japanRaceId: japanRace._id,
      japanRaceFinishedAt: japanRaceAt,
      miamiRaceId: miamiRace._id,
      miamiRaceStartAt: miamiRace.raceStartAt,
      cancelledRaceSlugs: ['bahrain-2026', 'saudi-arabia-2026'],
    };
  },
});

// ─────────────────── Leaderboard Scenario ───────────────────

const LEADERBOARD_SCENARIO_FAKE_USERS = [
  // Rank 1 — top scorer
  { username: 'OvercutKing', displayName: 'Overcut King', totalPoints: 147 },
  // Ranks 3–25 (target user is rank 2)
  { username: 'ApexPredator', displayName: 'Apex Predator', totalPoints: 114 },
  { username: 'UndercutAce', displayName: 'Undercut Ace', totalPoints: 109 },
  { username: 'GridHero', displayName: 'Grid Hero', totalPoints: 104 },
  { username: 'PodiumChaser', displayName: 'Podium Chaser', totalPoints: 99 },
  { username: 'FastLapper', displayName: 'Fast Lapper', totalPoints: 94 },
  { username: 'RacingLine', displayName: 'Racing Line', totalPoints: 89 },
  {
    username: 'SlipstreamKing',
    displayName: 'Slipstream King',
    totalPoints: 84,
  },
  { username: 'TyreHunter', displayName: 'Tyre Hunter', totalPoints: 79 },
  { username: 'PitWallPro', displayName: 'Pit Wall Pro', totalPoints: 74 },
  { username: 'FlatoutFrank', displayName: 'Flatout Frank', totalPoints: 69 },
  { username: 'CheckeredFan', displayName: 'Checkered Fan', totalPoints: 64 },
  { username: 'CornerKing', displayName: 'Corner King', totalPoints: 59 },
  { username: 'DrivingForce', displayName: 'Driving Force', totalPoints: 54 },
  { username: 'F1Fanatic2026', displayName: 'F1 Fanatic', totalPoints: 50 },
  {
    username: 'GrandPrixGuru',
    displayName: 'Grand Prix Guru',
    totalPoints: 45,
  },
  { username: 'HaloHunter', displayName: 'Halo Hunter', totalPoints: 40 },
  { username: 'InlappingIan', displayName: 'Inlapping Ian', totalPoints: 36 },
  { username: 'JumpStartJim', displayName: 'Jump Start Jim', totalPoints: 32 },
  { username: 'KinkyKerb', displayName: 'Kinky Kerb', totalPoints: 27 },
  { username: 'LappedLarry', displayName: 'Lapped Larry', totalPoints: 23 },
  { username: 'MidpackMax', displayName: 'Midpack Max', totalPoints: 18 },
  { username: 'NeutralNick', displayName: 'Neutral Nick', totalPoints: 12 },
  // 5 zero-point users — predicted but scored nothing
  { username: 'BackmarkerBob', displayName: 'Backmarker Bob', totalPoints: 0 },
  { username: 'DNFDave', displayName: 'DNF Dave', totalPoints: 0 },
  { username: 'PenaltyPete', displayName: 'Penalty Pete', totalPoints: 0 },
  { username: 'SpinningSteve', displayName: 'Spinning Steve', totalPoints: 0 },
  { username: 'WallWacker', displayName: 'Wall Wacker', totalPoints: 0 },
];

/**
 * Internal: Seed 25 scored users + 5 zero-point predictors for leaderboard testing.
 * The specified user (default: barrymichaeldoyle) is placed ~6th (below the podium).
 * Uses the first 3 races in the calendar; marks them as finished with results.
 */
export const _seedLeaderboardData = internalMutation({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    const TARGET_POINTS = 95;

    // Find the target user
    const targetUser = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', args.username))
      .unique();
    if (!targetUser) {
      throw new Error(
        `User "${args.username}" not found. Sign in to the app first.`,
      );
    }

    // Get drivers
    const drivers = await ctx.db.query('drivers').collect();
    if (drivers.length < 20) {
      throw new Error('Need at least 20 drivers. Run seedDrivers first.');
    }
    const driverIds = drivers.map((d) => d._id);

    // Deterministic pseudo-shuffle so results are stable across reruns
    function deterministicShuffle(
      arr: Array<Id<'drivers'>>,
      seed: number,
    ): Array<Id<'drivers'>> {
      const result = [...arr];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.abs((seed * 1103515245 + 12345 + i * 6789) % (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    }

    // Select first 3 races sorted by round (use non-sprint for simplicity)
    const allRaces = await ctx.db.query('races').collect();
    const sortedRaces = [...allRaces].sort((a, b) => a.round - b.round);
    const racesToFinish = sortedRaces.filter((r) => !r.hasSprint).slice(0, 3);
    if (racesToFinish.length < 3) {
      throw new Error('Need at least 3 non-sprint races. Run seedRaces first.');
    }

    // Mark races as finished, create fresh results
    type SessionClassification = {
      sessionType: SessionType;
      top5: Array<Id<'drivers'>>;
      outOfTop5: Array<Id<'drivers'>>;
    };
    const raceResultData: Array<{
      raceId: Id<'races'>;
      sessions: Array<SessionClassification>;
    }> = [];

    for (let i = 0; i < racesToFinish.length; i++) {
      const race = racesToFinish[i];
      const weeksAgo = (racesToFinish.length - i) * 7 * DAY;
      const pastRaceStart = now - weeksAgo;

      await ctx.db.patch(race._id, {
        status: 'finished',
        raceStartAt: pastRaceStart,
        predictionLockAt: pastRaceStart - DAY,
        qualiStartAt: pastRaceStart - DAY,
        qualiLockAt: pastRaceStart - DAY,
        updatedAt: now,
      });

      const sessions: Array<SessionType> = ['quali', 'race'];
      const sessionData: Array<SessionClassification> = [];

      for (let si = 0; si < sessions.length; si++) {
        const sessionType = sessions[si];
        const classification = deterministicShuffle(driverIds, i * 100 + si);
        const top5 = classification.slice(0, 5);
        const outOfTop5 = classification.slice(5);

        await ctx.db.insert('results', {
          raceId: race._id,
          sessionType,
          classification,
          publishedAt: pastRaceStart + 4 * 60 * 60 * 1000,
          updatedAt: now,
        });

        sessionData.push({ sessionType, top5, outOfTop5 });
      }

      raceResultData.push({ raceId: race._id, sessions: sessionData });
    }

    // Flatten all sessions
    const allSessions = raceResultData.flatMap((r) =>
      r.sessions.map((s) => ({ raceId: r.raceId, ...s })),
    );
    const numSessions = allSessions.length;

    // Distribute totalPoints evenly across sessions
    function distributePoints(total: number, count: number): Array<number> {
      const base = Math.floor(total / count);
      const remainder = total % count;
      return Array.from({ length: count }, (_, i) =>
        i < remainder ? base + 1 : base,
      );
    }

    // Make picks for a session: scoring users pick from top5 area, zero users pick outside
    function makePicks(
      top5: Array<Id<'drivers'>>,
      outOfTop5: Array<Id<'drivers'>>,
      sessionPoints: number,
    ): Array<Id<'drivers'>> {
      if (sessionPoints === 0) {
        // picks entirely outside the actual top 5 — guaranteed 0 pts
        return outOfTop5.slice(0, 5);
      }
      // picks from within top5 (order scrambled slightly for realism)
      return [top5[1], top5[0], top5[3], top5[2], top5[4]];
    }

    // Create all fake users + their scores, predictions, and standings
    let usersCreated = 0;
    for (let ui = 0; ui < LEADERBOARD_SCENARIO_FAKE_USERS.length; ui++) {
      const { username, displayName, totalPoints } =
        LEADERBOARD_SCENARIO_FAKE_USERS[ui];

      // Upsert fake user (reuse if already exists from a prior run)
      let fakeUser = await ctx.db
        .query('users')
        .withIndex('by_username', (q) => q.eq('username', username))
        .unique();

      if (!fakeUser) {
        const id = await ctx.db.insert('users', {
          clerkUserId: `fake_user_leaderboard_${ui}`,
          username,
          displayName,
          email: `${username.toLowerCase()}@example.com`,
          createdAt: now,
          updatedAt: now,
        });
        fakeUser = await ctx.db.get(id);
        usersCreated++;
      }
      if (!fakeUser) {
        throw new Error('Failed to create fake user');
      }

      const pointsList = distributePoints(totalPoints, numSessions);

      for (let si = 0; si < allSessions.length; si++) {
        const { raceId, sessionType, top5, outOfTop5 } = allSessions[si];
        const sessionPoints = pointsList[si];
        const picks = makePicks(top5, outOfTop5, sessionPoints);

        await ctx.db.insert('predictions', {
          userId: fakeUser._id,
          raceId,
          sessionType,
          picks,
          submittedAt: now - 7 * DAY,
          updatedAt: now - 7 * DAY,
        });

        await ctx.db.insert('scores', {
          userId: fakeUser._id,
          raceId,
          sessionType,
          points: sessionPoints,
          username,
          displayName,
          createdAt: now,
          updatedAt: now,
        });
      }

      await ctx.db.insert('seasonStandings', {
        userId: fakeUser._id,
        season: 2026,
        totalPoints,
        raceCount: racesToFinish.length,
        username,
        displayName,
        updatedAt: now,
      });
    }

    // Create the target user's scores and standings at rank 2
    const targetPointsList = distributePoints(TARGET_POINTS, numSessions);

    for (let si = 0; si < allSessions.length; si++) {
      const { raceId, sessionType, top5, outOfTop5 } = allSessions[si];
      const sessionPoints = targetPointsList[si];
      const picks = makePicks(top5, outOfTop5, sessionPoints);

      await ctx.db.insert('predictions', {
        userId: targetUser._id,
        raceId,
        sessionType,
        picks,
        submittedAt: now - 7 * DAY,
        updatedAt: now - 7 * DAY,
      });

      await ctx.db.insert('scores', {
        userId: targetUser._id,
        raceId,
        sessionType,
        points: sessionPoints,
        username: targetUser.username,
        displayName: targetUser.displayName,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert('seasonStandings', {
      userId: targetUser._id,
      season: 2026,
      totalPoints: TARGET_POINTS,
      raceCount: racesToFinish.length,
      username: targetUser.username,
      displayName: targetUser.displayName,
      updatedAt: now,
    });

    return {
      targetUserId: targetUser._id,
      targetUserPoints: TARGET_POINTS,
      racesFinished: racesToFinish.length,
      sessionsPerRace: 2,
      fakeUsersCreated: usersCreated,
    };
  },
});

/**
 * Internal: Seed H2H results, scores, predictions and season standings for all
 * leaderboard fake users + the target user. Must be called after _seedLeaderboardData
 * so that finished races and results already exist.
 *
 * Fake users get deterministically varying accuracy (rank 1 ~80%, rank 28 ~50%).
 * Target user gets ~65% accuracy and also gets h2hPredictions created.
 */
export const _seedH2HLeaderboardData = internalMutation({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();

    const targetUser = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', args.username))
      .unique();
    if (!targetUser) {
      throw new Error(`User "${args.username}" not found.`);
    }

    const matchups = await ctx.db
      .query('h2hMatchups')
      .withIndex('by_season', (q) => q.eq('season', 2026))
      .collect();
    if (matchups.length === 0) {
      throw new Error('No H2H matchups found. Run seedH2HMatchups first.');
    }

    // Use the same 3 finished non-sprint races that _seedLeaderboardData set up
    const allRaces = await ctx.db.query('races').collect();
    const finishedRaces = [...allRaces]
      .filter((r) => !r.hasSprint && r.status === 'finished')
      .sort((a, b) => a.round - b.round)
      .slice(0, 3);
    if (finishedRaces.length === 0) {
      throw new Error('No finished races. Run _seedLeaderboardData first.');
    }

    // Precompute H2H winners per session from actual classifications
    type SessionInfo = {
      raceId: Id<'races'>;
      sessionType: SessionType;
      raceRound: number;
      sessionIndex: number;
      winners: Map<Id<'h2hMatchups'>, Id<'drivers'>>;
    };
    const allSessions: Array<SessionInfo> = [];
    let h2hResultsCreated = 0;

    for (let ri = 0; ri < finishedRaces.length; ri++) {
      const race = finishedRaces[ri];
      const sessions: Array<SessionType> = ['quali', 'race'];

      for (let si = 0; si < sessions.length; si++) {
        const sessionType = sessions[si];
        const result = await ctx.db
          .query('results')
          .withIndex('by_race_session', (q) =>
            q.eq('raceId', race._id).eq('sessionType', sessionType),
          )
          .unique();
        if (!result) {
          continue;
        }

        const positionMap = new Map<string, number>();
        for (let i = 0; i < result.classification.length; i++) {
          positionMap.set(result.classification[i], i);
        }

        const winners = new Map<Id<'h2hMatchups'>, Id<'drivers'>>();
        for (const matchup of matchups) {
          const pos1 = positionMap.get(matchup.driver1Id);
          const pos2 = positionMap.get(matchup.driver2Id);
          if (pos1 === undefined || pos2 === undefined) {
            continue;
          }
          winners.set(
            matchup._id,
            pos1 < pos2 ? matchup.driver1Id : matchup.driver2Id,
          );
        }

        // Create h2hResults for this session
        for (const [matchupId, winnerId] of winners) {
          const existing = await ctx.db
            .query('h2hResults')
            .withIndex('by_race_session_matchup', (q) =>
              q
                .eq('raceId', race._id)
                .eq('sessionType', sessionType)
                .eq('matchupId', matchupId),
            )
            .unique();
          if (!existing) {
            await ctx.db.insert('h2hResults', {
              raceId: race._id,
              sessionType,
              matchupId,
              winnerId,
              publishedAt: race.raceStartAt + 4 * 60 * 60 * 1000,
            });
            h2hResultsCreated++;
          }
        }

        allSessions.push({
          raceId: race._id,
          sessionType,
          raceRound: race.round,
          sessionIndex: ri * 2 + si,
          winners,
        });
      }
    }

    const numRaces = finishedRaces.length;

    // Track per-user season totals for h2hSeasonStandings
    const userTotals = new Map<
      Id<'users'>,
      {
        username: string;
        displayName?: string;
        totalPoints: number;
        correctPicks: number;
        totalPicks: number;
      }
    >();

    // Seed fake users with varying accuracy based on rank index
    for (let ui = 0; ui < LEADERBOARD_SCENARIO_FAKE_USERS.length; ui++) {
      const { username, displayName } = LEADERBOARD_SCENARIO_FAKE_USERS[ui];

      const fakeUser = await ctx.db
        .query('users')
        .withIndex('by_username', (q) => q.eq('username', username))
        .unique();
      if (!fakeUser) {
        continue;
      }

      // Higher rank (lower ui) = higher accuracy: modulo increases from 7 down to 2
      const mod = Math.max(2, 7 - Math.floor((ui * 5) / 28));

      let seasonCorrect = 0;
      let seasonTotal = 0;
      let seasonPoints = 0;

      for (const { raceId, sessionType, raceRound, winners } of allSessions) {
        let correctPicks = 0;
        let totalPicks = 0;

        for (let mi = 0; mi < matchups.length; mi++) {
          const matchup = matchups[mi];
          const winnerId = winners.get(matchup._id);
          if (!winnerId) {
            continue;
          }
          totalPicks++;
          const isCorrect = (mi + ui + raceRound) % mod !== 0;
          if (isCorrect) {
            correctPicks++;
          }
        }

        if (totalPicks > 0) {
          await ctx.db.insert('h2hScores', {
            userId: fakeUser._id,
            raceId,
            sessionType,
            points: correctPicks,
            correctPicks,
            totalPicks,
            createdAt: now,
            updatedAt: now,
          });
          seasonCorrect += correctPicks;
          seasonTotal += totalPicks;
          seasonPoints += correctPicks;
        }
      }

      userTotals.set(fakeUser._id, {
        username,
        displayName,
        totalPoints: seasonPoints,
        correctPicks: seasonCorrect,
        totalPicks: seasonTotal,
      });
    }

    // Seed target user with ~65% accuracy + create h2hPredictions
    let targetCorrect = 0;
    let targetTotal = 0;
    let targetPoints = 0;
    let h2hPredictionsCreated = 0;

    for (const { raceId, sessionType, raceRound, winners } of allSessions) {
      let correctPicks = 0;
      let totalPicks = 0;

      for (let mi = 0; mi < matchups.length; mi++) {
        const matchup = matchups[mi];
        const winnerId = winners.get(matchup._id);
        if (!winnerId) {
          continue;
        }
        totalPicks++;
        // ~65% accuracy: wrong when (mi + raceRound) % 10 >= 7
        const isCorrect = (mi + raceRound) % 10 < 7;
        if (isCorrect) {
          correctPicks++;
        }

        const predictedWinnerId = isCorrect
          ? winnerId
          : winnerId === matchup.driver1Id
            ? matchup.driver2Id
            : matchup.driver1Id;

        await ctx.db.insert('h2hPredictions', {
          userId: targetUser._id,
          raceId,
          sessionType,
          matchupId: matchup._id,
          predictedWinnerId,
          submittedAt: now - 60 * 60 * 1000,
          updatedAt: now,
        });
        h2hPredictionsCreated++;
      }

      if (totalPicks > 0) {
        await ctx.db.insert('h2hScores', {
          userId: targetUser._id,
          raceId,
          sessionType,
          points: correctPicks,
          correctPicks,
          totalPicks,
          createdAt: now,
          updatedAt: now,
        });
        targetCorrect += correctPicks;
        targetTotal += totalPicks;
        targetPoints += correctPicks;
      }
    }

    // Create h2hSeasonStandings for all fake users
    for (const [userId, totals] of userTotals) {
      await ctx.db.insert('h2hSeasonStandings', {
        userId,
        season: 2026,
        totalPoints: totals.totalPoints,
        raceCount: numRaces,
        correctPicks: totals.correctPicks,
        totalPicks: totals.totalPicks,
        username: totals.username,
        displayName: totals.displayName,
        updatedAt: now,
      });
    }

    // Create h2hSeasonStandings for target user
    await ctx.db.insert('h2hSeasonStandings', {
      userId: targetUser._id,
      season: 2026,
      totalPoints: targetPoints,
      raceCount: numRaces,
      correctPicks: targetCorrect,
      totalPicks: targetTotal,
      username: targetUser.username,
      displayName: targetUser.displayName,
      updatedAt: now,
    });

    return {
      h2hResultsCreated,
      h2hScoresCreated: userTotals.size + 1,
      h2hPredictionsCreated,
      h2hStandingsCreated: userTotals.size + 1,
    };
  },
});

/**
 * Internal: Seed a "halfway through the weekend" scenario for the 4th non-sprint race.
 * - Patches the race to `locked` status with quali already done, race starting tomorrow
 * - Creates results for the quali session
 * - Creates scores + h2hScores for all fake users + target user for quali
 * - Creates predictions + h2hPredictions for the target user (so leaderboard is visible)
 * - h2hResults for the quali session
 */
export const _seedCurrentWeekendData = internalMutation({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;

    const targetUser = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', args.username))
      .unique();
    if (!targetUser) {
      throw new Error(`User "${args.username}" not found.`);
    }

    const matchups = await ctx.db
      .query('h2hMatchups')
      .withIndex('by_season', (q) => q.eq('season', 2026))
      .collect();
    if (matchups.length === 0) {
      throw new Error('No H2H matchups found. Run seedH2HMatchups first.');
    }

    const drivers = await ctx.db.query('drivers').collect();
    const driverIds = drivers.map((d) => d._id);

    // Get the 4th non-sprint race
    const allRaces = await ctx.db.query('races').collect();
    const nonSprintRaces = [...allRaces]
      .filter((r) => !r.hasSprint)
      .sort((a, b) => a.round - b.round);
    if (nonSprintRaces.length < 4) {
      throw new Error('Need at least 4 non-sprint races.');
    }
    const currentRace = nonSprintRaces[3];

    // Patch race: quali done yesterday, race tomorrow
    const qualiTime = now - DAY;
    const raceTime = now + DAY;
    await ctx.db.patch(currentRace._id, {
      status: 'locked',
      qualiStartAt: qualiTime - 2 * 60 * 60 * 1000,
      qualiLockAt: qualiTime - 2 * 60 * 60 * 1000,
      predictionLockAt: qualiTime - 2 * 60 * 60 * 1000,
      raceStartAt: raceTime,
      updatedAt: now,
    });

    // Deterministic shuffle reused from _seedLeaderboardData pattern
    function deterministicShuffle(
      arr: Array<Id<'drivers'>>,
      seed: number,
    ): Array<Id<'drivers'>> {
      const result = [...arr];
      for (let i = result.length - 1; i > 0; i--) {
        const j = Math.abs((seed * 1103515245 + 12345 + i * 6789) % (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
      }
      return result;
    }

    // Create quali result
    const qualiClassification = deterministicShuffle(driverIds, 999);
    const qualiTop5 = qualiClassification.slice(0, 5);
    const qualiOutOfTop5 = qualiClassification.slice(5);
    await ctx.db.insert('results', {
      raceId: currentRace._id,
      sessionType: 'quali',
      classification: qualiClassification,
      publishedAt: qualiTime + 60 * 60 * 1000,
      updatedAt: now,
    });

    // Determine H2H winners for quali
    const positionMap = new Map<string, number>();
    for (let i = 0; i < qualiClassification.length; i++) {
      positionMap.set(qualiClassification[i], i);
    }
    const h2hWinners = new Map<Id<'h2hMatchups'>, Id<'drivers'>>();
    for (const matchup of matchups) {
      const pos1 = positionMap.get(matchup.driver1Id);
      const pos2 = positionMap.get(matchup.driver2Id);
      if (pos1 === undefined || pos2 === undefined) {
        continue;
      }
      h2hWinners.set(
        matchup._id,
        pos1 < pos2 ? matchup.driver1Id : matchup.driver2Id,
      );
    }

    // Create h2hResults for quali
    for (const [matchupId, winnerId] of h2hWinners) {
      await ctx.db.insert('h2hResults', {
        raceId: currentRace._id,
        sessionType: 'quali',
        matchupId,
        winnerId,
        publishedAt: qualiTime + 60 * 60 * 1000,
      });
    }

    function makePicks(
      top5: Array<Id<'drivers'>>,
      outOfTop5: Array<Id<'drivers'>>,
      sessionPoints: number,
    ): Array<Id<'drivers'>> {
      if (sessionPoints === 0) {
        return outOfTop5.slice(0, 5);
      }
      return [top5[1], top5[0], top5[3], top5[2], top5[4]];
    }

    // Seed all fake users: quali predictions + scores + h2hScores
    for (let ui = 0; ui < LEADERBOARD_SCENARIO_FAKE_USERS.length; ui++) {
      const { username, displayName, totalPoints } =
        LEADERBOARD_SCENARIO_FAKE_USERS[ui];

      const fakeUser = await ctx.db
        .query('users')
        .withIndex('by_username', (q) => q.eq('username', username))
        .unique();
      if (!fakeUser) {
        continue;
      }

      // Scale quali points proportionally to their season total (out of 3 races × 2 sessions = 6 sessions)
      const qualiPoints = Math.round((totalPoints / 6 / 25) * 18); // rough proportional score
      const picks = makePicks(qualiTop5, qualiOutOfTop5, qualiPoints);

      await ctx.db.insert('predictions', {
        userId: fakeUser._id,
        raceId: currentRace._id,
        sessionType: 'quali',
        picks,
        submittedAt: qualiTime - DAY,
        updatedAt: qualiTime - DAY,
      });

      await ctx.db.insert('scores', {
        userId: fakeUser._id,
        raceId: currentRace._id,
        sessionType: 'quali',
        points: qualiPoints,
        username,
        displayName,
        createdAt: now,
        updatedAt: now,
      });

      // H2H score for fake user
      const mod = Math.max(2, 7 - Math.floor((ui * 5) / 28));
      let correctPicks = 0;
      let totalPicks = 0;
      for (let mi = 0; mi < matchups.length; mi++) {
        const matchup = matchups[mi];
        if (!h2hWinners.has(matchup._id)) {
          continue;
        }
        totalPicks++;
        const isCorrect = (mi + ui + currentRace.round) % mod !== 0;
        if (isCorrect) {
          correctPicks++;
        }
      }
      if (totalPicks > 0) {
        await ctx.db.insert('h2hScores', {
          userId: fakeUser._id,
          raceId: currentRace._id,
          sessionType: 'quali',
          points: correctPicks,
          correctPicks,
          totalPicks,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    // Seed target user: quali prediction + scores + h2hPredictions + h2hScores
    const targetQualiPoints = 14; // reasonable score to put them mid-pack
    const targetPicks = makePicks(qualiTop5, qualiOutOfTop5, targetQualiPoints);

    await ctx.db.insert('predictions', {
      userId: targetUser._id,
      raceId: currentRace._id,
      sessionType: 'quali',
      picks: targetPicks,
      submittedAt: qualiTime - DAY,
      updatedAt: qualiTime - DAY,
    });

    await ctx.db.insert('scores', {
      userId: targetUser._id,
      raceId: currentRace._id,
      sessionType: 'quali',
      points: targetQualiPoints,
      username: targetUser.username,
      displayName: targetUser.displayName,
      createdAt: now,
      updatedAt: now,
    });

    let targetCorrect = 0;
    let targetTotal = 0;
    for (let mi = 0; mi < matchups.length; mi++) {
      const matchup = matchups[mi];
      const winnerId = h2hWinners.get(matchup._id);
      if (!winnerId) {
        continue;
      }
      targetTotal++;
      const isCorrect = (mi + currentRace.round) % 10 < 7;
      if (isCorrect) {
        targetCorrect++;
      }
      const predictedWinnerId = isCorrect
        ? winnerId
        : winnerId === matchup.driver1Id
          ? matchup.driver2Id
          : matchup.driver1Id;

      await ctx.db.insert('h2hPredictions', {
        userId: targetUser._id,
        raceId: currentRace._id,
        sessionType: 'quali',
        matchupId: matchup._id,
        predictedWinnerId,
        submittedAt: qualiTime - DAY,
        updatedAt: qualiTime - DAY,
      });
    }

    if (targetTotal > 0) {
      await ctx.db.insert('h2hScores', {
        userId: targetUser._id,
        raceId: currentRace._id,
        sessionType: 'quali',
        points: targetCorrect,
        correctPicks: targetCorrect,
        totalPicks: targetTotal,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      raceId: currentRace._id,
      raceName: currentRace.name,
      qualiResultCreated: true,
      h2hResultsCreated: h2hWinners.size,
    };
  },
});

/**
 * Internal: Create 2 leagues using the fake users already seeded by
 * _seedLeaderboardData. The target user is admin of League 1 and a member
 * of League 2.
 *
 * League 1 "Pit Wall Prophets" (8 members): target user (admin) + fake users 0–6
 * League 2 "DRS Zone" (6 members): target user (member) + fake users 7–11
 * League 3 "Backmarkers United" (5 members): fake users 12–16 (no target user)
 */
export const _seedLeagueLeaderboardData = internalMutation({
  args: { username: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();

    const targetUser = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', args.username))
      .unique();
    if (!targetUser) {
      throw new Error(`User "${args.username}" not found.`);
    }

    // Resolve fake user IDs from the already-seeded leaderboard users
    const fakeUserIds: Array<Id<'users'>> = [];
    for (let i = 0; i < 17; i++) {
      const { username } = LEADERBOARD_SCENARIO_FAKE_USERS[i];
      const user = await ctx.db
        .query('users')
        .withIndex('by_username', (q) => q.eq('username', username))
        .unique();
      if (user) {
        fakeUserIds.push(user._id);
      }
    }

    if (fakeUserIds.length < 17) {
      throw new Error('Not enough fake users. Run _seedLeaderboardData first.');
    }

    // League 1: target user (admin) + fake users 0–6
    const league1Id = await ctx.db.insert('leagues', {
      name: 'Pit Wall Prophets',
      slug: 'pit-wall-prophets-2026',
      description: 'The serious predictors. Probably.',
      visibility: 'private',
      password: 'pitwall',
      createdBy: targetUser._id,
      season: 2026,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('leagueMembers', {
      leagueId: league1Id,
      userId: targetUser._id,
      role: 'admin',
      joinedAt: now,
    });
    for (let i = 0; i <= 6; i++) {
      await ctx.db.insert('leagueMembers', {
        leagueId: league1Id,
        userId: fakeUserIds[i],
        role: 'member',
        joinedAt: now - i * 60 * 60 * 1000,
      });
    }

    // League 2: target user (member) + fake users 7–11
    const league2Id = await ctx.db.insert('leagues', {
      name: 'DRS Zone',
      slug: 'drs-zone-2026',
      description: 'Living life in the drag reduction zone.',
      visibility: 'private',
      password: 'drszone',
      createdBy: fakeUserIds[7],
      season: 2026,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert('leagueMembers', {
      leagueId: league2Id,
      userId: fakeUserIds[7],
      role: 'admin',
      joinedAt: now,
    });
    await ctx.db.insert('leagueMembers', {
      leagueId: league2Id,
      userId: targetUser._id,
      role: 'member',
      joinedAt: now - 30 * 60 * 1000,
    });
    for (let i = 8; i <= 11; i++) {
      await ctx.db.insert('leagueMembers', {
        leagueId: league2Id,
        userId: fakeUserIds[i],
        role: 'member',
        joinedAt: now - i * 45 * 60 * 1000,
      });
    }

    // League 3: fake users 12–16 only (no target user)
    const league3Id = await ctx.db.insert('leagues', {
      name: 'Backmarkers United',
      slug: 'backmarkers-united-2026',
      description: 'We start at the back. Sometimes we finish there too.',
      visibility: 'public',
      createdBy: fakeUserIds[12],
      season: 2026,
      createdAt: now,
      updatedAt: now,
    });

    for (let i = 12; i <= 16; i++) {
      await ctx.db.insert('leagueMembers', {
        leagueId: league3Id,
        userId: fakeUserIds[i],
        role: i === 12 ? 'admin' : 'member',
        joinedAt: now - (i - 12) * 2 * 60 * 60 * 1000,
      });
    }

    return {
      leaguesCreated: 3,
      league1: { id: league1Id, name: 'Pit Wall Prophets', members: 8 },
      league2: { id: league2Id, name: 'DRS Zone', members: 6 },
      league3: { id: league3Id, name: 'Backmarkers United', members: 5 },
    };
  },
});

/**
 * Reset dev DB to a leaderboard testing scenario:
 * - Clears all dev data (scores, predictions, results, standings, fake users)
 * - Resets races to upcoming dates
 * - Marks first 3 non-sprint races as finished with results
 * - Creates 24 fake users (1 top scorer + 23 ranked below you) + 5 zero-point users
 * - Places the specified user (default: barrymichaeldoyle) at ~rank 6 with 95 pts
 *
 * Run via:
 *   npx convex run seed:seedLeaderboardScenario
 *   npx convex run seed:seedLeaderboardScenario '{"username": "yourname"}'
 */
export const seedLeaderboardScenario = internalAction({
  args: {
    username: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const username = args.username ?? 'barrymichaeldoyle';

    // Phase 1: Clear all dev data
    let totalDeleted = 0;
    let iterations = 0;
    while (true) {
      const result: { deleted: number; done: boolean } = await ctx.runMutation(
        internal.seed._clearDevDataBatch,
      );
      totalDeleted += result.deleted;
      iterations++;
      if (result.done) {
        break;
      }
      if (iterations > 200) {
        throw new Error('Too many iterations clearing dev data');
      }
    }

    // Phase 2: Clear leagues
    await ctx.runMutation(internal.seed._clearLeagueData);

    // Phase 3: Reset races to original upcoming dates
    const raceResult: { reset: number } = await ctx.runMutation(
      internal.seed._resetRacesToUpcoming,
    );

    // Phase 4: Ensure drivers and H2H matchups exist
    await ctx.runMutation(internal.seed.seedDrivers);
    await ctx.runMutation(internal.seed.seedH2HMatchups);

    // Phase 5: Seed the leaderboard data
    const seedResult: {
      targetUserId: Id<'users'>;
      targetUserPoints: number;
      racesFinished: number;
      sessionsPerRace: number;
      fakeUsersCreated: number;
    } = await ctx.runMutation(internal.seed._seedLeaderboardData, {
      username,
    });

    // Phase 6: Seed H2H leaderboard data
    const h2hResult: {
      h2hResultsCreated: number;
      h2hScoresCreated: number;
      h2hPredictionsCreated: number;
      h2hStandingsCreated: number;
    } = await ctx.runMutation(internal.seed._seedH2HLeaderboardData, {
      username,
    });

    // Phase 7: Seed current race weekend (halfway through)
    const weekendResult: {
      raceId: Id<'races'>;
      raceName: string;
      qualiResultCreated: boolean;
      h2hResultsCreated: number;
    } = await ctx.runMutation(internal.seed._seedCurrentWeekendData, {
      username,
    });

    // Phase 8: Seed leagues
    const leagueResult: {
      leaguesCreated: number;
      league1: { id: Id<'leagues'>; name: string; members: number };
      league2: { id: Id<'leagues'>; name: string; members: number };
      league3: { id: Id<'leagues'>; name: string; members: number };
    } = await ctx.runMutation(internal.seed._seedLeagueLeaderboardData, {
      username,
    });

    return {
      cleared: totalDeleted,
      racesReset: raceResult.reset,
      username,
      rank: 6,
      currentRace: weekendResult.raceName,
      leagues: leagueResult.leaguesCreated,
      ...seedResult,
      ...h2hResult,
    };
  },
});

// ─────────────────────── Social Feed Scenario ───────────────────────

const FEED_SCENARIO_FAKE_USERS = [
  { username: 'OvercutKing', displayName: 'Overcut King' },
  { username: 'PitStopPro', displayName: 'Pit Stop Pro' },
  { username: 'BrakePoint99', displayName: 'Brake Point' },
  { username: 'DriftKingF1', displayName: 'Drift King' },
  { username: 'TopGunner', displayName: 'Top Gunner' },
  { username: 'TurboTed', displayName: 'Turbo Ted' },
  { username: 'PoleHunter', displayName: 'Pole Hunter' },
  { username: 'SlipstreamSam', displayName: 'Slipstream Sam' },
  { username: 'FlatOutFred', displayName: 'Flat Out Fred' },
  { username: 'CornerWorker', displayName: 'Corner Worker' },
  { username: 'GapAnalyst', displayName: 'Gap Analyst' },
  { username: 'PodiumPete', displayName: 'Podium Pete' },
];

/**
 * Internal: Clear all follows.
 */
export const _clearFollows = internalMutation({
  args: {},
  handler: async (ctx) => {
    const follows = await ctx.db.query('follows').collect();
    for (const doc of follows) {
      await ctx.db.delete(doc._id);
    }
    return { deleted: follows.length };
  },
});

/**
 * Internal: Build the social feed testing scenario.
 *
 * Creates:
 *  - 12 fake users
 *  - Follows: main user follows users 0–5, users 0–3 follow back, cross-follows among fakes
 *  - League 1 "Pit Wall Prophets": main user (admin) + fake users 0–4
 *  - League 2 "DRS Zone": fake users 5–8 + main user as member
 *  - Australia (round 1): finished 13 days ago — quali + race results/predictions/scores for all
 *  - China (round 2, sprint): finished 6 days ago — all 4 sessions for all
 *  - Japan (round 3): mid-weekend — quali published + scored, race locked (in progress)
 */
export const _seedFeedScenario = internalMutation({
  args: {
    username: v.optional(v.string()),
    clerkUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const HOUR = 60 * 60 * 1000;
    const DAY = 24 * HOUR;

    // ── Find main user ──
    const mainUser = args.clerkUserId
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
        : await ctx.db.query('users').first();

    if (!mainUser) {
      throw new Error(
        'Main user not found. Sign in first or provide clerkUserId/username.',
      );
    }

    const drivers = await ctx.db.query('drivers').collect();
    if (drivers.length < 5) {
      throw new Error('Need at least 5 drivers. Run seedDrivers first.');
    }
    const driverIds = drivers.map((d) => d._id);

    // ── Get the three races we'll use ──
    const australiaRace = await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', 'australia-2026'))
      .unique();
    const chinaRace = await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', 'china-2026'))
      .unique();
    const japanRace = await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', 'japan-2026'))
      .unique();

    if (!australiaRace || !chinaRace || !japanRace) {
      throw new Error(
        'australia-2026, china-2026, and japan-2026 races required. Run seedRaces first.',
      );
    }

    // ── Deterministic shuffle ──
    function det<T>(arr: Array<T>, seed: number): Array<T> {
      const r = [...arr];
      for (let i = r.length - 1; i > 0; i--) {
        const j = Math.abs((seed * 31 + i * 17) % (i + 1));
        [r[i], r[j]] = [r[j], r[i]];
      }
      return r;
    }

    // ── Create fake users ──
    const fakeUserIds: Array<Id<'users'>> = [];
    for (let i = 0; i < FEED_SCENARIO_FAKE_USERS.length; i++) {
      const { username, displayName } = FEED_SCENARIO_FAKE_USERS[i];
      const id = await ctx.db.insert('users', {
        clerkUserId: `fake_user_feed_${i}`,
        username,
        displayName,
        email: `${username.toLowerCase()}@example.com`,
        isAdmin: false,
        createdAt: now - (FEED_SCENARIO_FAKE_USERS.length - i) * HOUR,
        updatedAt: now,
      });
      fakeUserIds.push(id);
    }

    // ── Follows ──
    // Main user follows fake users 0–5
    for (let i = 0; i <= 5; i++) {
      await ctx.db.insert('follows', {
        followerId: mainUser._id,
        followeeId: fakeUserIds[i],
        createdAt: now - (10 - i) * DAY,
      });
    }
    // Fake users 0–3 follow main user back
    for (let i = 0; i <= 3; i++) {
      await ctx.db.insert('follows', {
        followerId: fakeUserIds[i],
        followeeId: mainUser._id,
        createdAt: now - (8 - i) * DAY,
      });
    }
    // Cross-follows among fakes for richer social graph
    const crossFollows: Array<[number, number]> = [
      [1, 0],
      [2, 1],
      [4, 3],
      [6, 7],
      [8, 9],
      [10, 11],
      [0, 5],
      [5, 6],
    ];
    for (const [from, to] of crossFollows) {
      await ctx.db.insert('follows', {
        followerId: fakeUserIds[from],
        followeeId: fakeUserIds[to],
        createdAt: now - Math.floor(Math.random() * 10 + 2) * DAY,
      });
    }

    // ── Leagues ──
    const league1Id = await ctx.db.insert('leagues', {
      name: 'Pit Wall Prophets',
      slug: 'pit-wall-prophets-2026',
      description: 'The serious predictors. Probably.',
      visibility: 'private',
      password: 'pitwall',
      createdBy: mainUser._id,
      season: 2026,
      createdAt: now - 20 * DAY,
      updatedAt: now,
    });
    await ctx.db.insert('leagueMembers', {
      leagueId: league1Id,
      userId: mainUser._id,
      role: 'admin',
      joinedAt: now - 20 * DAY,
    });
    for (let i = 0; i <= 4; i++) {
      await ctx.db.insert('leagueMembers', {
        leagueId: league1Id,
        userId: fakeUserIds[i],
        role: 'member',
        joinedAt: now - (16 - i) * DAY,
      });
    }

    const league2Id = await ctx.db.insert('leagues', {
      name: 'DRS Zone',
      slug: 'drs-zone-2026',
      description: 'Living life in the drag reduction zone.',
      visibility: 'private',
      password: 'drszone',
      createdBy: fakeUserIds[5],
      season: 2026,
      createdAt: now - 18 * DAY,
      updatedAt: now,
    });
    await ctx.db.insert('leagueMembers', {
      leagueId: league2Id,
      userId: fakeUserIds[5],
      role: 'admin',
      joinedAt: now - 18 * DAY,
    });
    for (let i = 6; i <= 8; i++) {
      await ctx.db.insert('leagueMembers', {
        leagueId: league2Id,
        userId: fakeUserIds[i],
        role: 'member',
        joinedAt: now - (14 - (i - 6)) * DAY,
      });
    }
    // Main user also joins league 2
    await ctx.db.insert('leagueMembers', {
      leagueId: league2Id,
      userId: mainUser._id,
      role: 'member',
      joinedAt: now - 10 * DAY,
    });

    // ── Race timing ──
    const australiaQualiAt = now - 14 * DAY;
    const australiaRaceAt = now - 13 * DAY;
    await ctx.db.patch(australiaRace._id, {
      status: 'finished',
      qualiStartAt: australiaQualiAt,
      qualiLockAt: australiaQualiAt,
      raceStartAt: australiaRaceAt,
      predictionLockAt: australiaRaceAt,
      updatedAt: now,
    });

    const chinaSprintQualiAt = now - 8 * DAY - 12 * HOUR;
    const chinaSprintAt = now - 8 * DAY;
    const chinaQualiAt = now - 7 * DAY - 12 * HOUR;
    const chinaRaceAt = now - 7 * DAY;
    await ctx.db.patch(chinaRace._id, {
      status: 'finished',
      sprintQualiStartAt: chinaSprintQualiAt,
      sprintQualiLockAt: chinaSprintQualiAt,
      sprintStartAt: chinaSprintAt,
      sprintLockAt: chinaSprintAt,
      qualiStartAt: chinaQualiAt,
      qualiLockAt: chinaQualiAt,
      raceStartAt: chinaRaceAt,
      predictionLockAt: chinaRaceAt,
      updatedAt: now,
    });

    // Japan: quali published 18h ago, race locked 30min ago (in progress, no result yet)
    const japanQualiAt = now - 18 * HOUR;
    const japanRaceAt = now - 30 * 60 * 1000;
    await ctx.db.patch(japanRace._id, {
      status: 'locked',
      qualiStartAt: japanQualiAt,
      qualiLockAt: japanQualiAt,
      raceStartAt: japanRaceAt,
      predictionLockAt: japanRaceAt,
      updatedAt: now,
    });

    // ── Helpers ──
    const SESSION_ORDER: Array<SessionType> = [
      'sprint_quali',
      'sprint',
      'quali',
      'race',
    ];

    function makePicks(
      top5: Array<Id<'drivers'>>,
      others: Array<Id<'drivers'>>,
      pattern: number,
    ): Array<Id<'drivers'>> {
      switch (pattern % 5) {
        case 0:
          return [top5[0], top5[1], top5[4], top5[2], top5[4]]; // ~18 pts
        case 1:
          return [top5[0], top5[2], top5[1], top5[4], others[0] ?? top5[4]]; // ~14 pts
        case 2:
          return [
            top5[0],
            others[0] ?? top5[1],
            top5[4],
            others[1] ?? top5[3],
            others[2] ?? top5[4],
          ]; // ~9 pts
        case 3:
          return [
            top5[1],
            top5[0],
            top5[4],
            others[0] ?? top5[3],
            others[1] ?? top5[4],
          ]; // ~11 pts
        default:
          return [
            top5[1],
            others[0] ?? top5[1],
            others[1] ?? top5[2],
            top5[4],
            others[2] ?? top5[4],
          ]; // ~7 pts
      }
    }

    const allUserIds = [mainUser._id, ...fakeUserIds];
    let resultsCreated = 0;
    let predictionsCreated = 0;
    let scoresCreated = 0;

    // ── Finished races: Australia + China ──
    type FinishedRaceConfig = {
      race: { _id: Id<'races'>; round: number };
      sessions: Array<SessionType>;
      sessionTimes: Partial<Record<SessionType, number>>;
    };

    const finishedConfigs: Array<FinishedRaceConfig> = [
      {
        race: australiaRace,
        sessions: ['quali', 'race'],
        sessionTimes: {
          quali: australiaQualiAt,
          race: australiaRaceAt,
        },
      },
      {
        race: chinaRace,
        sessions: ['sprint_quali', 'sprint', 'quali', 'race'],
        sessionTimes: {
          sprint_quali: chinaSprintQualiAt,
          sprint: chinaSprintAt,
          quali: chinaQualiAt,
          race: chinaRaceAt,
        },
      },
    ];

    for (const config of finishedConfigs) {
      for (const sessionType of config.sessions) {
        const sessionAt = config.sessionTimes[sessionType] ?? now;
        const sessionIdx = SESSION_ORDER.indexOf(sessionType);
        const classification = det(
          driverIds,
          config.race.round * 100 + sessionIdx,
        );
        const top5 = classification.slice(0, 5);
        const others = classification.slice(5);

        await ctx.db.insert('results', {
          raceId: config.race._id,
          sessionType,
          classification,
          publishedAt: sessionAt + HOUR,
          updatedAt: now,
        });
        resultsCreated++;

        for (let userIdx = 0; userIdx < allUserIds.length; userIdx++) {
          const userId = allUserIds[userIdx];
          const pattern = userIdx * 7 + sessionIdx * 3 + config.race.round;
          const picks = makePicks(top5, others, pattern).map(
            (p, i) => p || top5[i % 5],
          );

          await ctx.db.insert('predictions', {
            userId,
            raceId: config.race._id,
            sessionType,
            picks,
            submittedAt: sessionAt - HOUR,
            updatedAt: sessionAt - HOUR,
          });
          predictionsCreated++;

          const { total, breakdown } = scoreTopFive({ picks, classification });
          await ctx.db.insert('scores', {
            userId,
            raceId: config.race._id,
            sessionType,
            points: total,
            breakdown,
            createdAt: sessionAt + 2 * HOUR,
            updatedAt: now,
          });
          scoresCreated++;
        }
      }
    }

    // ── H2H seeding for finished races (Australia + China) ──
    const matchups = await ctx.db
      .query('h2hMatchups')
      .withIndex('by_season', (q) => q.eq('season', 2026))
      .collect();

    if (matchups.length > 0) {
      for (const config of finishedConfigs) {
        for (const sessionType of config.sessions) {
          const sessionAt = config.sessionTimes[sessionType] ?? now;
          const sessionIdx = SESSION_ORDER.indexOf(sessionType);

          // Look up the classification we just inserted
          const result = await ctx.db
            .query('results')
            .withIndex('by_race_session', (q) =>
              q.eq('raceId', config.race._id).eq('sessionType', sessionType),
            )
            .unique();
          if (!result) {
            continue;
          }

          const positionMap = new Map<string, number>();
          result.classification.forEach((dId, i) => {
            positionMap.set(String(dId), i + 1);
          });

          // H2H results
          for (const matchup of matchups) {
            const p1 = positionMap.get(String(matchup.driver1Id)) ?? 99;
            const p2 = positionMap.get(String(matchup.driver2Id)) ?? 99;
            const winnerId = p1 < p2 ? matchup.driver1Id : matchup.driver2Id;
            await ctx.db.insert('h2hResults', {
              raceId: config.race._id,
              sessionType,
              matchupId: matchup._id,
              winnerId,
              publishedAt: sessionAt + HOUR,
            });
          }

          // H2H predictions + scores per user
          for (let userIdx = 0; userIdx < allUserIds.length; userIdx++) {
            const userId = allUserIds[userIdx];
            let correct = 0;
            for (let mi = 0; mi < matchups.length; mi++) {
              const matchup = matchups[mi];
              const p1 = positionMap.get(String(matchup.driver1Id)) ?? 99;
              const p2 = positionMap.get(String(matchup.driver2Id)) ?? 99;
              const actualWinner =
                p1 < p2 ? matchup.driver1Id : matchup.driver2Id;
              // Deterministic ~60% correct
              const seed =
                userIdx * 31 + mi * 17 + sessionIdx * 7 + config.race.round;
              const isCorrect = seed % 5 < 3;
              const predictedWinner = isCorrect
                ? actualWinner
                : p1 < p2
                  ? matchup.driver2Id
                  : matchup.driver1Id;
              await ctx.db.insert('h2hPredictions', {
                userId,
                raceId: config.race._id,
                sessionType,
                matchupId: matchup._id,
                predictedWinnerId: predictedWinner,
                submittedAt: sessionAt - HOUR,
                updatedAt: sessionAt - HOUR,
              });
              if (isCorrect) {
                correct++;
              }
            }
            await ctx.db.insert('h2hScores', {
              userId,
              raceId: config.race._id,
              sessionType,
              points: correct,
              correctPicks: correct,
              totalPicks: matchups.length,
              createdAt: sessionAt + 2 * HOUR,
              updatedAt: now,
            });
          }
        }
      }
    }

    // ── Japan: quali published + scored, race predictions only ──
    const japanQualiClass = det(driverIds, japanRace.round * 100);
    const japanTop5 = japanQualiClass.slice(0, 5);
    const japanOthers = japanQualiClass.slice(5);

    await ctx.db.insert('results', {
      raceId: japanRace._id,
      sessionType: 'quali',
      classification: japanQualiClass,
      publishedAt: japanQualiAt + HOUR,
      updatedAt: now,
    });
    resultsCreated++;

    for (let userIdx = 0; userIdx < allUserIds.length; userIdx++) {
      const userId = allUserIds[userIdx];

      // Quali prediction + score
      const qualiPattern =
        userIdx * 7 + SESSION_ORDER.indexOf('quali') * 3 + japanRace.round;
      const qualiPicks = makePicks(japanTop5, japanOthers, qualiPattern).map(
        (p, i) => p || japanTop5[i % 5],
      );
      await ctx.db.insert('predictions', {
        userId,
        raceId: japanRace._id,
        sessionType: 'quali',
        picks: qualiPicks,
        submittedAt: japanQualiAt - HOUR,
        updatedAt: japanQualiAt - HOUR,
      });
      predictionsCreated++;

      const { total, breakdown } = scoreTopFive({
        picks: qualiPicks,
        classification: japanQualiClass,
      });
      await ctx.db.insert('scores', {
        userId,
        raceId: japanRace._id,
        sessionType: 'quali',
        points: total,
        breakdown,
        createdAt: japanQualiAt + 2 * HOUR,
        updatedAt: now,
      });
      scoresCreated++;

      // Race prediction only — race is in progress, no result yet
      const racePicks = det(
        driverIds,
        userIdx * 13 + japanRace.round * 7,
      ).slice(0, 5);
      await ctx.db.insert('predictions', {
        userId,
        raceId: japanRace._id,
        sessionType: 'race',
        picks: racePicks,
        submittedAt: japanRaceAt - 2 * HOUR,
        updatedAt: japanRaceAt - 2 * HOUR,
      });
      predictionsCreated++;
    }

    // ── Japan H2H ──
    if (matchups.length > 0) {
      // Quali: results are published → create h2hResults + predictions + scores
      const japanQualiResult = await ctx.db
        .query('results')
        .withIndex('by_race_session', (q) =>
          q.eq('raceId', japanRace._id).eq('sessionType', 'quali'),
        )
        .unique();

      if (japanQualiResult) {
        const posMap = new Map<string, number>();
        japanQualiResult.classification.forEach((dId, i) => {
          posMap.set(String(dId), i + 1);
        });

        for (const matchup of matchups) {
          const p1 = posMap.get(String(matchup.driver1Id)) ?? 99;
          const p2 = posMap.get(String(matchup.driver2Id)) ?? 99;
          await ctx.db.insert('h2hResults', {
            raceId: japanRace._id,
            sessionType: 'quali',
            matchupId: matchup._id,
            winnerId: p1 < p2 ? matchup.driver1Id : matchup.driver2Id,
            publishedAt: japanQualiAt + HOUR,
          });
        }

        for (let userIdx = 0; userIdx < allUserIds.length; userIdx++) {
          const userId = allUserIds[userIdx];
          let correct = 0;
          for (let mi = 0; mi < matchups.length; mi++) {
            const matchup = matchups[mi];
            const p1 = posMap.get(String(matchup.driver1Id)) ?? 99;
            const p2 = posMap.get(String(matchup.driver2Id)) ?? 99;
            const actualWinner =
              p1 < p2 ? matchup.driver1Id : matchup.driver2Id;
            const seed = userIdx * 31 + mi * 17 + japanRace.round * 7;
            const isCorrect = seed % 5 < 3;
            const predictedWinner = isCorrect
              ? actualWinner
              : p1 < p2
                ? matchup.driver2Id
                : matchup.driver1Id;
            await ctx.db.insert('h2hPredictions', {
              userId,
              raceId: japanRace._id,
              sessionType: 'quali',
              matchupId: matchup._id,
              predictedWinnerId: predictedWinner,
              submittedAt: japanQualiAt - HOUR,
              updatedAt: japanQualiAt - HOUR,
            });
            if (isCorrect) {
              correct++;
            }
          }
          await ctx.db.insert('h2hScores', {
            userId,
            raceId: japanRace._id,
            sessionType: 'quali',
            points: correct,
            correctPicks: correct,
            totalPicks: matchups.length,
            createdAt: japanQualiAt + 2 * HOUR,
            updatedAt: now,
          });
        }
      }

      // Race: in-progress → only create h2hPredictions (no results or scores)
      for (let userIdx = 0; userIdx < allUserIds.length; userIdx++) {
        const userId = allUserIds[userIdx];
        for (let mi = 0; mi < matchups.length; mi++) {
          const matchup = matchups[mi];
          const seed = userIdx * 37 + mi * 11 + japanRace.round * 5;
          const predictedWinner =
            seed % 2 === 0 ? matchup.driver1Id : matchup.driver2Id;
          await ctx.db.insert('h2hPredictions', {
            userId,
            raceId: japanRace._id,
            sessionType: 'race',
            matchupId: matchup._id,
            predictedWinnerId: predictedWinner,
            submittedAt: japanRaceAt - 2 * HOUR,
            updatedAt: japanRaceAt - 2 * HOUR,
          });
        }
      }
    }

    return {
      mainUserId: mainUser._id,
      username: mainUser.username,
      fakeUsersCreated: fakeUserIds.length,
      leagues: { 'Pit Wall Prophets': league1Id, 'DRS Zone': league2Id },
      resultsCreated,
      predictionsCreated,
      scoresCreated,
      currentWeekend: {
        race: 'japan-2026',
        qualiPublished: true,
        raceInProgress: true,
      },
    };
  },
});

/**
 * Reset dev database to a rich social feed testing scenario.
 *
 * Sets up:
 *  - 12 fake users with F1 usernames
 *  - Follow graph: main user follows 6 fakes, 4 follow back, cross-follows among fakes
 *  - 2 leagues the main user belongs to
 *  - Australia (R1): finished 13 days ago — full results + predictions + scores for all
 *  - China (R2, sprint): finished 7 days ago — all 4 session results for all users
 *  - Japan (R3): mid-weekend — quali published + scored, race locked (in progress)
 *  - Feed events backfilled from scores + league joins
 *
 * Run via:
 *   npx convex run seed:reseedDevForFeed '{"username": "barrymichaeldoyle"}'
 *   npx convex run seed:reseedDevForFeed '{"clerkUserId": "user_xxx"}'
 */
export const reseedDevForFeed = internalAction({
  args: {
    username: v.optional(v.string()),
    clerkUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Phase 1: Clear all dev data
    let totalDeleted = 0;
    let iterations = 0;
    while (true) {
      const result: { deleted: number; done: boolean } = await ctx.runMutation(
        internal.seed._clearDevDataBatch,
      );
      totalDeleted += result.deleted;
      iterations++;
      if (result.done) {
        break;
      }
      if (iterations > 200) {
        throw new Error('Too many iterations clearing dev data');
      }
    }

    // Phase 2: Clear leagues and follows
    await ctx.runMutation(internal.seed._clearLeagueData);
    await ctx.runMutation(internal.seed._clearFollows);

    // Phase 3: Reset races to upcoming with original 2026 dates
    const raceResult: { reset: number } = await ctx.runMutation(
      internal.seed._resetRacesToUpcoming,
    );

    // Phase 4: Ensure drivers + H2H matchups exist
    await ctx.runMutation(internal.seed.seedDrivers);
    await ctx.runMutation(internal.seed.seedH2HMatchups);

    // Phase 5: Build the feed scenario
    const scenarioResult: {
      mainUserId: Id<'users'>;
      username: string | undefined;
      fakeUsersCreated: number;
      resultsCreated: number;
      predictionsCreated: number;
      scoresCreated: number;
    } = await ctx.runMutation(internal.seed._seedFeedScenario, {
      username: args.username,
      clerkUserId: args.clerkUserId,
    });

    // Phase 6: Backfill feed events from scores + league joins
    const feedResult: { created: number } = await ctx.runMutation(
      internal.seed.seedFeedEvents,
    );

    // Phase 7: Backfill season standings
    await ctx.runMutation(internal.seed.backfillStandings, {});

    return {
      cleared: totalDeleted,
      racesReset: raceResult.reset,
      ...scenarioResult,
      feedEventsCreated: feedResult.created,
    };
  },
});

/**
 * Seed one rev notification for a target user using an existing feed event.
 *
 * Run via:
 *   npx convex run seed:seedRevNotificationForUser '{"username": "barrymichaeldoyle"}'
 *   npx convex run seed:seedRevNotificationForUser '{"clerkUserId": "user_xxx"}'
 */
export const seedRevNotificationForUser = internalMutation({
  args: {
    username: v.optional(v.string()),
    clerkUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const targetUser = args.clerkUserId
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
        : await ctx.db.query('users').first();

    if (!targetUser) {
      throw new Error(
        'Target user not found. Sign in first or provide clerkUserId/username.',
      );
    }

    const feedEvent = await ctx.db
      .query('feedEvents')
      .withIndex('by_user_created', (q) => q.eq('userId', targetUser._id))
      .order('desc')
      .first();

    if (!feedEvent) {
      throw new Error(
        'No feed event found for target user. Run seed:reseedDevForFeed first.',
      );
    }

    const candidateUsers = await ctx.db.query('users').take(50);
    const actor =
      candidateUsers.find((user) => user._id !== targetUser._id) ?? null;

    if (!actor) {
      throw new Error('No actor user available to create a rev notification.');
    }

    const existingRev = await ctx.db
      .query('revs')
      .withIndex('by_user_event', (q) =>
        q.eq('userId', actor._id).eq('feedEventId', feedEvent._id),
      )
      .first();

    if (!existingRev) {
      await ctx.db.insert('revs', {
        feedEventId: feedEvent._id,
        userId: actor._id,
        createdAt: Date.now(),
      });

      await ctx.db.patch(feedEvent._id, {
        revCount: feedEvent.revCount + 1,
      });
    }

    await ctx.runMutation(internal.inAppNotifications.createRevNotification, {
      recipientUserId: targetUser._id,
      actorUserId: actor._id,
      feedEventId: feedEvent._id,
      raceId: feedEvent.raceId,
      sessionType: feedEvent.sessionType,
      raceName: feedEvent.raceName,
      raceSlug: feedEvent.raceSlug,
    });

    return {
      recipientUsername: targetUser.username,
      actorUsername: actor.username,
      feedEventId: feedEvent._id,
      raceSlug: feedEvent.raceSlug,
    };
  },
});

/**
 * Seed a showcase set of in-app notifications for a target user.
 *
 * This clears the user's current in-app notifications and replaces them with
 * a small set of rev/results/locked rows for layout testing.
 *
 * Run via:
 *   npx convex run seed:seedNotificationShowcaseForUser '{"username": "barrymichaeldoyle"}'
 */
export const seedNotificationShowcaseForUser = internalMutation({
  args: {
    username: v.optional(v.string()),
    clerkUserId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const targetUser = args.clerkUserId
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
        : await ctx.db.query('users').first();

    if (!targetUser) {
      throw new Error(
        'Target user not found. Sign in first or provide clerkUserId/username.',
      );
    }

    const existingNotifications = await ctx.db
      .query('inAppNotifications')
      .withIndex('by_user_created', (q) => q.eq('userId', targetUser._id))
      .take(100);

    for (const notification of existingNotifications) {
      await ctx.db.delete(notification._id);
    }

    const feedEvents = await ctx.db
      .query('feedEvents')
      .withIndex('by_user_created', (q) => q.eq('userId', targetUser._id))
      .order('desc')
      .take(50);

    const feedEventBySession = new Map<
      SessionType,
      (typeof feedEvents)[number]
    >();
    for (const event of feedEvents) {
      if (
        event.sessionType &&
        !feedEventBySession.has(event.sessionType) &&
        event.raceName &&
        event.raceSlug
      ) {
        feedEventBySession.set(event.sessionType, event);
      }
    }

    const races = await ctx.db.query('races').take(30);
    const preferredShowcaseRaces = [
      'las-vegas-2026',
      'saudi-arabia-2026',
      'emilia-romagna-2026',
      'abu-dhabi-2026',
    ];
    const showcaseRaces = preferredShowcaseRaces
      .map((slug) => races.find((race) => race.slug === slug))
      .filter((race): race is NonNullable<typeof race> => race !== undefined);

    const actorProfiles = [
      { actorDisplayName: 'Barry Business', actorUsername: 'barrybiz' },
      { actorDisplayName: 'Caitlyn Davies', actorUsername: 'caitdavies' },
      { actorDisplayName: 'Alexandra van der Merwe', actorUsername: 'alexvdm' },
      { actorDisplayName: 'M. J. Thompson-Singh', actorUsername: 'mjts' },
      { actorDisplayName: 'Sam Okonkwo', actorUsername: 'samokon' },
    ] as const;

    // Each entry defines how many actors revved that session's feed event.
    // This lets us showcase single, double, triple and "N others" grouping.
    const revShowcase: Array<{ sessionType: SessionType; actorCount: number }> =
      [
        { sessionType: 'race', actorCount: 5 }, // "Barry, Caitlyn and 3 others"
        { sessionType: 'quali', actorCount: 3 }, // "Barry, Caitlyn and Alexandra"
        { sessionType: 'sprint', actorCount: 2 }, // "Barry and Caitlyn"
        { sessionType: 'sprint_quali', actorCount: 1 }, // "Barry Business"
      ];

    let created = 0;
    const now = Date.now();

    for (const [
      groupIndex,
      { sessionType, actorCount },
    ] of revShowcase.entries()) {
      const event = feedEventBySession.get(sessionType);
      if (!event) {
        continue;
      }

      for (let i = 0; i < actorCount; i++) {
        const actor = actorProfiles[i % actorProfiles.length];
        await ctx.db.insert('inAppNotifications', {
          userId: targetUser._id,
          type: 'rev_received',
          actorDisplayName: actor.actorDisplayName,
          actorUsername: actor.actorUsername,
          feedEventId: event._id,
          raceId: event.raceId,
          sessionType,
          raceName: event.raceName,
          raceSlug: event.raceSlug,
          // Actors within the same group have slightly staggered times
          createdAt: now - groupIndex * 10 * 60_000 - i * 60_000,
        });
        created++;
      }
    }

    const resultsShowcase = [
      {
        race: showcaseRaces[0] ?? null,
        sessionType: 'race' as const,
        points: 49,
        ageMs: 35 * 60_000,
      },
      {
        race: showcaseRaces[1] ?? showcaseRaces[0] ?? null,
        sessionType: 'sprint_quali' as const,
        points: 17,
        ageMs: 90 * 60_000,
      },
    ];

    for (const entry of resultsShowcase) {
      if (!entry.race) {
        continue;
      }
      await ctx.db.insert('inAppNotifications', {
        userId: targetUser._id,
        type: 'results_published',
        raceId: entry.race._id,
        sessionType: entry.sessionType,
        raceName: entry.race.name,
        raceSlug: entry.race.slug,
        points: entry.points,
        createdAt: now - entry.ageMs,
      });
      created++;
    }

    const lockShowcase = [
      {
        race: showcaseRaces[2] ?? showcaseRaces[0] ?? null,
        sessionType: 'quali' as const,
        ageMs: 6 * 60 * 60_000,
      },
      {
        race: showcaseRaces[3] ?? showcaseRaces[1] ?? showcaseRaces[0] ?? null,
        sessionType: 'race' as const,
        ageMs: 26 * 60 * 60_000,
      },
    ];

    for (const entry of lockShowcase) {
      if (!entry.race) {
        continue;
      }
      await ctx.db.insert('inAppNotifications', {
        userId: targetUser._id,
        type: 'session_locked',
        raceId: entry.race._id,
        sessionType: entry.sessionType,
        raceName: entry.race.name,
        raceSlug: entry.race.slug,
        createdAt: now - entry.ageMs,
      });
      created++;
    }

    return {
      username: targetUser.username,
      created,
      revSessionsSeeded: [...feedEventBySession.keys()],
      showcaseRaceSlugs: showcaseRaces.map((race) => race.slug),
    };
  },
});

/**
 * Backfill feed events from existing scores and league memberships.
 * Run this after seeding to populate the feed without going through the admin publish flow.
 *
 * npx convex run seed:seedFeedEvents
 */
export const seedFeedEvents = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const HOUR = 60 * 60 * 1000;
    let created = 0;

    // score_published — one per existing score row
    const scores = await ctx.db.query('scores').take(500);
    for (const score of scores) {
      const existing = await ctx.db
        .query('feedEvents')
        .withIndex('by_user_race_session', (q) =>
          q
            .eq('userId', score.userId)
            .eq('raceId', score.raceId)
            .eq('sessionType', score.sessionType),
        )
        .first();
      if (existing) {
        continue;
      }
      const user = await ctx.db.get(score.userId);
      const race = await ctx.db.get(score.raceId);
      if (!user || !race) {
        continue;
      }
      // Spread events ~2h apart so the feed looks like a real timeline
      const offset = created * 2 * HOUR;
      await ctx.db.insert('feedEvents', {
        type: 'score_published',
        userId: score.userId,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        raceId: score.raceId,
        sessionType: score.sessionType,
        points: score.points,
        raceName: race.name,
        raceSlug: race.slug,
        season: race.season,
        revCount: 0,
        createdAt: now - offset,
      });
      created++;
    }

    // joined_league — one per leagueMember row
    const memberships = await ctx.db.query('leagueMembers').take(200);
    for (const membership of memberships) {
      const user = await ctx.db.get(membership.userId);
      const league = await ctx.db.get(membership.leagueId);
      if (!user || !league) {
        continue;
      }
      await ctx.db.insert('feedEvents', {
        type: 'joined_league',
        userId: membership.userId,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        leagueId: membership.leagueId,
        leagueName: league.name,
        leagueSlug: league.slug,
        revCount: 0,
        createdAt: membership.joinedAt,
      });
      created++;
    }

    return { created };
  },
});

/**
 * Seed revs on existing feed events so the Rev button has real data to show.
 * Randomly assigns 1–4 revs per event using other users in the system.
 *
 * npx convex run seed:seedRevs
 */
export const seedRevs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db.query('feedEvents').take(200);
    const users = await ctx.db.query('users').take(100);
    if (users.length < 2) {
      return { created: 0 };
    }

    let created = 0;

    for (const event of events) {
      // Pick a random subset of users (1–4) to rev this event, excluding the event owner
      const others = users.filter((u) => u._id !== event.userId);
      const shuffled = others.sort(() => Math.random() - 0.5);
      const revCount = Math.floor(Math.random() * 4) + 1;
      const revers = shuffled.slice(0, Math.min(revCount, shuffled.length));

      for (const user of revers) {
        // Skip if already reved
        const existing = await ctx.db
          .query('revs')
          .withIndex('by_user_event', (q) =>
            q.eq('userId', user._id).eq('feedEventId', event._id),
          )
          .first();
        if (existing) {
          continue;
        }
        await ctx.db.insert('revs', {
          feedEventId: event._id,
          userId: user._id,
          createdAt: Date.now(),
        });
        created++;
      }

      // Update revCount on the event to match
      const totalRevs = await ctx.db
        .query('revs')
        .withIndex('by_event', (q) => q.eq('feedEventId', event._id))
        .collect();
      await ctx.db.patch(event._id, { revCount: totalRevs.length });
    }

    return { created };
  },
});

/**
 * Seed a sprint weekend in a partially-complete state so the home page hero
 * can be previewed with all four session statuses visible at once:
 *   Sprint Qualifying → Finished (results published)
 *   Sprint            → In Progress (started ~45 min ago, no results)
 *   Qualifying        → Upcoming (~3 h away)
 *   Race              → Upcoming (~27 h away)
 *
 * The race's raceStartAt is ~27 h in the future so the 12-hour window does
 * NOT trigger — the home page shows this as the "next race" with a countdown
 * to Qualifying.
 *
 * Run via:
 *   npx convex run seed:seedHomePageScenario
 *
 * To reset back to normal, run seedRaces again or resetToPreSeason.
 */
export const seedHomePageScenario = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const HOUR = 60 * 60 * 1000;

    // Find a sprint weekend to use
    // query-hygiene-ignore db-filter: dev-only seed helper selecting any sprint weekend
    const sprintRace = await ctx.db
      .query('races')
      .withIndex('by_season_round')
      .filter((q) => q.eq(q.field('hasSprint'), true))
      .first();

    if (!sprintRace) {
      throw new Error(
        'No sprint weekend found. Run seedRaces first: npx convex run seed:seedRaces',
      );
    }

    const drivers = await ctx.db.query('drivers').take(20);
    if (drivers.length < 5) {
      throw new Error(
        'Need at least 5 drivers. Run seedDrivers first: npx convex run seed:seedDrivers',
      );
    }

    // Shuffle for a plausible classification
    const shuffled = [...drivers];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const classification = shuffled.map((d) => d._id);

    // Session timings
    const sprintQualiStartAt = now - 4 * HOUR; // finished 4h ago
    const sprintStartAt = now - 45 * 60 * 1000; // started 45min ago — in progress
    const qualiStartAt = now + 3 * HOUR; // upcoming in 3h
    const raceStartAt = now + 27 * HOUR; // upcoming tomorrow

    await ctx.db.patch(sprintRace._id, {
      status: 'upcoming',
      hasSprint: true,
      sprintQualiStartAt,
      sprintQualiLockAt: sprintQualiStartAt,
      sprintStartAt,
      sprintLockAt: sprintStartAt,
      qualiStartAt,
      qualiLockAt: qualiStartAt,
      raceStartAt,
      predictionLockAt: raceStartAt,
      updatedAt: now,
    });

    // Publish Sprint Qualifying results
    const existingSQ = await ctx.db
      .query('results')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', sprintRace._id).eq('sessionType', 'sprint_quali'),
      )
      .unique();

    if (existingSQ) {
      await ctx.db.patch(existingSQ._id, {
        classification,
        scoringStatus: 'complete',
        updatedAt: now,
      });
    } else {
      await ctx.db.insert('results', {
        raceId: sprintRace._id,
        sessionType: 'sprint_quali',
        classification,
        scoringStatus: 'complete',
        publishedAt: now - 3 * HOUR,
        updatedAt: now,
      });
    }

    // Remove any stale results for Sprint / Quali / Race
    for (const sessionType of ['sprint', 'quali', 'race'] as const) {
      const existing = await ctx.db
        .query('results')
        .withIndex('by_race_session', (q) =>
          q.eq('raceId', sprintRace._id).eq('sessionType', sessionType),
        )
        .unique();
      if (existing) {
        await ctx.db.delete(existing._id);
      }
    }

    return {
      race: sprintRace.name,
      slug: sprintRace.slug,
      sessions: {
        sprint_quali: `Finished — started ${new Date(sprintQualiStartAt).toISOString()}`,
        sprint: `In progress — started ${new Date(sprintStartAt).toISOString()}`,
        quali: `Upcoming — ${new Date(qualiStartAt).toISOString()}`,
        race: `Upcoming — ${new Date(raceStartAt).toISOString()}`,
      },
    };
  },
});
