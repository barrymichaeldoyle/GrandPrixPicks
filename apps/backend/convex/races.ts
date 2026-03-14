import { v } from 'convex/values';

import type { Doc } from './_generated/dataModel';
import { mutation, query } from './_generated/server';
import { getOrCreateViewer, requireAdmin, requireViewer } from './lib/auth';
import { getRaceTimeZoneFromSlug } from './lib/raceTimezones';

const raceStatusValidator = v.union(
  v.literal('upcoming'),
  v.literal('locked'),
  v.literal('finished'),
);

export const listRaces = query({
  args: { season: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const races = await ctx.db.query('races').collect();
    const filtered =
      args.season === undefined
        ? races
        : races.filter((r) => r.season === args.season);

    return filtered.sort((a, b) => a.round - b.round);
  },
});

export const getNextRace = query({
  args: {},
  handler: async (ctx): Promise<Doc<'races'> | null> => {
    const now = Date.now();
    const races = await ctx.db.query('races').collect();
    const upcoming = races
      .filter((r) => r.raceStartAt > now)
      .sort((a, b) => a.raceStartAt - b.raceStartAt);

    return upcoming[0] ?? null;
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

export function findRaceBySlugOrLegacyRef<
  T extends { _id: string; slug: string },
>(races: Array<T>, ref: string): T | null {
  return races.find((race) => race.slug === ref || race._id === ref) ?? null;
}

export const getRaceBySlugOrLegacyRef = query({
  args: { ref: v.string() },
  handler: async (ctx, args) => {
    const bySlug = await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', args.ref))
      .unique();
    if (bySlug) {
      return bySlug;
    }

    const races = await ctx.db.query('races').collect();
    return findRaceBySlugOrLegacyRef(races, args.ref);
  },
});

/**
 * When predictions open for this race (previous race's start time).
 * Null for round 1 (no previous race).
 */
export const getPredictionOpenAt = query({
  args: { raceId: v.id('races') },
  handler: async (ctx, args) => {
    const race = await ctx.db.get(args.raceId);
    if (!race || race.round <= 1) {
      return null;
    }

    const previousRace = await ctx.db
      .query('races')
      .withIndex('by_season_round', (q) =>
        q.eq('season', race.season).eq('round', race.round - 1),
      )
      .unique();

    return previousRace?.raceStartAt ?? null;
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

    const races = await ctx.db.query('races').collect();
    const seasonRaces = races
      .filter((r) => r.season === season)
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
      return args.raceId;
    }

    return await ctx.db.insert('races', {
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
  },
});
