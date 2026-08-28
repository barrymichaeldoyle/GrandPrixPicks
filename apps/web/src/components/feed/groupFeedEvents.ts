type Groupable = {
  _id: string;
  type: string;
  raceId?: string;
  sessionType?: string;
};

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
 * News groups by adjacency. The feed's order carries meaning for news, and a
 * keyed group would lift a Friday item up beside a Sunday one to sit under a
 * shared heading, silently reordering the weekend. A run is only a run while
 * nothing interrupts it.
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
      const key = `${event.raceId}_${event.sessionType}`;
      let group = sessionGroups.get(key);
      if (!group) {
        group = { kind: 'session', key, events: [] };
        sessionGroups.set(key, group);
        groups.push(group);
      }
      group.events.push(event);
      continue;
    }

    if (event.type === 'race_news') {
      const previous = groups.at(-1);
      if (previous?.kind === 'news') {
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
