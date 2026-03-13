import type { Id } from '../_generated/dataModel';
import type { MutationCtx } from '../_generated/server';

/** Sync denormalized user fields to all standings and score rows for this user. */
export async function syncUserToStandings(
  ctx: MutationCtx,
  userId: Id<'users'>,
  fields: {
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    showOnLeaderboard?: boolean;
  },
) {
  const seasonRows = await ctx.db
    .query('seasonStandings')
    .withIndex('by_user_season', (q) => q.eq('userId', userId))
    .collect();
  for (const row of seasonRows) {
    await ctx.db.patch(row._id, fields);
  }

  const h2hRows = await ctx.db
    .query('h2hSeasonStandings')
    .withIndex('by_user_season', (q) => q.eq('userId', userId))
    .collect();
  for (const row of h2hRows) {
    await ctx.db.patch(row._id, fields);
  }

  const scoreRows = await ctx.db
    .query('scores')
    .withIndex('by_user', (q) => q.eq('userId', userId))
    .collect();
  for (const row of scoreRows) {
    await ctx.db.patch(row._id, fields);
  }
}
