import type { Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';

/**
 * Access tiers.
 *
 * `pro` is currently granted only by a Season Pass row. When the monthly
 * subscription lands, `resolvePlan` gains a second source and nothing outside
 * this file has to change: every gate in the app asks for a plan, never for a
 * pass.
 */
export type Plan = 'free' | 'pro';

export type LeagueLimits = {
  maxPrivateLeaguesCreated: number;
  maxPrivateLeaguesJoined: number;
  maxPublicLeaguesCreated: number;
  maxPublicLeaguesJoined: number;
};

/**
 * Free players get one public league of their own. It is the cheapest growth
 * lever we have: a public league is a discoverable, shareable surface, and
 * gating it behind payment meant nobody ever created one.
 */
export const PLAN_LEAGUE_LIMITS: Record<Plan, LeagueLimits> = {
  free: {
    maxPrivateLeaguesCreated: 5,
    maxPrivateLeaguesJoined: 5,
    maxPublicLeaguesCreated: 1,
    maxPublicLeaguesJoined: 5,
  },
  pro: {
    maxPrivateLeaguesCreated: 50,
    maxPrivateLeaguesJoined: Number.POSITIVE_INFINITY,
    maxPublicLeaguesCreated: 5,
    maxPublicLeaguesJoined: Number.POSITIVE_INFINITY,
  },
};

/**
 * Whether a user has used up the leagues of this visibility they may create.
 * `Number.POSITIVE_INFINITY` limits never trip.
 */
export function isLeagueCreateLimitReached(
  limits: LeagueLimits,
  visibility: 'private' | 'public',
  usage: { createdPrivate: number; createdPublic: number },
): boolean {
  const limit =
    visibility === 'private'
      ? limits.maxPrivateLeaguesCreated
      : limits.maxPublicLeaguesCreated;
  const created =
    visibility === 'private' ? usage.createdPrivate : usage.createdPublic;

  return Number.isFinite(limit) && created >= limit;
}

export async function hasSeasonPassForSeason(
  ctx: MutationCtx | QueryCtx,
  userId: Id<'users'>,
  season: number,
): Promise<boolean> {
  const pass = await ctx.db
    .query('userSeasonPasses')
    .withIndex('by_user_season', (q) =>
      q.eq('userId', userId).eq('season', season),
    )
    .unique();

  return !!pass;
}

/**
 * The single place that decides whether a user is on the paid tier. Add the
 * subscription lookup here, not at the call sites.
 */
export async function resolvePlan(
  ctx: MutationCtx | QueryCtx,
  userId: Id<'users'>,
  season: number,
): Promise<Plan> {
  if (await hasSeasonPassForSeason(ctx, userId, season)) {
    return 'pro';
  }

  return 'free';
}

export async function getLeagueEntitlement(
  ctx: MutationCtx | QueryCtx,
  userId: Id<'users'>,
  season: number,
): Promise<{ plan: Plan; isPro: boolean; limits: LeagueLimits }> {
  const plan = await resolvePlan(ctx, userId, season);

  return {
    plan,
    isPro: plan === 'pro',
    limits: PLAN_LEAGUE_LIMITS[plan],
  };
}
