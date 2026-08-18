import { compareDriversByTeam } from '@grandprixpicks/shared/teams';

import { query } from './_generated/server';
import { loadConstructorPoints } from './f1Standings';
import { getCurrentSeason } from './lib/season';

export const listDrivers = query({
  args: {},
  handler: async (ctx) => {
    const drivers = await ctx.db
      .query('drivers')
      .withIndex('by_displayName')
      .take(30);

    // The index gives alphabetical order, so both apps re-sorted this by hand
    // into team order and had to agree on the tie-breaks to stay in step.
    // Sorting here means the pool, the duel grid and the feed all come out of
    // the same championship, and a scored race moves them together.
    const teamPoints = await loadConstructorPoints(
      ctx,
      await getCurrentSeason(ctx),
    );
    return [...drivers].sort((a, b) => compareDriversByTeam(a, b, teamPoints));
  },
});
