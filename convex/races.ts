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
