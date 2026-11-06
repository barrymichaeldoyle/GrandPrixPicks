import type { SessionType } from '@grandprixpicks/shared/sessions';
import { v } from 'convex/values';

import type { Doc, Id } from './_generated/dataModel';
import type { QueryCtx } from './_generated/server';
import { query } from './_generated/server';
import { calendarRaces } from './lib/calendarRaces';
import { streamRankedLeaderboardRows } from './lib/leaderboard';
import { loadStintsForSeason, teamForRound } from './lib/lineups';
import { getCurrentSeason } from './lib/season';
import { toUserIdentity } from './lib/userIdentity';
import { rankWithinRace } from './lib/weekendRank';

/** More rounds than any season has had; the calendar read is bounded by it. */
const MAX_ROUNDS = 40;

type WeekendRecap = {
  raceId: Id<'races'>;
  raceSlug: string;
  raceName: string;
  round: number;
  /** Top 5 points across every scored session of the weekend. */
  points: number;
  rank: number | null;
  players: number;
};

type SessionRecap = {
  raceSlug: string;
  raceName: string;
  round: number;
  sessionType: SessionType;
  points: number;
};

type DriverRecap = {
  code: string;
  name: string;
  team: string | null;
  timesPicked: number;
  timesInTopFive: number;
};

export type SeasonRecap = {
  season: number;
  /** Every non-cancelled calendar race of the season has a finished status. */
  seasonComplete: boolean;
  roundsInSeason: number;
  roundsFinished: number;
  player: {
    username?: string;
    displayName?: string;
    avatarUrl?: string;
  };
  topFive: {
    points: number;
    rank: number | null;
    players: number;
    weekendsScored: number;
    sessionsScored: number;
    /** Picks placed on the exact finishing position (5 pts). */
    exactPicks: number;
    /** Picks one place off (3 pts). */
    nearPicks: number;
    /** Picks whose driver finished in the top 5, two or more places off (1 pt). */
    topFivePicks: number;
    totalPicks: number;
    /** Sessions where the P1 pick won. */
    winnerCalls: number;
  };
  h2h: {
    points: number;
    rank: number | null;
    players: number;
    correct: number;
    total: number;
  } | null;
  bestWeekend: WeekendRecap | null;
  bestSession: SessionRecap | null;
  mostBacked: DriverRecap | null;
  weekends: WeekendRecap[];
};

/**
 * One player's season in numbers, for the recap page and its share card.
 *
 * Everything here is derived from `scores`, which only exist once a result is
 * published, so nothing leaks a pick before its session locks and the payload
 * is safe to serve to a crawler. The one thing it reads outside the scored
 * record is the lineup table, to colour the most-backed driver in the team
 * they were actually driving for.
 */
export async function loadSeasonRecap(
  ctx: QueryCtx,
  user: Doc<'users'>,
  season: number,
): Promise<SeasonRecap> {
  const seasonRaces = calendarRaces(
    await ctx.db
      .query('races')
      .withIndex('by_season_round', (q) => q.eq('season', season))
      .take(MAX_ROUNDS),
  ).filter((race) => race.status !== 'cancelled');
  const raceById = new Map(seasonRaces.map((race) => [race._id, race]));
  const roundsFinished = seasonRaces.filter(
    (race) => race.status === 'finished',
  ).length;

  const scores: Doc<'scores'>[] = [];
  for await (const score of ctx.db
    .query('scores')
    .withIndex('by_user', (q) => q.eq('userId', user._id))) {
    if (raceById.has(score.raceId)) {
      scores.push(score);
    }
  }

  const pointsByRace = new Map<Id<'races'>, number>();
  let exactPicks = 0;
  let nearPicks = 0;
  let topFivePicks = 0;
  let totalPicks = 0;
  let winnerCalls = 0;
  let bestSession: SessionRecap | null = null;
  const pickCounts = new Map<
    Id<'drivers'>,
    { timesPicked: number; timesInTopFive: number; lastRound: number }
  >();

  for (const score of scores) {
    const race = raceById.get(score.raceId)!;
    pointsByRace.set(
      score.raceId,
      (pointsByRace.get(score.raceId) ?? 0) + score.points,
    );
    if (bestSession === null || score.points > bestSession.points) {
      bestSession = {
        raceSlug: race.slug,
        raceName: race.name,
        round: race.round,
        sessionType: score.sessionType,
        points: score.points,
      };
    }
    for (const pick of score.breakdown ?? []) {
      totalPicks++;
      if (pick.points === 5) {
        exactPicks++;
        if (pick.predictedPosition === 1) {
          winnerCalls++;
        }
      } else if (pick.points === 3) {
        nearPicks++;
      } else if (pick.points === 1) {
        topFivePicks++;
      }
      const inTopFive =
        pick.actualPosition !== undefined && pick.actualPosition <= 5;
      const count = pickCounts.get(pick.driverId) ?? {
        timesPicked: 0,
        timesInTopFive: 0,
        lastRound: 0,
      };
      count.timesPicked++;
      if (inTopFive) {
        count.timesInTopFive++;
      }
      count.lastRound = Math.max(count.lastRound, race.round);
      pickCounts.set(pick.driverId, count);
    }
  }

  const weekends: WeekendRecap[] = [];
  for (const [raceId, points] of pointsByRace) {
    const race = raceById.get(raceId)!;
    const rank = await rankWithinRace(ctx, raceId, user._id);
    weekends.push({
      raceId,
      raceSlug: race.slug,
      raceName: race.name,
      round: race.round,
      points,
      rank: rank?.position ?? null,
      players: rank?.totalPlayers ?? 0,
    });
  }
  weekends.sort((a, b) => a.round - b.round);

  let bestWeekend: WeekendRecap | null = null;
  for (const weekend of weekends) {
    if (bestWeekend === null || weekend.points > bestWeekend.points) {
      bestWeekend = weekend;
    }
  }

  let mostBacked: DriverRecap | null = null;
  let mostBackedCount: { timesPicked: number; timesInTopFive: number } | null =
    null;
  let mostBackedId: Id<'drivers'> | null = null;
  let mostBackedRound = 0;
  for (const [driverId, count] of pickCounts) {
    const better =
      mostBackedCount === null ||
      count.timesPicked > mostBackedCount.timesPicked ||
      (count.timesPicked === mostBackedCount.timesPicked &&
        count.timesInTopFive > mostBackedCount.timesInTopFive);
    if (better) {
      mostBackedCount = count;
      mostBackedId = driverId;
      mostBackedRound = count.lastRound;
    }
  }
  if (mostBackedId && mostBackedCount) {
    const driver = await ctx.db.get(mostBackedId);
    if (driver) {
      const stints = await loadStintsForSeason(ctx, season);
      mostBacked = {
        code: driver.code,
        name: driver.displayName,
        team:
          teamForRound(stints, driver._id, mostBackedRound) ??
          driver.team ??
          null,
        timesPicked: mostBackedCount.timesPicked,
        timesInTopFive: mostBackedCount.timesInTopFive,
      };
    }
  }

  const standing = await ctx.db
    .query('seasonStandings')
    .withIndex('by_user_season', (q) =>
      q.eq('userId', user._id).eq('season', season),
    )
    .unique();
  const ranked = await streamRankedLeaderboardRows(
    ctx.db
      .query('seasonStandings')
      .withIndex('by_season_points', (q) => q.eq('season', season))
      .order('desc'),
    { offset: 0, limit: 1, viewerId: user._id },
  );

  let h2h: SeasonRecap['h2h'] = null;
  const h2hStanding = await ctx.db
    .query('h2hSeasonStandings')
    .withIndex('by_user_season', (q) =>
      q.eq('userId', user._id).eq('season', season),
    )
    .unique();
  if (h2hStanding && h2hStanding.totalPicks > 0) {
    const h2hRanked = await streamRankedLeaderboardRows(
      ctx.db
        .query('h2hSeasonStandings')
        .withIndex('by_season_points', (q) => q.eq('season', season))
        .order('desc'),
      { offset: 0, limit: 1, viewerId: user._id },
    );
    h2h = {
      points: h2hStanding.totalPoints,
      rank: h2hRanked.viewerRank,
      players: h2hRanked.totalCount,
      correct: h2hStanding.correctPicks,
      total: h2hStanding.totalPicks,
    };
  }

  return {
    season,
    seasonComplete:
      seasonRaces.length > 0 && roundsFinished === seasonRaces.length,
    roundsInSeason: seasonRaces.length,
    roundsFinished,
    player: toUserIdentity(user),
    topFive: {
      points: standing?.totalPoints ?? 0,
      rank: ranked.viewerRank,
      players: ranked.totalCount,
      weekendsScored: weekends.length,
      sessionsScored: scores.length,
      exactPicks,
      nearPicks,
      topFivePicks,
      totalPicks,
      winnerCalls,
    },
    h2h,
    bestWeekend,
    bestSession,
    mostBacked,
    weekends,
  };
}

/**
 * A player's season recap by username. Public: the profile it hangs off is
 * public, and every figure comes from published results.
 */
export const getSeasonRecap = query({
  args: { username: v.string(), season: v.optional(v.number()) },
  handler: async (ctx, args): Promise<SeasonRecap | null> => {
    const user = await ctx.db
      .query('users')
      .withIndex('by_username', (q) => q.eq('username', args.username))
      .unique();
    if (!user || user.deletingAt !== undefined) {
      return null;
    }
    const season = args.season ?? (await getCurrentSeason(ctx));
    return await loadSeasonRecap(ctx, user, season);
  },
});
