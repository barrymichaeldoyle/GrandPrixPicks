import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc, Id } from './_generated/dataModel';
import type { DatabaseReader } from './_generated/server';
import { internalMutation, mutation, query } from './_generated/server';
import { getViewer, requireViewer } from './lib/auth';

const sessionTypeValidator = v.union(
  v.literal('quali'),
  v.literal('sprint_quali'),
  v.literal('sprint'),
  v.literal('race'),
);

/** Matches `results.sessionType` / index fields — use when narrowing from feed `string` fields. */
type SessionType = Doc<'results'>['sessionType'];

type DbCtx = { db: DatabaseReader };

// ============ Internal event writers ============

/**
 * Write session_locked feed events for every user who has a prediction for a session.
 * Called at session lock time so followees' picks are revealed in the feed immediately.
 * Idempotent — skips users who already have a feed event for this race/session.
 */
export const writeFeedEventsForSessionLock = internalMutation({
  args: {
    raceId: v.id('races'),
    sessionType: sessionTypeValidator,
  },
  handler: async (ctx, args) => {
    const race = await ctx.db.get(args.raceId);
    if (!race) {
      return;
    }

    const now = Date.now();

    const predictions = await ctx.db
      .query('predictions')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )
      .take(500);

    for (const prediction of predictions) {
      const user = await ctx.db.get(prediction.userId);
      if (!user) {
        continue;
      }

      // Skip if a feed event already exists for this user/race/session
      const existing = await ctx.db
        .query('feedEvents')
        .withIndex('by_user_race_session', (q) =>
          q
            .eq('userId', prediction.userId)
            .eq('raceId', args.raceId)
            .eq('sessionType', args.sessionType),
        )
        .first();

      if (existing) {
        continue;
      }

      await ctx.db.insert('feedEvents', {
        type: 'session_locked',
        userId: prediction.userId,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        raceId: args.raceId,
        sessionType: args.sessionType,
        raceName: race.name,
        raceSlug: race.slug,
        season: race.season,
        revCount: 0,
        createdAt: now,
      });
    }
  },
});

/** Write (or update) score_published feed events for every user who has a score for a session. */
export const writeFeedEventsForSession = internalMutation({
  args: {
    raceId: v.id('races'),
    sessionType: sessionTypeValidator,
  },
  handler: async (ctx, args) => {
    const race = await ctx.db.get(args.raceId);
    if (!race) {
      return;
    }

    const now = Date.now();

    const scores = await ctx.db
      .query('scores')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )
      .take(500);

    for (const score of scores) {
      const user = await ctx.db.get(score.userId);
      if (!user) {
        continue;
      }

      // Upsert: one event per user/race/session
      const existing = await ctx.db
        .query('feedEvents')
        .withIndex('by_user_race_session', (q) =>
          q
            .eq('userId', score.userId)
            .eq('raceId', args.raceId)
            .eq('sessionType', args.sessionType),
        )
        .first();

      if (existing) {
        await ctx.db.patch(existing._id, {
          type: 'score_published',
          points: score.points,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
        });
      } else {
        await ctx.db.insert('feedEvents', {
          type: 'score_published',
          userId: score.userId,
          username: user.username,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          raceId: args.raceId,
          sessionType: args.sessionType,
          points: score.points,
          raceName: race.name,
          raceSlug: race.slug,
          season: race.season,
          revCount: 0,
          createdAt: now,
        });
      }

      // In-app notification: results are ready
      await ctx.scheduler.runAfter(
        0,
        internal.inAppNotifications.createResultsNotification,
        {
          userId: score.userId,
          raceId: args.raceId,
          sessionType: args.sessionType,
          raceName: race.name,
          raceSlug: race.slug,
          points: score.points,
        },
      );
    }
  },
});

/** Write a joined_league feed event. Called from leagues.ts after a successful join. */
export const writeJoinedLeagueFeedEvent = internalMutation({
  args: {
    userId: v.id('users'),
    leagueId: v.id('leagues'),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    const league = await ctx.db.get(args.leagueId);
    if (!user || !league) {
      return;
    }

    await ctx.db.insert('feedEvents', {
      type: 'joined_league',
      userId: args.userId,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      leagueId: args.leagueId,
      leagueName: league.name,
      leagueSlug: league.slug,
      revCount: 0,
      createdAt: Date.now(),
    });
  },
});

const STREAK_MILESTONES = new Set([3, 5, 10, 15, 20, 25, 30]);

/**
 * After a race session is scored, check each user's consecutive-race streak.
 * Only runs for the `race` sessionType — streaks are measured race-by-race.
 */
export const writeStreakEventsForRaceSession = internalMutation({
  args: {
    raceId: v.id('races'),
    season: v.number(),
  },
  handler: async (ctx, args) => {
    const race = await ctx.db.get(args.raceId);
    if (!race) {
      return;
    }

    // All races for this season, ordered ascending by round
    const seasonRaces = await ctx.db
      .query('races')
      .withIndex('by_season_round', (q) => q.eq('season', args.season))
      .order('asc')
      .take(30);

    // Everyone who scored in this race session
    const scores = await ctx.db
      .query('scores')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', 'race'),
      )
      .take(500);

    const now = Date.now();

    for (const score of scores) {
      // Count consecutive races going backwards from this one
      let streak = 0;
      for (let i = seasonRaces.length - 1; i >= 0; i--) {
        const r = seasonRaces[i];
        if (r.round > race.round) {
          continue;
        }
        const s = await ctx.db
          .query('scores')
          .withIndex('by_user_race_session', (q) =>
            q
              .eq('userId', score.userId)
              .eq('raceId', r._id)
              .eq('sessionType', 'race'),
          )
          .first();
        if (s) {
          streak++;
        } else {
          break;
        }
      }

      if (!STREAK_MILESTONES.has(streak)) {
        continue;
      }

      // Only write if we haven't already celebrated this streak count for this user
      const existing = await ctx.db
        .query('feedEvents')
        .withIndex('by_user_streak', (q) =>
          q.eq('userId', score.userId).eq('streakCount', streak),
        )
        .first();
      if (existing) {
        continue;
      }

      const user = await ctx.db.get(score.userId);
      if (!user) {
        continue;
      }

      await ctx.db.insert('feedEvents', {
        type: 'streak_milestone',
        userId: score.userId,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        streakCount: streak,
        season: args.season,
        revCount: 0,
        createdAt: now,
      });
    }
  },
});

// ============ Feed queries ============

const EVENTS_PER_USER = 15;
const MAX_FEED_SIZE = 40;

type RawEvent = {
  _id: Id<'feedEvents'>;
  type:
    | 'score_published'
    | 'session_locked'
    | 'joined_league'
    | 'streak_milestone';
  userId: Id<'users'>;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  raceId?: Id<'races'>;
  sessionType?: string;
  points?: number;
  raceName?: string;
  raceSlug?: string;
  season?: number;
  leagueId?: Id<'leagues'>;
  leagueName?: string;
  leagueSlug?: string;
  streakCount?: number;
  revCount: number;
  createdAt: number;
};

/** Build a map of session headers (top-5 results) for all score_published events. */
async function buildSessionHeaders(
  ctx: DbCtx,
  events: Array<RawEvent>,
): Promise<
  Record<
    string,
    {
      raceName: string;
      sessionType: string;
      raceSlug?: string;
      top5: Array<{
        code: string;
        displayName: string;
        team?: string;
        nationality?: string;
      }>;
    }
  >
> {
  // Collect unique race+session keys from score_published events
  const combos = new Map<
    string,
    {
      raceId: Id<'races'>;
      sessionType: SessionType;
      raceName?: string;
      raceSlug?: string;
    }
  >();
  for (const event of events) {
    if (
      (event.type === 'score_published' || event.type === 'session_locked') &&
      event.raceId &&
      event.sessionType
    ) {
      const key = `${event.raceId}_${event.sessionType}`;
      if (!combos.has(key)) {
        combos.set(key, {
          raceId: event.raceId,
          sessionType: event.sessionType as SessionType,
          raceName: event.raceName,
          raceSlug: event.raceSlug,
        });
      }
    }
  }

  if (combos.size === 0) {
    return {};
  }

  // Load results and collect all top-5 driver IDs
  const top5ByKey = new Map<string, Array<Id<'drivers'>>>();
  const driverIdsNeeded = new Set<Id<'drivers'>>();

  for (const [key, { raceId, sessionType }] of combos) {
    const result = await ctx.db
      .query('results')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', raceId).eq('sessionType', sessionType),
      )
      .unique();
    if (result) {
      const top5 = result.classification.slice(0, 5);
      top5ByKey.set(key, top5);
      for (const id of top5) {
        driverIdsNeeded.add(id);
      }
    }
  }

  // Load all needed drivers in one pass
  const driverMap = new Map<
    string,
    {
      code: string;
      displayName: string;
      team?: string;
      nationality?: string;
    }
  >();
  for (const driverId of driverIdsNeeded) {
    const driver = await ctx.db.get(driverId);
    if (driver) {
      driverMap.set(String(driverId), {
        code: driver.code,
        displayName: driver.displayName,
        team: driver.team,
        nationality: driver.nationality,
      });
    }
  }

  // Assemble headers
  const sessions: Record<
    string,
    {
      raceName: string;
      sessionType: string;
      raceSlug?: string;
      top5: Array<{
        code: string;
        displayName: string;
        team?: string;
        nationality?: string;
      }>;
    }
  > = {};
  for (const [key, { raceName, raceSlug, sessionType }] of combos) {
    const top5Ids = top5ByKey.get(key) ?? [];
    sessions[key] = {
      raceName: raceName ?? '',
      sessionType,
      raceSlug,
      top5: top5Ids.map(
        (id) =>
          driverMap.get(String(id)) ?? {
            nationality: undefined,
            code: '?',
            displayName: 'Unknown',
            team: 'Unknown',
          },
      ),
    };
  }

  return sessions;
}

type PickEnrichment = {
  code: string;
  team?: string;
  displayName?: string;
  nationality?: string;
  predictedPosition: number;
  actualPosition?: number;
  points: number;
};

/** Load picks breakdown + H2H summary for a score_published or session_locked event. */
async function enrichScoreEvent(
  ctx: DbCtx,
  event: RawEvent,
): Promise<{
  picks: Array<PickEnrichment> | undefined;
  h2hScore: { correctPicks: number; totalPicks: number; points: number } | null;
}> {
  if (
    (event.type !== 'score_published' && event.type !== 'session_locked') ||
    !event.raceId ||
    !event.sessionType
  ) {
    return { picks: undefined, h2hScore: null };
  }

  const sessionType = event.sessionType as SessionType;
  const raceId = event.raceId;

  if (event.type === 'session_locked') {
    // Results not yet published — load picks from predictions table (unscored)
    const prediction = await ctx.db
      .query('predictions')
      .withIndex('by_user_race_session', (q) =>
        q
          .eq('userId', event.userId)
          .eq('raceId', raceId)
          .eq('sessionType', sessionType),
      )
      .unique();

    if (!prediction?.picks || prediction.picks.length === 0) {
      return { picks: undefined, h2hScore: null };
    }

    const driverIds = prediction.picks;
    const driverMap = new Map<
      string,
      {
        code: string;
        team?: string;
        displayName?: string;
        nationality?: string;
      }
    >();
    for (const driverId of driverIds) {
      const driver = await ctx.db.get(driverId);
      if (driver) {
        driverMap.set(String(driverId), {
          code: driver.code,
          team: driver.team,
          displayName: driver.displayName,
          nationality: driver.nationality,
        });
      }
    }

    const picks: Array<PickEnrichment> = driverIds.map((driverId, index) => {
      const d = driverMap.get(String(driverId));
      return {
        code: d?.code ?? '???',
        team: d?.team,
        displayName: d?.displayName,
        nationality: d?.nationality,
        predictedPosition: index + 1,
        points: 0,
      };
    });

    return { picks, h2hScore: null };
  }

  const [score, h2hRecord] = await Promise.all([
    ctx.db
      .query('scores')
      .withIndex('by_user_race_session', (q) =>
        q
          .eq('userId', event.userId)
          .eq('raceId', raceId)
          .eq('sessionType', sessionType),
      )
      .unique(),
    ctx.db
      .query('h2hScores')
      .withIndex('by_user_race_session', (q) =>
        q
          .eq('userId', event.userId)
          .eq('raceId', raceId)
          .eq('sessionType', sessionType),
      )
      .unique(),
  ]);

  let picks: Array<PickEnrichment> | undefined;

  if (score?.breakdown && score.breakdown.length > 0) {
    const driverMap = new Map<
      string,
      {
        code: string;
        team?: string;
        displayName?: string;
        nationality?: string;
      }
    >();
    for (const pick of score.breakdown) {
      const id = String(pick.driverId);
      if (!driverMap.has(id)) {
        const driver = await ctx.db.get(pick.driverId);
        if (driver) {
          driverMap.set(id, {
            code: driver.code,
            team: driver.team,
            displayName: driver.displayName,
            nationality: driver.nationality,
          });
        }
      }
    }
    picks = score.breakdown.map((pick) => {
      const d = driverMap.get(String(pick.driverId));
      return {
        code: d?.code ?? '???',
        team: d?.team,
        displayName: d?.displayName,
        nationality: d?.nationality,
        predictedPosition: pick.predictedPosition,
        actualPosition: pick.actualPosition,
        points: pick.points,
      };
    });
  }

  return {
    picks,
    h2hScore: h2hRecord
      ? {
          correctPicks: h2hRecord.correctPicks,
          totalPicks: h2hRecord.totalPicks,
          points: h2hRecord.points,
        }
      : null,
  };
}

/** Return the most recent N users who reved a feed event, for avatar preview. */
async function getRecentRevUsers(
  ctx: DbCtx,
  feedEventId: Id<'feedEvents'>,
  limit = 5,
): Promise<
  Array<{ userId: Id<'users'>; username?: string; avatarUrl?: string }>
> {
  const revs = await ctx.db
    .query('revs')
    .withIndex('by_event', (q) => q.eq('feedEventId', feedEventId))
    .order('desc')
    .take(limit);
  const users = await Promise.all(
    revs.map(async (rev) => {
      const user = await ctx.db.get(rev.userId);
      return user
        ? {
            userId: user._id,
            username: user.username,
            avatarUrl: user.avatarUrl,
          }
        : null;
    }),
  );
  return users.filter((u): u is NonNullable<typeof u> => u !== null);
}

/**
 * Profile feed: score_published events for a specific user, most recent first.
 * Used on the profile page to show a user's result history in feed style.
 */
export const getUserFeed = query({
  args: { userId: v.id('users') },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);

    const rawEvents = await ctx.db
      .query('feedEvents')
      .withIndex('by_user_created', (q) => q.eq('userId', args.userId))
      .order('desc')
      .take(100);

    const events = rawEvents
      .filter((e) => e.type === 'score_published')
      .slice(0, 50);

    const [enrichedEvents, sessions] = await Promise.all([
      Promise.all(
        events.map(async (event) => {
          const [viewerRev, scoreEnrichment, recentRevUsers] =
            await Promise.all([
              viewer
                ? ctx.db
                    .query('revs')
                    .withIndex('by_user_event', (q) =>
                      q.eq('userId', viewer._id).eq('feedEventId', event._id),
                    )
                    .first()
                : Promise.resolve(null),
              enrichScoreEvent(ctx, event),
              getRecentRevUsers(ctx, event._id),
            ]);
          return {
            ...event,
            viewerHasReved: viewerRev !== null,
            recentRevUsers,
            ...scoreEnrichment,
          };
        }),
      ),
      buildSessionHeaders(ctx, events),
    ]);

    return { events: enrichedEvents, sessions };
  },
});

/**
 * Personalized home feed: events from the viewer + people they follow.
 * Sorted by most recent first. Includes session headers for score_published events.
 */
export const getPersonalizedFeed = query({
  args: {},
  handler: async (ctx) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return null;
    }

    // Collect user IDs to include in the feed
    const userIds = new Set<Id<'users'>>();
    userIds.add(viewer._id);

    const follows = await ctx.db
      .query('follows')
      .withIndex('by_follower', (q) => q.eq('followerId', viewer._id))
      .take(150);
    for (const f of follows) {
      userIds.add(f.followeeId);
    }

    // Load recent events per user and merge
    const allEvents: Array<RawEvent> = [];
    for (const userId of userIds) {
      const events = await ctx.db
        .query('feedEvents')
        .withIndex('by_user_created', (q) => q.eq('userId', userId))
        .order('desc')
        .take(EVENTS_PER_USER);
      allEvents.push(...events);
    }

    allEvents.sort((a, b) => b.createdAt - a.createdAt);
    const page = allEvents.slice(0, MAX_FEED_SIZE);

    // Enrich events with rev status, picks, and H2H summary
    const [enrichedEvents, sessions] = await Promise.all([
      Promise.all(
        page.map(async (event) => {
          const [viewerRev, scoreEnrichment, recentRevUsers] =
            await Promise.all([
              ctx.db
                .query('revs')
                .withIndex('by_user_event', (q) =>
                  q.eq('userId', viewer._id).eq('feedEventId', event._id),
                )
                .first(),
              enrichScoreEvent(ctx, event),
              getRecentRevUsers(ctx, event._id),
            ]);
          return {
            ...event,
            viewerHasReved: viewerRev !== null,
            recentRevUsers,
            ...scoreEnrichment,
          };
        }),
      ),
      buildSessionHeaders(ctx, page),
    ]);

    return { events: enrichedEvents, sessions };
  },
});

/**
 * Feed scoped to a league: events from all members of the league.
 * Used on the league detail page.
 */
export const getLeagueFeed = query({
  args: { leagueId: v.id('leagues') },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);

    const members = await ctx.db
      .query('leagueMembers')
      .withIndex('by_league', (q) => q.eq('leagueId', args.leagueId))
      .take(200);

    const allEvents: Array<RawEvent> = [];
    for (const member of members) {
      const events = await ctx.db
        .query('feedEvents')
        .withIndex('by_user_created', (q) => q.eq('userId', member.userId))
        .order('desc')
        .take(EVENTS_PER_USER);
      allEvents.push(...events);
    }

    allEvents.sort((a, b) => b.createdAt - a.createdAt);
    const page = allEvents.slice(0, MAX_FEED_SIZE);

    const [enrichedEvents, sessions] = await Promise.all([
      Promise.all(
        page.map(async (event) => {
          const [viewerRev, scoreEnrichment, recentRevUsers] =
            await Promise.all([
              viewer
                ? ctx.db
                    .query('revs')
                    .withIndex('by_user_event', (q) =>
                      q.eq('userId', viewer._id).eq('feedEventId', event._id),
                    )
                    .first()
                : Promise.resolve(null),
              enrichScoreEvent(ctx, event),
              getRecentRevUsers(ctx, event._id),
            ]);
          return {
            ...event,
            viewerHasReved: viewerRev !== null,
            recentRevUsers,
            ...scoreEnrichment,
          };
        }),
      ),
      buildSessionHeaders(ctx, page),
    ]);

    return { events: enrichedEvents, sessions };
  },
});

export const getFeedEvent = query({
  args: { feedEventId: v.id('feedEvents') },
  handler: async (ctx, args) => {
    const viewer = await getViewer(ctx);
    if (!viewer) {
      return null;
    }

    const event = await ctx.db.get(args.feedEventId);
    if (!event) {
      return null;
    }

    const [viewerRev, scoreEnrichment, sessions, recentRevUsers] =
      await Promise.all([
        ctx.db
          .query('revs')
          .withIndex('by_user_event', (q) =>
            q.eq('userId', viewer._id).eq('feedEventId', event._id),
          )
          .first(),
        enrichScoreEvent(ctx, event),
        buildSessionHeaders(ctx, [event]),
        getRecentRevUsers(ctx, event._id),
      ]);

    const sessionKey =
      event.raceId && event.sessionType
        ? `${event.raceId}_${event.sessionType}`
        : null;

    return {
      event: {
        ...event,
        viewerHasReved: viewerRev !== null,
        recentRevUsers,
        ...scoreEnrichment,
      },
      session: sessionKey ? (sessions[sessionKey] ?? null) : null,
    };
  },
});

// ============ Revs ============

export const giveRev = mutation({
  args: { feedEventId: v.id('feedEvents') },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getViewer(ctx));

    const existing = await ctx.db
      .query('revs')
      .withIndex('by_user_event', (q) =>
        q.eq('userId', viewer._id).eq('feedEventId', args.feedEventId),
      )
      .first();

    if (existing) {
      return;
    } // Already reved

    await ctx.db.insert('revs', {
      feedEventId: args.feedEventId,
      userId: viewer._id,
      createdAt: Date.now(),
    });

    const event = await ctx.db.get(args.feedEventId);
    if (event) {
      await ctx.db.patch(args.feedEventId, { revCount: event.revCount + 1 });

      // In-app notification: tell the post owner they received a rev
      await ctx.scheduler.runAfter(
        0,
        internal.inAppNotifications.createRevNotification,
        {
          recipientUserId: event.userId,
          actorUserId: viewer._id,
          feedEventId: args.feedEventId,
          raceId: event.raceId,
          sessionType: event.sessionType,
          raceName: event.raceName,
          raceSlug: event.raceSlug,
        },
      );
    }
  },
});

export const removeRev = mutation({
  args: { feedEventId: v.id('feedEvents') },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getViewer(ctx));

    const existing = await ctx.db
      .query('revs')
      .withIndex('by_user_event', (q) =>
        q.eq('userId', viewer._id).eq('feedEventId', args.feedEventId),
      )
      .first();

    if (!existing) {
      return;
    } // Not reved

    await ctx.db.delete(existing._id);

    const event = await ctx.db.get(args.feedEventId);
    if (event) {
      await ctx.db.patch(args.feedEventId, {
        revCount: Math.max(0, event.revCount - 1),
      });
    }
  },
});

export const getRevUsers = query({
  args: { feedEventId: v.id('feedEvents') },
  handler: async (ctx, args) => {
    const revs = await ctx.db
      .query('revs')
      .withIndex('by_event', (q) => q.eq('feedEventId', args.feedEventId))
      .order('desc')
      .take(100);

    const users = await Promise.all(
      revs.map(async (rev) => {
        const user = await ctx.db.get(rev.userId);
        return user
          ? {
              userId: user._id,
              username: user.username,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
            }
          : null;
      }),
    );

    return users.filter(Boolean);
  },
});

// ============ Backfill ============

/**
 * Backfill session_locked feed events for a specific race+session.
 * Use this when the scheduler failed to fire (e.g. race wasn't scheduled via adminUpsertRace).
 * Safe to run on production — idempotent, skips users who already have an event.
 *
 * Run via:
 *   npx convex run feed:backfillSessionLockFeedEvents '{"raceId": "<id>", "sessionType": "quali"}'
 */
export const backfillSessionLockFeedEvents = mutation({
  args: {
    raceId: v.id('races'),
    sessionType: sessionTypeValidator,
  },
  handler: async (ctx, args) => {
    const race = await ctx.db.get(args.raceId);
    if (!race) {
      throw new Error('Race not found');
    }

    const now = Date.now();
    let created = 0;

    const predictions = await ctx.db
      .query('predictions')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )
      .take(500);

    for (const prediction of predictions) {
      const user = await ctx.db.get(prediction.userId);
      if (!user) {
        continue;
      }

      const existing = await ctx.db
        .query('feedEvents')
        .withIndex('by_user_race_session', (q) =>
          q
            .eq('userId', prediction.userId)
            .eq('raceId', args.raceId)
            .eq('sessionType', args.sessionType),
        )
        .first();

      if (existing) {
        continue;
      }

      await ctx.db.insert('feedEvents', {
        type: 'session_locked',
        userId: prediction.userId,
        username: user.username,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        raceId: args.raceId,
        sessionType: args.sessionType,
        raceName: race.name,
        raceSlug: race.slug,
        season: race.season,
        revCount: 0,
        createdAt: now,
      });
      created++;
    }

    return { created };
  },
});

/**
 * Backfill score_published feed events for all published results in a season.
 * Safe to run on production — fully idempotent (upserts, never duplicates).
 * Uses real publishedAt timestamps so events appear at the correct time in the feed.
 *
 * Run via:
 *   npx convex run feed:backfillFeedEventsForSeason
 *   npx convex run feed:backfillFeedEventsForSeason '{"season": 2026}'
 */
export const backfillFeedEventsForSeason = mutation({
  args: { season: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const season = args.season ?? 2026;
    let created = 0;
    let updated = 0;

    const races = await ctx.db
      .query('races')
      .withIndex('by_season_round', (q) => q.eq('season', season))
      .collect();

    for (const race of races) {
      const results = await ctx.db
        .query('results')
        .withIndex('by_race_session', (q) => q.eq('raceId', race._id))
        .collect();

      for (const result of results) {
        const scores = await ctx.db
          .query('scores')
          .withIndex('by_race_session', (q) =>
            q.eq('raceId', race._id).eq('sessionType', result.sessionType),
          )
          .take(500);

        for (const score of scores) {
          const user = await ctx.db.get(score.userId);
          if (!user) {
            continue;
          }

          const existing = await ctx.db
            .query('feedEvents')
            .withIndex('by_user_race_session', (q) =>
              q
                .eq('userId', score.userId)
                .eq('raceId', race._id)
                .eq('sessionType', result.sessionType),
            )
            .first();

          if (existing) {
            await ctx.db.patch(existing._id, {
              points: score.points,
              username: user.username,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
            });
            updated++;
          } else {
            await ctx.db.insert('feedEvents', {
              type: 'score_published',
              userId: score.userId,
              username: user.username,
              displayName: user.displayName,
              avatarUrl: user.avatarUrl,
              raceId: race._id,
              sessionType: result.sessionType,
              points: score.points,
              raceName: race.name,
              raceSlug: race.slug,
              season: race.season,
              revCount: 0,
              createdAt: result.publishedAt,
            });
            created++;
          }
        }
      }
    }

    return { season, created, updated };
  },
});

// ============ Cleanup (for rollbacks) ============

/** Delete all feed events for a session (called when results are rolled back). */
export const deleteFeedEventsForSession = internalMutation({
  args: {
    raceId: v.id('races'),
    sessionType: sessionTypeValidator,
  },
  handler: async (ctx, args) => {
    const events = await ctx.db
      .query('feedEvents')
      .withIndex('by_race_session', (q) =>
        q.eq('raceId', args.raceId).eq('sessionType', args.sessionType),
      )
      .take(500);

    for (const event of events) {
      // Delete associated revs
      const revs = await ctx.db
        .query('revs')
        .withIndex('by_event', (q) => q.eq('feedEventId', event._id))
        .take(500);
      for (const rev of revs) {
        await ctx.db.delete(rev._id);
      }
      await ctx.db.delete(event._id);
    }
  },
});
