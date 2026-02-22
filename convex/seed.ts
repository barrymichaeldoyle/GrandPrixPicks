import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Id } from './_generated/dataModel';
import { internalAction, internalMutation } from './_generated/server';
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
    number: 4,
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
    number: 1,
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
  },
  {
    round: 5,
    name: 'Saudi Arabian Grand Prix',
    slug: 'saudi-arabia-2026',
    qualiDate: '2026-04-18T17:00:00Z',
    raceDate: '2026-04-19T17:00:00Z',
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
          updatedAt: now,
        });
        const updatedRace = await ctx.db.get(existing._id);
        if (updatedRace) {
          await scheduleReminder(ctx, updatedRace);
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
        status: 'upcoming',
        createdAt: now,
        updatedAt: now,
      });
      const insertedRace = await ctx.db.get(raceId);
      if (insertedRace) {
        await scheduleReminder(ctx, insertedRace);
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

    const sessionsForRace = (r: { hasSprint?: boolean }): Array<SessionType> =>
      r.hasSprint
        ? ['sprint_quali', 'sprint', 'quali', 'race']
        : ['quali', 'race'];

    const deleteTop5ForSession = async (
      raceId: Id<'races'>,
      sessionType: SessionType,
    ) => {
      const prediction = await ctx.db
        .query('predictions')
        .withIndex('by_user_race_session', (q) =>
          q
            .eq('userId', user._id)
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
            .eq('userId', user._id)
            .eq('raceId', raceId)
            .eq('sessionType', sessionType),
        )
        .unique();
      if (score) {
        await ctx.db.delete(score._id);
      }
    };

    const deleteH2HForSession = async (
      raceId: Id<'races'>,
      sessionType: SessionType,
      opts?: { deleteResults?: boolean },
    ) => {
      const predictions = await ctx.db
        .query('h2hPredictions')
        .withIndex('by_user_race_session', (q) =>
          q
            .eq('userId', user._id)
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
            .eq('userId', user._id)
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
    };

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
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
