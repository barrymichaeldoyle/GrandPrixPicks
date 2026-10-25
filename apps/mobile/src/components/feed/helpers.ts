import type { FeedEvent } from './types';
export { formatRelativeTime } from '@grandprixpicks/shared/dates';

export function eventTotalPoints(event: FeedEvent): number {
  return (event.points ?? 0) + (event.h2hScore?.points ?? 0);
}
