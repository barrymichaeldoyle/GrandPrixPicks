import type { NotificationFilter } from '@grandprixpicks/shared/notifications';
import { Inbox, Lock, Megaphone, Trophy } from 'lucide-react';
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

export function mergeNotificationPages(notifications: Notification[]) {
  return notifications;
}

export type NotificationFilterCounts = Record<
  NotificationFilter,
  { total: number; unread: number }
>;

/** What the rails show before the counts query answers. */
export const EMPTY_NOTIFICATION_FILTER_COUNTS: NotificationFilterCounts = {
  all: { total: 0, unread: 0 },
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
