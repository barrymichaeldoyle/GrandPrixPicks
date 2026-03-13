import { internalMutation } from './_generated/server';

/**
 * One-time migration: remove the `showOnLeaderboard` field from all documents
 * in users, scores, seasonStandings, and h2hSeasonStandings.
 *
 * Step 1 — deploy with showOnLeaderboard still in schema (TODO comments), then run:
 *   npx convex run migrations:removeShowOnLeaderboard --prod
 *
 * Step 2 — remove the TODO schema fields and redeploy.
 */
export const removeShowOnLeaderboard = internalMutation({
  args: {},
  handler: async (ctx) => {
    let patched = 0;

    const users = await ctx.db.query('users').collect();
    for (const doc of users) {
      if (doc.showOnLeaderboard !== undefined) {
        await ctx.db.patch(doc._id, { showOnLeaderboard: undefined });
        patched++;
      }
    }

    const scores = await ctx.db.query('scores').collect();
    for (const doc of scores) {
      if (doc.showOnLeaderboard !== undefined) {
        await ctx.db.patch(doc._id, { showOnLeaderboard: undefined });
        patched++;
      }
    }

    const seasonStandings = await ctx.db.query('seasonStandings').collect();
    for (const doc of seasonStandings) {
      if (doc.showOnLeaderboard !== undefined) {
        await ctx.db.patch(doc._id, { showOnLeaderboard: undefined });
        patched++;
      }
    }

    const h2hStandings = await ctx.db.query('h2hSeasonStandings').collect();
    for (const doc of h2hStandings) {
      if (doc.showOnLeaderboard !== undefined) {
        await ctx.db.patch(doc._id, { showOnLeaderboard: undefined });
        patched++;
      }
    }

    return { patched };
  },
});
