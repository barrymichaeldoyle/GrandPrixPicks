import { internalMutation } from './_generated/server';

/**
 * One-time migration: remove the `showOnLeaderboard` field from all documents
 * in users, scores, seasonStandings, and h2hSeasonStandings.
 *
 * Run before deploying the schema change that drops this field:
 *   npx convex run migrations:removeShowOnLeaderboard --prod
 */
export const removeShowOnLeaderboard = internalMutation({
  args: {},
  handler: async (ctx) => {
    let patched = 0;

    const users = await ctx.db.query('users').collect();
    for (const doc of users) {
      if ('showOnLeaderboard' in doc) {
        await ctx.db.patch(doc._id, { showOnLeaderboard: undefined });
        patched++;
      }
    }

    const scores = await ctx.db.query('scores').collect();
    for (const doc of scores) {
      if ('showOnLeaderboard' in doc) {
        await ctx.db.patch(doc._id, { showOnLeaderboard: undefined });
        patched++;
      }
    }

    const seasonStandings = await ctx.db.query('seasonStandings').collect();
    for (const doc of seasonStandings) {
      if ('showOnLeaderboard' in doc) {
        await ctx.db.patch(doc._id, { showOnLeaderboard: undefined });
        patched++;
      }
    }

    const h2hStandings = await ctx.db.query('h2hSeasonStandings').collect();
    for (const doc of h2hStandings) {
      if ('showOnLeaderboard' in doc) {
        await ctx.db.patch(doc._id, { showOnLeaderboard: undefined });
        patched++;
      }
    }

    return { patched };
  },
});
