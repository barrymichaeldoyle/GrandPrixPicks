import type { Id } from '../_generated/dataModel';
import type { QueryCtx } from '../_generated/server';

/**
 * Where one player finished among everyone who scored that weekend.
 *
 * Shared by the race page's rank line and the lapsed reminder's "last time
 * out" line. Null when nobody has been scored yet, or this player was not
 * among them.
 */
export async function rankWithinRace(
  ctx: QueryCtx,
  raceId: Id<'races'>,
  userId: Id<'users'>,
): Promise<{ position: number; totalPlayers: number } | null> {
  const pointsByUser = new Map<string, number>();
  for await (const score of ctx.db
    .query('scores')
    .withIndex('by_race_session', (q) => q.eq('raceId', raceId))) {
    pointsByUser.set(
      score.userId,
      (pointsByUser.get(score.userId) ?? 0) + score.points,
    );
  }
  const own = pointsByUser.get(userId);
  if (own === undefined) {
    return null;
  }
  let higher = 0;
  for (const points of pointsByUser.values()) {
    if (points > own) {
      higher++;
    }
  }
  return { position: higher + 1, totalPlayers: pointsByUser.size };
}

/** How many race weekends this player has been scored in, ever. */
export async function roundsScored(
  ctx: QueryCtx,
  userId: Id<'users'>,
): Promise<number> {
  const races = new Set<Id<'races'>>();
  for await (const score of ctx.db
    .query('scores')
    .withIndex('by_user', (q) => q.eq('userId', userId))) {
    races.add(score.raceId);
  }
  return races.size;
}
