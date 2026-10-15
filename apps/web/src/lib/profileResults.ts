import type { FeedEvent } from '@/components/FeedItem/types';

export type ProfileWeekendResults = {
  key: string;
  raceName: string;
  raceSlug?: string;
  events: FeedEvent[];
  combinedPoints: number;
};

/** One current score per session. Amendments replace the earlier receipt. */
export function groupProfileResults(
  events: FeedEvent[],
): ProfileWeekendResults[] {
  const weekends = new Map<string, ProfileWeekendResults>();
  const sessions = new Set<string>();
  for (const event of [...events].sort(
    (a, b) =>
      b.createdAt - a.createdAt ||
      Number(b.type === 'results_amended') -
        Number(a.type === 'results_amended'),
  )) {
    if (event.type !== 'score_published' && event.type !== 'results_amended') {
      continue;
    }
    const key = event.raceId ?? event.raceSlug ?? event._id;
    const sessionKey = `${key}:${event.sessionType ?? event._id}`;
    if (sessions.has(sessionKey)) {
      continue;
    }
    sessions.add(sessionKey);
    let weekend = weekends.get(key);
    if (!weekend) {
      weekend = {
        key,
        raceName: event.raceName ?? 'Race weekend',
        raceSlug: event.raceSlug,
        events: [],
        combinedPoints: 0,
      };
      weekends.set(key, weekend);
    }
    weekend.events.push(event);
    weekend.combinedPoints +=
      (event.points ?? 0) + (event.h2hScore?.points ?? 0);
  }
  return [...weekends.values()];
}
