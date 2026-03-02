import { query } from './_generated/server';

export const listDrivers = query({
  args: {},
  handler: async (ctx) => {
    // Simple alphabetical list for MVP
    const drivers = await ctx.db.query('drivers').collect();
    return drivers.sort((a, b) => a.displayName.localeCompare(b.displayName));
  },
});
