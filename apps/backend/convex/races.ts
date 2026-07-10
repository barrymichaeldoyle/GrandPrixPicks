import {
  getSessionsForWeekend,
  type SessionType,
} from '@grandprixpicks/shared/sessions';
import { v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import { internalMutation, mutation, query } from './_generated/server';
import {
  getOrCreateViewer,
  getViewer,
  requireAdmin,
  requireViewer,
} from './lib/auth';
import { scheduleSessionLockNotifications } from './inAppNotifications';
import { getRaceTimeZoneFromSlug } from './lib/raceTimezones';
import type { SessionCapability } from './lib/weekendCapabilities';
import { deriveSessionCapability } from './lib/weekendCapabilities';

const raceStatusValidator = v.union(
  v.literal('upcoming'),
  v.literal('locked'),
  v.literal('finished'),
);

type PredictionRace = {
  _id: string;
  season: number;
  round: number;
  status: string;
  predictionLockAt: number;
};

export function findQuickPickRace<T extends PredictionRace>(
  races: Array<T>,
  now: number,
): T | null {
  const lockedRace =
    races
      .filter((race) => race.status === 'locked')
      .sort((a, b) => b.predictionLockAt - a.predictionLockAt)[0] ?? null;

  return lockedRace ?? findNextPredictionRace(races, now);
}

export function findNextPredictionRace<T extends PredictionRace>(
  races: Array<T>,
  now: number,
): T | null {
  return (
    races
      .filter(
        (race) =>
          race.status !== 'cancelled' &&
          race.status !== 'finished' &&
          race.predictionLockAt > now,
      )
      .sort((a, b) => {
        if (a.season !== b.season) {
          return a.season - b.season;
        }
        return a.round - b.round;
      })[0] ?? null
  );
}

export function getPredictionOpenAtFromRaces<T extends PredictionRace>(
  races: Array<T>,
  race: T,
): number | null {
  const previousRace =
    races
      .filter(
        (candidate) =>
          candidate.season === race.season &&
          candidate.round < race.round &&
          candidate.status !== 'cancelled',
      )
      .sort((a, b) => b.round - a.round)
      .at(0) ?? null;

  return previousRace?.predictionLockAt ?? null;
}

export const listRaces = query({
  args: { season: v.optional(v.number()) },
  handler: async (ctx, args) => {
    if (args.season !== undefined) {
      return await ctx.db
        .query('races')
        .withIndex('by_season_round', (q) => q.eq('season', args.season!))
        .take(40);
    }

    const races = await ctx.db
      .query('races')
      .withIndex('by_season_round')
      .take(100);

    return races.sort((a, b) => {
      if (a.season !== b.season) {
        return a.season - b.season;
      }
      return a.round - b.round;
    });
  },
});

export const getNextRace = query({
  args: {},
  handler: async (ctx): Promise<Doc<'races'> | null> => {
    const now = Date.now();
    return await ctx.db
      .query('races')
      .withIndex('by_status_and_predictionLockAt', (q) =>
        q.eq('status', 'upcoming').gt('predictionLockAt', now),
      )
      .first();
  },
});

export const getQuickPickRace = query({
  args: {},
  handler: async (ctx): Promise<Doc<'races'> | null> => {
    const now = Date.now();
    const lockedRace = await ctx.db
      .query('races')
      .withIndex('by_status_and_predictionLockAt', (q) =>
        q.eq('status', 'locked'),
      )
      .order('desc')
      .first();

    if (lockedRace) {
      return lockedRace;
    }

    return await ctx.db
      .query('races')
      .withIndex('by_status_and_predictionLockAt', (q) =>
        q.eq('status', 'upcoming').gt('predictionLockAt', now),
      )
      .first();
  },
});

/**
 * The mobile-oriented current-weekend query (MVP plan, backend item 1+2).
 * Returns the same race `getQuickPickRace` would show — the in-progress
 * locked race if one exists, otherwise the next submittable race — plus a
 * server-derived capability for every session in the weekend, so clients
 * don't re-implement lock/eligibility rules. Mutations remain the final
 * authority on writes.
 */
export const getCurrentWeekend = query({
  args: {},
  handler: async (
    ctx,
  ): Promise<{
    race: Doc<'races'>;
    serverNow: number;
    isSubmittable: boolean;
    sessions: SessionCapability[];
  } | null> => {
    const now = Date.now();
    const viewer = await getViewer(ctx);

    const lockedRace = await ctx.db
      .query('races')
      .withIndex('by_status_and_predictionLockAt', (q) =>
        q.eq('status', 'locked'),
      )
      .order('desc')
      .first();
    const race =
      lockedRace ??
      (await ctx.db
        .query('races')
        .withIndex('by_status_and_predictionLockAt', (q) =>
          q.eq('status', 'upcoming').gt('predictionLockAt', now),
        )
        .first());

    if (!race) {
      return null;
    }

    // Mirrors the submission mutations' race check: only the next `upcoming`
    // race with its final lock in the future accepts writes.
    const isSubmittable =
      race.status === 'upcoming' && race.predictionLockAt > now;

    const lockAtBySession: Record<SessionType, number | undefined> = {
      quali: race.qualiLockAt,
      sprint_quali: race.sprintQualiLockAt,
      sprint: race.sprintLockAt,
      race: race.predictionLockAt,
    };

    const sessions = await Promise.all(
      getSessionsForWeekend(Boolean(race.hasSprint)).map(
        async (sessionType) => {
          const [result, top5, h2h] = await Promise.all([
            ctx.db
              .query('results')
              .withIndex('by_race_session', (q) =>
                q.eq('raceId', race._id).eq('sessionType', sessionType),
              )
              .first(),
            viewer
              ? ctx.db
                  .query('predictions')
                  .withIndex('by_user_race_session', (q) =>
                    q
                      .eq('userId', viewer._id)
                      .eq('raceId', race._id)
                      .eq('sessionType', sessionType),
                  )
                  .first()
              : Promise.resolve(null),
            viewer
              ? ctx.db
                  .query('h2hPredictions')
                  .withIndex('by_user_race_session', (q) =>
                    q
                      .eq('userId', viewer._id)
                      .eq('raceId', race._id)
                      .eq('sessionType', sessionType),
                  )
                  .first()
              : Promise.resolve(null),
          ]);

          return deriveSessionCapability({
            sessionType,
            lockAt: lockAtBySession[sessionType],
            now,
            isSignedIn: viewer !== null,
            raceIsSubmittable: isSubmittable,
            hasResult: result !== null,
            hasTop5: top5 !== null,
            hasH2H: h2h !== null,
          });
        },
      ),
    );

    return { race, serverNow: now, isSubmittable, sessions };
  },
});

export const getRace = query({
  args: { raceId: v.id('races') },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.raceId);
  },
});

export const getRaceBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', args.slug))
      .unique();
  },
});

/**
 * When predictions open for this race (previous non-cancelled race's final prediction lock).
 * Null for round 1 (no previous race).
 */
export const getPredictionOpenAt = query({
  args: { raceId: v.id('races') },
  handler: async (ctx, args) => {
    const race = await ctx.db.get(args.raceId);
    if (!race || race.round <= 1) {
      return null;
    }

    const seasonRaces = await ctx.db
      .query('races')
      .withIndex('by_season_round', (q) => q.eq('season', race.season))
      .take(race.round - 1);
    return getPredictionOpenAtFromRaces(seasonRaces, race);
  },
});

/**
 * Returns the most relevant race for the weekend leaderboard:
 * - If the current/next race's first session has already started (lock time passed), return it.
 * - Otherwise, return the most recently finished race.
 */
export const getWeekendLeaderboardRace = query({
  args: { season: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const season = args.season ?? 2026;
    const now = Date.now();

    const races = await ctx.db
      .query('races')
      .withIndex('by_season_round', (q) => q.eq('season', season))
      .take(40);
    const seasonRaces = races
      .filter((r) => r.season === season && r.status !== 'cancelled')
      .sort((a, b) => a.round - b.round);

    if (seasonRaces.length === 0) {
      return null;
    }

    // Find the next/current non-finished race
    const currentRace = seasonRaces.find((r) => r.status !== 'finished');

    if (currentRace) {
      // First session lock time: sprint weekends start with sprint quali
      const firstSessionLockAt = currentRace.hasSprint
        ? (currentRace.sprintQualiLockAt ?? currentRace.qualiLockAt)
        : currentRace.qualiLockAt;

      if (firstSessionLockAt !== undefined && now >= firstSessionLockAt) {
        return currentRace;
      }
    }

    // Fall back to the last finished race
    const finishedRaces = seasonRaces.filter((r) => r.status === 'finished');
    if (finishedRaces.length > 0) {
      return finishedRaces[finishedRaces.length - 1];
    }

    return currentRace ?? null;
  },
});

export const adminUpsertRace = mutation({
  args: {
    raceId: v.optional(v.id('races')),
    season: v.number(),
    round: v.number(),
    name: v.string(),
    slug: v.string(),
    timeZone: v.optional(v.string()),
    raceStartAt: v.number(),
    predictionLockAt: v.number(),
    status: raceStatusValidator,
  },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));
    requireAdmin(viewer);

    const now = Date.now();
    const timeZone = args.timeZone ?? getRaceTimeZoneFromSlug(args.slug);

    if (args.raceId) {
      await ctx.db.patch(args.raceId, {
        season: args.season,
        round: args.round,
        name: args.name,
        slug: args.slug,
        timeZone,
        raceStartAt: args.raceStartAt,
        predictionLockAt: args.predictionLockAt,
        status: args.status,
        updatedAt: now,
      });
      const updatedRace = await ctx.db.get(args.raceId);
      if (updatedRace) {
        await scheduleSessionLockNotifications(ctx, updatedRace);
      }
      return args.raceId;
    }

    const newRaceId = await ctx.db.insert('races', {
      season: args.season,
      round: args.round,
      name: args.name,
      slug: args.slug,
      timeZone,
      raceStartAt: args.raceStartAt,
      predictionLockAt: args.predictionLockAt,
      status: args.status,
      createdAt: now,
      updatedAt: now,
    });
    const newRace = await ctx.db.get(newRaceId);
    if (newRace) {
      await scheduleSessionLockNotifications(ctx, newRace);
    }
    return newRaceId;
  },
});

export const adminCancelRace = mutation({
  args: { raceId: v.id('races') },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));
    requireAdmin(viewer);

    const race = await ctx.db.get(args.raceId);
    if (!race) {
      throw new Error('Race not found');
    }

    // Cancel the scheduled email reminder if one is queued
    if (race.reminderScheduledId) {
      try {
        await ctx.scheduler.cancel(
          race.reminderScheduledId as Id<'_scheduled_functions'>,
        );
      } catch {
        // Already ran or was cancelled — safe to ignore
      }
    }

    await ctx.db.patch(args.raceId, {
      status: 'cancelled',
      reminderScheduledId: undefined,
      updatedAt: Date.now(),
    });
  },
});

export const adminRestoreRace = mutation({
  args: { raceId: v.id('races') },
  handler: async (ctx, args) => {
    const viewer = requireViewer(await getOrCreateViewer(ctx));
    requireAdmin(viewer);

    const race = await ctx.db.get(args.raceId);
    if (!race) {
      throw new Error('Race not found');
    }

    await ctx.db.patch(args.raceId, {
      status: 'upcoming',
      updatedAt: Date.now(),
    });
  },
});

/**
 * CLI/dashboard only — not callable from the public Convex API.
 * Run via: npx convex run --prod races:emergencySetRaceStatus \
 *   '{"raceId":"...","status":"upcoming"}'
 */
export const emergencySetRaceStatus = internalMutation({
  args: {
    raceId: v.id('races'),
    status: v.union(
      v.literal('upcoming'),
      v.literal('locked'),
      v.literal('finished'),
      v.literal('cancelled'),
    ),
  },
  handler: async (ctx, args) => {
    const race = await ctx.db.get(args.raceId);
    if (!race) {
      throw new Error('Race not found');
    }
    const previous = race.status;
    await ctx.db.patch(args.raceId, {
      status: args.status,
      updatedAt: Date.now(),
    });
    return { ok: true, previous, status: args.status };
  },
});
