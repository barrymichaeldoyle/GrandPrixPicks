import type { Doc, Id } from '../_generated/dataModel';
import type { MutationCtx, QueryCtx } from '../_generated/server';
import { wantsPushPredictionReminders } from './notificationChannels';
export type Session = 'quali' | 'sprint_quali' | 'sprint' | 'race';
export function sessionLocks(
  race: Doc<'races'>,
): Array<{ sessionType: Session; lockAt: number }> {
  const rows: Array<{ sessionType: Session; lockAt: number | undefined }> = [
    { sessionType: 'quali', lockAt: race.qualiLockAt },
    { sessionType: 'race', lockAt: race.predictionLockAt },
    ...(race.hasSprint
      ? [
          {
            sessionType: 'sprint_quali' as const,
            lockAt: race.sprintQualiLockAt,
          },
          { sessionType: 'sprint' as const, lockAt: race.sprintLockAt },
        ]
      : []),
  ];
  return rows
    .filter(
      (row): row is { sessionType: Session; lockAt: number } =>
        row.lockAt !== undefined,
    )
    .sort((a, b) => a.lockAt - b.lockAt);
}
export async function missingPicks(
  ctx: MutationCtx | QueryCtx,
  userId: Id<'users'>,
  race: Doc<'races'>,
  now: number,
  sessionType?: Session,
) {
  const sessions = sessionLocks(race).filter(
    (s) => s.lockAt > now && (!sessionType || s.sessionType === sessionType),
  );
  const [top5, h2h, matchups] = await Promise.all([
    ctx.db
      .query('predictions')
      .withIndex('by_user_race_session', (q) =>
        q.eq('userId', userId).eq('raceId', race._id),
      )
      .take(4),
    ctx.db
      .query('h2hPredictions')
      .withIndex('by_user_race_session', (q) =>
        q.eq('userId', userId).eq('raceId', race._id),
      )
      .take(100),
    ctx.db
      .query('h2hMatchups')
      .withIndex('by_season', (q) => q.eq('season', race.season))
      .take(100),
  ]);
  const active = matchups.filter(
    (m) =>
      (m.fromRound ?? 1) <= race.round &&
      (m.toRound === undefined || m.toRound >= race.round),
  );
  return sessions.some(
    (s) =>
      !top5.some((p) => p.sessionType === s.sessionType) ||
      active.some(
        (m) =>
          !h2h.some(
            (p) => p.sessionType === s.sessionType && p.matchupId === m._id,
          ),
      ),
  );
}
export async function healthyReminderPush(
  ctx: MutationCtx | QueryCtx,
  user: Doc<'users'>,
  now: number,
) {
  if (!wantsPushPredictionReminders(user)) {
    return false;
  }
  const [web, native] = await Promise.all([
    ctx.db
      .query('pushSubscriptions')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .take(20),
    ctx.db
      .query('expoPushTokens')
      .withIndex('by_user', (q) => q.eq('userId', user._id))
      .take(20),
  ]);
  return (
    web.length > 0 ||
    native.some((t) => (t.refreshedAt ?? t.createdAt) > now - 30 * 86400000)
  );
}
