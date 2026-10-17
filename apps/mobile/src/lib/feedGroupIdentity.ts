import type { FeedGroup } from '@grandprixpicks/shared/feedGroups';

type Keyed = { _id: string };

/**
 * The list key of a feed block. One place for it: the list's `keyExtractor`
 * and the identity reuse below must agree, or a block keeps its key and loses
 * its memoised row anyway.
 */
export function feedGroupKey<T extends Keyed>(group: FeedGroup<T>): string {
  if (group.kind === 'standalone') {
    return String(group.event._id);
  }
  if (group.kind === 'news') {
    return `news-${group.events[0]?._id}`;
  }
  return group.key;
}

/**
 * Keep the previous block object wherever the new one is the same block.
 *
 * `groupFeedEvents` builds fresh objects on every call, so appending a page
 * or a live update to one event used to hand the list a brand-new object for
 * every block on screen, and every memoised row re-rendered at once. Scrolling
 * through that re-render is what showed as blank cells and a stutter. Convex
 * keeps an event's identity until that event changes, so a block whose events
 * are the very same objects is the same block: return the old one and its row
 * stays untouched.
 */
export function reuseFeedGroups<T extends Keyed>(
  previous: ReadonlyArray<FeedGroup<T>>,
  next: FeedGroup<T>[],
): FeedGroup<T>[] {
  if (previous.length === 0) {
    return next;
  }
  const byKey = new Map(previous.map((group) => [feedGroupKey(group), group]));
  let changed = previous.length !== next.length;
  const merged = next.map((group, index) => {
    const old = byKey.get(feedGroupKey(group));
    const reused = old !== undefined && sameGroup(old, group) ? old : group;
    if (reused !== previous[index]) {
      changed = true;
    }
    return reused;
  });
  return changed ? merged : (previous as FeedGroup<T>[]);
}

function sameGroup<T extends Keyed>(a: FeedGroup<T>, b: FeedGroup<T>): boolean {
  if (a.kind !== b.kind) {
    return false;
  }
  if (a.kind === 'standalone' || b.kind === 'standalone') {
    return (
      a.kind === 'standalone' && b.kind === 'standalone' && a.event === b.event
    );
  }
  return (
    a.events.length === b.events.length &&
    a.events.every((event, index) => event === b.events[index])
  );
}
