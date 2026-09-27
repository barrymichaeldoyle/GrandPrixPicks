import type { WithoutSystemFields } from 'convex/server';

import type { Doc, Id } from '../_generated/dataModel';
import type { DatabaseReader, MutationCtx } from '../_generated/server';

/**
 * The feed's order: race weekend first, then arrival time within it.
 *
 * Pure arrival order split weekends apart. A Baku story published after the
 * first Sepang news landed between two Sepang cards, so the stream read
 * Sepang, Baku, Sepang, with a chequered split either side of the stray card.
 * Keying the weekend first drops a late story to the top of its own weekend's
 * block instead, under everything from the weekends after it.
 *
 * A string so the index orders it as written: `2026-15:1790442838858`. The
 * round is padded to two digits and the timestamp to thirteen, which keeps
 * lexical order equal to numeric order for any date this app will see.
 *
 * `createdAt` stays the time the card shows. Only the order changes.
 */
export function formatFeedSort(
  weekend: { season: number; round: number },
  createdAt: number,
): string {
  const round = String(weekend.round).padStart(2, '0');
  const at = String(createdAt).padStart(13, '0');
  return `${weekend.season}-${round}:${at}`;
}

/** The weekend half of a sort key: `2026-15`. */
export function feedSortWeekend(feedSort: string): string {
  return feedSort.slice(0, feedSort.indexOf(':'));
}

type SortableEvent = {
  raceId?: Id<'races'>;
  season?: number;
  round?: number;
  createdAt: number;
};

/**
 * The sort key for an event about to be written.
 *
 * A race-bound event belongs to its race. A line-up change names its round.
 * Anything else, a story about no race in particular, belongs to the weekend
 * at the top of the feed when it arrives, which is where a reader expects the
 * newest thing to be.
 */
export async function feedSortFor(
  ctx: { db: DatabaseReader },
  event: SortableEvent,
): Promise<string> {
  if (event.raceId !== undefined) {
    const race = await ctx.db.get(event.raceId);
    if (race) {
      return formatFeedSort(race, event.createdAt);
    }
  }
  if (event.season !== undefined && event.round !== undefined) {
    return formatFeedSort(
      { season: event.season, round: event.round },
      event.createdAt,
    );
  }
  const top = await ctx.db
    .query('feedEvents')
    .withIndex('by_feed_sort')
    .order('desc')
    .first();
  const weekend = top?.feedSort ? feedSortWeekend(top.feedSort) : '0000-00';
  return `${weekend}:${String(event.createdAt).padStart(13, '0')}`;
}

/**
 * Every feed write goes through here, so no event reaches the table without
 * the key the feed is read by. An event without one sorts below every event
 * that has one.
 */
export async function insertFeedEvent(
  ctx: MutationCtx,
  event: Omit<WithoutSystemFields<Doc<'feedEvents'>>, 'feedSort'>,
): Promise<Id<'feedEvents'>> {
  const feedSort = await feedSortFor(ctx, event);
  return await ctx.db.insert('feedEvents', { ...event, feedSort });
}
