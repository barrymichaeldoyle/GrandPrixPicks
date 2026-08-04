import type { NotificationFilter } from '@grandprixpicks/shared/notifications';
import { Flame, Inbox, Lock, Megaphone, Trophy } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import type { Notification } from '@/components/NotificationItem';

/**
 * Presentation for each filter. The filter *values* and the notification types
 * behind them live in `@grandprixpicks/shared/notifications`, because the query
 * applies them — see the note there. This file only decides what they look
 * like.
 */
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

/** What the rails show before the counts query answers. */
export const EMPTY_NOTIFICATION_FILTER_COUNTS: NotificationFilterCounts = {
  all: { total: 0, unread: 0 },
  reactions: { total: 0, unread: 0 },
  results: { total: 0, unread: 0 },
  locked: { total: 0, unread: 0 },
  announcements: { total: 0, unread: 0 },
};

/**
 * The counts are taken over a bounded window of history, so past that window a
 * badge is a floor rather than a total. Say so with a "+" instead of printing
 * a precise-looking number that is quietly short.
 */
export function formatNotificationCount(
  count: number,
  truncated: boolean,
): string {
  return truncated ? `${count}+` : `${count}`;
}
