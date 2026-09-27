type Groupable = {
  _id: string;
  type: string;
  raceId?: string;
  sessionType?: string;
};

/**
 * The key a session block is collected under, and the only place its shape is
 * spelled out. Callers that want to find a particular block in the rendered
 * stream — the dashboard slots the picks card under the race result — build the
 * key with this rather than re-deriving the format.
 */
export function sessionGroupKey(raceId: string, sessionType: string): string {
  return `${raceId}_${sessionType}`;
}

export type FeedGroup<T> =
  | { kind: 'session'; key: string; events: T[] }
  | { kind: 'news'; events: T[] }
  | { kind: 'standalone'; event: T };

/**
 * Fold a page of feed events into the blocks the feed renders.
 *
 * Two rules, and they differ on purpose.
 *
 * Sessions group by key: every score for a race and session belongs together
 * wherever it lands in the page, so they collect into one block even when other
 * events fall between them.
 *
 * News and line-up changes group by adjacency. The feed's order carries meaning, and a
 * keyed group would lift a Friday item up beside a Sunday one to sit under a
 * shared heading, silently reordering the weekend. A run is only a run while
 * nothing interrupts it, and a different race interrupts it: the block flies
 * one race's flag, and a Baku story sitting under Sepang's is a Baku story
 * the reader files under the wrong weekend. An item that names no race joins
 * whichever run it lands in.
 */
export function groupFeedEvents<T extends Groupable>(
  events: T[],
): FeedGroup<T>[] {
  const groups: FeedGroup<T>[] = [];
  const sessionGroups = new Map<string, FeedGroup<T> & { kind: 'session' }>();

  for (const event of events) {
    if (
      (event.type === 'score_published' || event.type === 'session_locked') &&
      event.raceId &&
      event.sessionType
    ) {
      const key = sessionGroupKey(event.raceId, event.sessionType);
      let group = sessionGroups.get(key);
      if (!group) {
        group = { kind: 'session', key, events: [] };
        sessionGroups.set(key, group);
        groups.push(group);
      }
      group.events.push(event);
      continue;
    }

    if (event.type === 'race_news' || event.type === 'lineup_change') {
      const previous = groups.at(-1);
      const runRaceId =
        previous?.kind === 'news'
          ? previous.events.find((item) => item.raceId)?.raceId
          : undefined;
      if (
        previous?.kind === 'news' &&
        (!event.raceId || !runRaceId || event.raceId === runRaceId)
      ) {
        previous.events.push(event);
      } else {
        groups.push({ kind: 'news', events: [event] });
      }
      continue;
    }

    groups.push({ kind: 'standalone', event });
  }

  return groups;
}

/**
 * Which blocks in a grouped stream open a new race weekend, in render order.
 *
 * A block belongs to the race its events name. Blocks that name none — joining
 * a league, a streak milestone — belong to whichever weekend they arrived in
 * and never close it: a milestone landing between two Monza sessions would
 * otherwise put a separator on both sides of itself and cut one weekend into
 * three.
 *
 * The first block never opens a weekend. There is nothing above it to separate
 * it from, and a separator at the top of the stream reads as a heading.
 */
export function weekendStarts<T extends Groupable>(
  groups: FeedGroup<T>[],
): boolean[] {
  let open: string | null = null;
  return groups.map((group) => {
    const events = group.kind === 'standalone' ? [group.event] : group.events;
    const raceId = events.find((event) => event.raceId)?.raceId ?? null;
    if (raceId === null) {
      return false;
    }
    const starts = open !== null && raceId !== open;
    open = raceId;
    return starts;
  });
}

/**
 * Newest first, in the order the server pages the feed: race weekend, then
 * arrival time (`feedSort`, written by the backend's `lib/feedSort.ts`). For
 * merging loaded pages back together without undoing that order.
 *
 * An event without a key, written before the backend backfilled one, sorts
 * below every event that has one, as it does on the server.
 */
export function compareFeedOrder(
  a: { feedSort?: string; createdAt: number },
  b: { feedSort?: string; createdAt: number },
): number {
  const aKey = a.feedSort ?? '';
  const bKey = b.feedSort ?? '';
  if (aKey !== bKey) {
    return aKey < bKey ? 1 : -1;
  }
  return b.createdAt - a.createdAt;
}

/**
 * The weekend a news block is headed with, as the event that carries it, or
 * `undefined` when the block has none to claim.
 *
 * Only items that name a race have a say. A story about no race in particular
 * (a possible finale venue, a test drive) sits in whichever weekend it arrived
 * in, and letting it veto the heading turned a block of Baku news into one
 * labelled plain "News". Items that do name a race must all name the same one.
 *
 * Line-up changes carry the race slug but no race ID, so the slug is compared
 * first.
 */
export function newsRunWeekend<
  T extends { raceSlug?: string; raceId?: string; raceName?: string },
>(events: T[]): T | undefined {
  const raced = events.filter((event) => event.raceSlug ?? event.raceId);
  const first = raced[0];
  if (!first) {
    return undefined;
  }
  const key = first.raceSlug ?? first.raceId;
  return raced.every((event) => (event.raceSlug ?? event.raceId) === key)
    ? first
    : undefined;
}
