import { Flame, Inbox, Lock, Megaphone, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { Notification } from '@/components/NotificationItem';

export type NotificationFilter =
  | 'all'
  | 'reactions'
  | 'results'
  | 'locked'
  | 'announcements';

export const NOTIFICATION_FILTERS: {
  value: NotificationFilter;
  label: string;
  /** Shorter wording for the mobile chip row. */
  shortLabel: string;
  icon: LucideIcon;
}[] = [
  { value: 'all', label: 'All notifications', shortLabel: 'All', icon: Inbox },
  {
    value: 'reactions',
    label: 'Reactions',
    shortLabel: 'Reactions',
    icon: Flame,
  },
  { value: 'results', label: 'Results', shortLabel: 'Results', icon: Trophy },
  {
    value: 'locked',
    label: 'Session locks',
    shortLabel: 'Locks',
    icon: Lock,
  },
  {
    value: 'announcements',
    label: 'Announcements',
    shortLabel: 'News',
    icon: Megaphone,
  },
];

export function isNotificationFilter(
  value: unknown,
): value is NotificationFilter {
  return (
    value === 'all' ||
    value === 'reactions' ||
    value === 'results' ||
    value === 'locked' ||
    value === 'announcements'
  );
}

export function matchesNotificationFilter(
  notification: Notification,
  filter: NotificationFilter,
): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'reactions':
      return notification.type === 'rev_received';
    case 'results':
      return (
        notification.type === 'results_published' ||
        notification.type === 'results_amended'
      );
    case 'locked':
      return notification.type === 'session_locked';
    case 'announcements':
      return notification.type === 'announcement';
  }
}

/**
 * Collapses reaction rows that describe the same feed event into one.
 *
 * The server groups reactions within a page, so a busy thread whose rows
 * straddle a page boundary comes back twice. Rows arrive newest-first: the
 * first occurrence keeps its position, later ones fold their actors into it.
 */
export function mergeNotificationPages(
  notifications: Notification[],
): Notification[] {
  // Index into `merged` rather than a reference: query results are reused
  // across renders, so the merge has to build new objects instead of mutating
  // the ones Convex handed over.
  const indexByFeedEvent = new Map<string, number>();
  const merged: Notification[] = [];

  for (const notification of notifications) {
    if (notification.type !== 'rev_received' || !notification.feedEventId) {
      merged.push(notification);
      continue;
    }

    const key = String(notification.feedEventId);
    const index = indexByFeedEvent.get(key);
    if (index === undefined) {
      indexByFeedEvent.set(key, merged.length);
      merged.push({
        ...notification,
        actors: [...(notification.actors ?? [])],
      });
      continue;
    }

    const existing = merged[index];
    const seenActors = new Set(
      (existing.actors ?? []).map((actor) => String(actor.userId)),
    );
    const actors = [
      ...(existing.actors ?? []),
      ...(notification.actors ?? []).filter(
        (actor) => !seenActors.has(String(actor.userId)),
      ),
    ];
    merged[index] = {
      ...existing,
      actors,
      totalReactionCount: actors.length,
      totalRevCount: actors.length,
      // Unread anywhere in the thread means the merged row is unread.
      readAt: notification.readAt ? existing.readAt : undefined,
    };
  }

  return merged;
}

export type NotificationFilterCounts = Record<
  NotificationFilter,
  { total: number; unread: number }
>;

export function countNotificationsByFilter(
  notifications: Notification[],
): NotificationFilterCounts {
  const counts = {
    all: { total: 0, unread: 0 },
    reactions: { total: 0, unread: 0 },
    results: { total: 0, unread: 0 },
    locked: { total: 0, unread: 0 },
    announcements: { total: 0, unread: 0 },
  } satisfies NotificationFilterCounts;

  for (const notification of notifications) {
    const unread = !notification.readAt;
    for (const { value } of NOTIFICATION_FILTERS) {
      if (matchesNotificationFilter(notification, value)) {
        counts[value].total += 1;
        if (unread) {
          counts[value].unread += 1;
        }
      }
    }
  }

  return counts;
}
