import { v } from 'convex/values';

import { internal } from './_generated/api';
import type { Doc } from './_generated/dataModel';
import { internalMutation } from './_generated/server';
import {
  CONSTRUCTOR_POINTS_CACHE_VERSION,
  loadChampionship,
} from './f1Standings';

/** Also callable with force after a direct dashboard edit or data import. */
export const rebuild = internalMutation({
  args: { season: v.number(), force: v.optional(v.boolean()) },
  returns: v.null(),
  handler: async (ctx, { season, force }) => {
    const existing = await ctx.db
      .query('constructorPointsCache')
      .withIndex('by_season', (q) => q.eq('season', season))
      .unique();
    if (!force && existing?.version === CONSTRUCTOR_POINTS_CACHE_VERSION) {
      return null;
    }
    const { constructors } = await loadChampionship(ctx, season);
    const value = {
      season,
      points: constructors.map(({ team, points }) => ({ team, points })),
      version: CONSTRUCTOR_POINTS_CACHE_VERSION,
    };
    if (existing) {
      await ctx.db.replace('constructorPointsCache', existing._id, value);
    } else {
      await ctx.db.insert('constructorPointsCache', value);
    }
    return null;
  },
});

/** Bootstrap newly deployed caches; existing valid summaries need no work. */
export const warm = internalMutation({
  args: {},
  returns: v.array(v.number()),
  handler: async (ctx) => {
    const missing: number[] = [];
    let previousSeason: number | undefined;
    // One calendar row per season. Historical race volume must not hide the
    // current season or turn this daily bootstrap into another calendar scan.
    for (let count = 0; count < 100; count++) {
      const race: Doc<'races'> | null = await ctx.db
        .query('races')
        .withIndex('by_season_round', (q) =>
          previousSeason === undefined ? q : q.gt('season', previousSeason),
        )
        .first();
      if (!race) {
        break;
      }
      previousSeason = race.season;
      const cached = await ctx.db
        .query('constructorPointsCache')
        .withIndex('by_season', (q) => q.eq('season', race.season))
        .unique();
      if (cached?.version !== CONSTRUCTOR_POINTS_CACHE_VERSION) {
        missing.push(race.season);
        await ctx.scheduler.runAfter(
          0,
          internal.constructorPointsCache.rebuild,
          { season: race.season },
        );
      }
    }
    return missing;
  },
});
