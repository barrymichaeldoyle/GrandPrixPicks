import type { SessionType } from '@grandprixpicks/shared/sessions';
import { getSessionsForWeekend } from '@grandprixpicks/shared/sessions';
import { v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';
import { query } from './_generated/server';
import { loadStintsForSeason, teamForRound } from './lib/lineups';

const sessionTypeValidator = v.union(
  v.literal('quali'),
  v.literal('sprint_quali'),
  v.literal('sprint'),
  v.literal('race'),
);

/**
 * Below this many entrants there is no crowd, only a handful of people, and a
 * percentage drawn from four players says nothing a reader can use. The page
 * renders nothing rather than a statistic that would be noise.
 */
const MIN_ENTRANTS = 5;

/**
 * Ceiling on predictions read for one session.
 *
 * Convex caps a query at 16384 documents, and this reads one row per entrant
 * plus the roster. The cap is here so a session that somehow exceeds it
 * degrades to a sample instead of throwing, and `sampled` says so rather than
 * letting the page present a partial count as a total.
 */
const MAX_PREDICTIONS = 4000;

/** A pick in slot 1 is worth 5, slot 5 is worth 1. */
function slotWeight(slot: number): number {
  return 6 - slot;
}

function lockAtFor(race: Doc<'races'>, sessionType: SessionType) {
  return {
    quali: race.qualiLockAt,
    sprint_quali: race.sprintQualiLockAt,
    sprint: race.sprintLockAt,
    race: race.predictionLockAt,
  }[sessionType];
}

/**
 * How everyone picked a session, once nobody can still pick it.
 *
 * This is the one thing on the site that exists nowhere else: the finishing
 * order a few hundred people expected, which is a different fact from the
 * order that happened and is not published by anyone who covers the sport.
 * Every other page here explains Formula 1, a subject already covered by
 * better-established sites; this reports something only we hold.
 *
 * It is deliberately gated on the lock, not on results. Before the deadline
 * this is the answer sheet: showing which driver 78% of players put in P1
 * would turn picking into copying and flatten the leaderboard it feeds. After
 * the deadline it costs nobody anything, and it is at its most interesting
 * before the session runs, when it is still a question.
 *
 * `pickRate` is the share of entrants who put the driver anywhere in their
 * five. `consensusPosition` ranks by the weighted slots instead, so a driver
 * everyone puts second outranks one everyone puts fifth even at equal reach.
 *
 * Returns null when the session has not locked, when nobody entered, or when
 * too few did to mean anything.
 */
export const getSessionConsensus = query({
  args: {
    raceId: v.id('races'),
    sessionType: sessionTypeValidator,
  },
  handler: async (ctx, args) => {
    const race = await ctx.db.get(args.raceId);
    if (!race) {
      return null;
    }
    return await sessionConsensus(ctx, race, args.sessionType);
  },
});

/**
 * Every locked session of a weekend, keyed by slug.
 *
 * The race page asks for one session at a time because it is already holding
 * the race document and needs each session separately anyway. An editorial
 * write-up is not: it knows a slug and nothing else, so asking per session
 * would cost it a wave to resolve the race before it could even name the
 * sessions. Answering the whole weekend from the slug keeps those pages at one
 * round trip, which is what lets the archive render in SSR HTML.
 *
 * Sessions that have not locked are absent rather than null, so a caller can
 * render what it gets without filtering.
 */
export const getWeekendConsensusForRaceSlug = query({
  args: { raceSlug: v.string() },
  handler: async (ctx, args) => {
    const race = await ctx.db
      .query('races')
      .withIndex('by_slug', (q) => q.eq('slug', args.raceSlug))
      .unique();
    if (!race) {
      return {};
    }
    const sessions = getSessionsForWeekend(race.hasSprint ?? false);
    const entries = await Promise.all(
      sessions.map(
        async (sessionType) =>
          [
            sessionType,
            await sessionConsensus(ctx, race, sessionType),
          ] as const,
      ),
    );
    return Object.fromEntries(
      entries.filter(([, consensus]) => consensus != null),
    ) as Partial<
      Record<
        SessionType,
        NonNullable<Awaited<ReturnType<typeof sessionConsensus>>>
      >
    >;
  },
});

async function sessionConsensus(
  ctx: QueryCtx,
  race: Doc<'races'>,
  sessionType: SessionType,
) {
  const lockAt = lockAtFor(race, sessionType);
  if (lockAt == null || Date.now() < lockAt) {
    return null;
  }

  const predictions = await ctx.db
    .query('predictions')
    .withIndex('by_race_session', (q) =>
      q.eq('raceId', race._id).eq('sessionType', sessionType),
    )
    .take(MAX_PREDICTIONS);

  const entrants = predictions.length;
  if (entrants < MIN_ENTRANTS) {
    return null;
  }

  // driverId -> how many entrants placed them in each slot
  const slotsByDriver = new Map<string, number[]>();
  for (const prediction of predictions) {
    prediction.picks.forEach((driverId, index) => {
      const key = driverId as string;
      const slots = slotsByDriver.get(key) ?? [0, 0, 0, 0, 0];
      // A malformed row with more than five picks cannot widen the array.
      if (index < 5) {
        slots[index] += 1;
        slotsByDriver.set(key, slots);
      }
    });
  }

  // Round-scoped, so a driver who has since changed team still renders in
  // the colours they raced this round in. See `lib/lineups.ts`.
  const stints = await loadStintsForSeason(ctx, race.season);

  const rows = await Promise.all(
    Array.from(slotsByDriver.entries()).map(async ([key, slots]) => {
      const driverId = key as Id<'drivers'>;
      const driver = await ctx.db.get(driverId);
      const picks = slots.reduce((total, count) => total + count, 0);
      const weight = slots.reduce(
        (total, count, index) => total + count * slotWeight(index + 1),
        0,
      );
      return {
        driverId,
        code: driver?.code ?? '???',
        displayName: driver?.displayName ?? 'Unknown',
        number: driver?.number ?? null,
        nationality: driver?.nationality ?? null,
        team:
          teamForRound(stints, driverId, race.round) ?? driver?.team ?? null,
        slots,
        picks,
        // Rounded for display; the ordering below uses the raw weight.
        pickRate: Math.round((picks / entrants) * 1000) / 10,
        weight,
      };
    }),
  );

  // Ties broken by reach, then by code, so the order is stable across reads
  // rather than following whatever the index happened to return.
  rows.sort(
    (a, b) =>
      b.weight - a.weight || b.picks - a.picks || a.code.localeCompare(b.code),
  );

  return {
    entrants,
    lockAt,
    sampled: entrants === MAX_PREDICTIONS,
    drivers: rows.map(({ weight: _weight, ...row }, index) => ({
      ...row,
      consensusPosition: index + 1,
    })),
  };
}
