import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

const sessionType = v.union(
  v.literal('quali'),
  v.literal('sprint_quali'),
  v.literal('sprint'),
  v.literal('race'),
);

export default defineSchema({
  users: defineTable({
    clerkUserId: v.string(),
    email: v.optional(v.string()),
    displayName: v.optional(v.string()),
    username: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    usernameChangedAt: v.optional(v.number()),
    showOnLeaderboard: v.optional(v.boolean()),
    isAdmin: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_clerkUserId', ['clerkUserId'])
    .index('by_username', ['username']),

  drivers: defineTable({
    code: v.string(), // "VER"
    givenName: v.optional(v.string()),
    familyName: v.optional(v.string()),
    displayName: v.string(), // "Max Verstappen"
    number: v.optional(v.number()), // 1, 44, etc.
    team: v.optional(v.string()), // "Red Bull Racing", "Ferrari", etc.
    nationality: v.optional(v.string()), // ISO 3166-1 alpha-2: "NL", "GB", etc.
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_code', ['code'])
    .index('by_displayName', ['displayName'])
    .index('by_team', ['team']),

  races: defineTable({
    season: v.number(), // 2026
    round: v.number(), // 1..N
    name: v.string(), // "Bahrain Grand Prix"
    slug: v.string(), // "bahrain-2026"

    // Qualifying session (all races have this)
    qualiStartAt: v.optional(v.number()), // ms epoch
    qualiLockAt: v.optional(v.number()), // ms epoch

    // Sprint weekend sessions (optional - only ~6 races per season)
    hasSprint: v.optional(v.boolean()),
    sprintQualiStartAt: v.optional(v.number()),
    sprintQualiLockAt: v.optional(v.number()),
    sprintStartAt: v.optional(v.number()),
    sprintLockAt: v.optional(v.number()),

    // Main race session
    raceStartAt: v.number(), // ms epoch
    predictionLockAt: v.number(), // ms epoch (locks race predictions)

    status: v.string(), // "upcoming" | "locked" | "finished"
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_season_round', ['season', 'round'])
    .index('by_slug', ['slug'])
    .index('by_predictionLockAt', ['predictionLockAt'])
    .index('by_raceStartAt', ['raceStartAt']),

  // Top 5 predictions (quali, sprint, race)
  predictions: defineTable({
    userId: v.id('users'),
    raceId: v.id('races'),
    sessionType: sessionType,
    picks: v.array(v.id('drivers')), // length 5
    submittedAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_race_session', ['userId', 'raceId', 'sessionType'])
    .index('by_race_session', ['raceId', 'sessionType'])
    .index('by_user', ['userId']),

  // Classification results per session
  results: defineTable({
    raceId: v.id('races'),
    sessionType: sessionType,
    classification: v.array(v.id('drivers')), // ordered, ideally full 20
    publishedAt: v.number(),
    updatedAt: v.number(),
  }).index('by_race_session', ['raceId', 'sessionType']),

  // Top 5 scores per session
  scores: defineTable({
    userId: v.id('users'),
    raceId: v.id('races'),
    sessionType: sessionType,
    points: v.number(),
    breakdown: v.optional(
      v.array(
        v.object({
          driverId: v.id('drivers'),
          predictedPosition: v.number(), // 1..5
          actualPosition: v.optional(v.number()),
          points: v.number(),
        }),
      ),
    ),
    // Denormalized user fields (avoids N+1 user lookups in race leaderboard)
    username: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    showOnLeaderboard: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_race_session', ['userId', 'raceId', 'sessionType'])
    .index('by_race_session', ['raceId', 'sessionType'])
    .index('by_user', ['userId'])
    .index('by_user_session', ['userId', 'sessionType']),

  // ============ HEAD TO HEAD ============

  // Teammate pairings per season
  h2hMatchups: defineTable({
    season: v.number(),
    team: v.string(), // "McLaren", "Ferrari", etc.
    driver1Id: v.id('drivers'),
    driver2Id: v.id('drivers'),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_season', ['season'])
    .index('by_season_team', ['season', 'team']),

  // H2H predictions
  h2hPredictions: defineTable({
    userId: v.id('users'),
    raceId: v.id('races'),
    sessionType: sessionType,
    matchupId: v.id('h2hMatchups'),
    predictedWinnerId: v.id('drivers'), // must be driver1 or driver2 from matchup
    submittedAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_race_session', ['userId', 'raceId', 'sessionType'])
    .index('by_user_race_session_matchup', [
      'userId',
      'raceId',
      'sessionType',
      'matchupId',
    ])
    .index('by_race_session', ['raceId', 'sessionType']),

  // H2H results per session
  h2hResults: defineTable({
    raceId: v.id('races'),
    sessionType: sessionType,
    matchupId: v.id('h2hMatchups'),
    winnerId: v.id('drivers'), // whoever finished ahead in classification
    publishedAt: v.number(),
  })
    .index('by_race_session', ['raceId', 'sessionType'])
    .index('by_race_session_matchup', ['raceId', 'sessionType', 'matchupId']),

  // H2H scores
  h2hScores: defineTable({
    userId: v.id('users'),
    raceId: v.id('races'),
    sessionType: sessionType,
    points: v.number(), // 1 point per correct pick, or could weight differently
    correctPicks: v.number(), // count of correct H2H predictions
    totalPicks: v.number(), // count of total H2H predictions made
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_user_race_session', ['userId', 'raceId', 'sessionType'])
    .index('by_race_session', ['raceId', 'sessionType'])
    .index('by_user', ['userId'])
    .index('by_user_session', ['userId', 'sessionType']),

  // ============ MATERIALIZED STANDINGS ============

  // Pre-aggregated season standings (upserted at result publish time)
  seasonStandings: defineTable({
    userId: v.id('users'),
    season: v.number(),
    totalPoints: v.number(),
    raceCount: v.number(),
    // Denormalized user fields (avoids N+1 user lookups in leaderboard queries)
    username: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    showOnLeaderboard: v.optional(v.boolean()),
    updatedAt: v.number(),
  })
    .index('by_season_points', ['season', 'totalPoints'])
    .index('by_user_season', ['userId', 'season']),

  h2hSeasonStandings: defineTable({
    userId: v.id('users'),
    season: v.number(),
    totalPoints: v.number(),
    raceCount: v.number(),
    correctPicks: v.number(),
    totalPicks: v.number(),
    // Denormalized user fields (avoids N+1 user lookups in leaderboard queries)
    username: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    showOnLeaderboard: v.optional(v.boolean()),
    updatedAt: v.number(),
  })
    .index('by_season_points', ['season', 'totalPoints'])
    .index('by_user_season', ['userId', 'season']),

  // ============ FOLLOWS ============

  follows: defineTable({
    followerId: v.id('users'),
    followeeId: v.id('users'),
    createdAt: v.number(),
  })
    .index('by_follower', ['followerId'])
    .index('by_followee', ['followeeId'])
    .index('by_follower_followee', ['followerId', 'followeeId']),

  // ============ LEAGUES ============

  leagues: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    password: v.optional(v.string()),
    createdBy: v.id('users'),
    season: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_slug', ['slug'])
    .index('by_season', ['season']),

  leagueMembers: defineTable({
    leagueId: v.id('leagues'),
    userId: v.id('users'),
    role: v.union(v.literal('admin'), v.literal('member')),
    joinedAt: v.number(),
  })
    .index('by_league', ['leagueId'])
    .index('by_user', ['userId'])
    .index('by_league_user', ['leagueId', 'userId']),
});
