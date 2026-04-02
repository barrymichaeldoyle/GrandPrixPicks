import { query } from './_generated/server';

export const listDrivers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query('drivers')
      .withIndex('by_displayName')
      .take(30);
  },
});
