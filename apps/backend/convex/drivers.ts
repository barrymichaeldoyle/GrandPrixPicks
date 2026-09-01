import {
  lineupRoundForCalendarRound,
  markPendingEntryDrivers,
  pendingEntrySlugForCalendarRound,
} from '@grandprixpicks/shared/pendingEntry';
import { compareDriversByTeam } from '@grandprixpicks/shared/teams';
import { v } from 'convex/values';

import { query } from './_generated/server';
import { loadConstructorPoints } from './f1Standings';
import {
  annotateRosterForRound,
  loadStintsForSeason,
  rosterForRound,
} from './lib/lineups';
import { getCurrentSeasonAndRound } from './lib/season';

export const listDrivers = query({
  args: {
    /**
     * Which round's grid to return. Callers rendering a specific race should
     * pass that race's round; omitting it answers for the next race, which is
     * what the pick pool wants.
     */
    round: v.optional(v.number()),
    season: v.optional(v.number()),
    /**
     * Also return drivers who are not racing this round, each flagged
     * `racing: false`. For callers that have to resolve a SAVED pick, which
     * may name a driver who has since lost their seat: dropping them turns a
     * complete set of five picks into four rendered slots, and a complete set
     * of duels into an unsaveable one.
     *
     * Such a caller must build its pick pool by filtering on `racing`.
     * Off by default so a caller that only needs the pool cannot leak a
     * driver who is not in a car into it.
     */
    includeNotRacing: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const current = await getCurrentSeasonAndRound(ctx);
    const season = args.season ?? current.season;
    const requestedRound = args.round ?? current.round;
    const round = lineupRoundForCalendarRound(season, requestedRound);

    // Sized for the whole table, not for a grid: every driver who has raced
    // this season has a row, including ones no longer in a seat, and the round
    // filter below is what narrows it to 20-odd. Truncating here would drop
    // drivers out of the pick pool silently.
    const drivers = await ctx.db
      .query('drivers')
      .withIndex('by_displayName')
      .take(60);

    // The roster is resolved as it stood in this round, so an injured driver
    // drops out of the pool for the rounds he misses and his stand-in appears
    // in his place — without either of them being deleted, which would break
    // every result that already references them. A past race page asking for
    // its own round therefore still shows the grid that actually raced it,
    // each driver under the team they drove for at the time.
    const stints = await loadStintsForSeason(ctx, season);
    const roster = args.includeNotRacing
      ? annotateRosterForRound(drivers, stints, round)
      : rosterForRound(drivers, stints, round);

    const resolvedSlug = pendingEntrySlugForCalendarRound(
      season,
      requestedRound,
    );
    const resolved = resolvedSlug
      ? markPendingEntryDrivers(resolvedSlug, roster)
      : roster;

    // The index gives alphabetical order, so both apps re-sorted this by hand
    // into team order and had to agree on the tie-breaks to stay in step.
    // Sorting here means the pool, the duel grid and the feed all come out of
    // the same championship, and a scored race moves them together.
    const teamPoints = await loadConstructorPoints(ctx, season);
    return resolved.sort((a, b) => compareDriversByTeam(a, b, teamPoints));
  },
});
