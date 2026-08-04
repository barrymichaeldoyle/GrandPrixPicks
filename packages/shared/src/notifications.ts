/**
 * How many notifications one page of the in-app history holds.
 *
 * Shared so web and mobile ask for the same page size, and so a "load more"
 * step is the same size everywhere. The unread badge is counted separately
 * (`getMyUnreadCount`) and is not bounded by this.
 */
export const NOTIFICATION_PAGE_SIZE = 20;

/**
 * The category filters offered on the notifications page.
 *
 * These live here, not in the web app, because the filter is applied *by the
 * query*. It used to be applied client-side over whatever page happened to be
 * loaded, which meant a filter could report an empty inbox while the matching
 * rows sat further back in the history, and the page had to ask the reader to
 * keep loading pages until it found some. A filter that only sees one page is
 * not a filter, it is a highlighter.
 */
export const NOTIFICATION_FILTER_VALUES = [
  'all',
  'reactions',
  'results',
  'locked',
  'announcements',
] as const;

export type NotificationFilter = (typeof NOTIFICATION_FILTER_VALUES)[number];

/**
 * Which stored `type` values each filter selects. `all` is absent on purpose:
 * it is the no-predicate case, and giving it an exhaustive list would mean
 * every new notification type silently disappears from the default view until
 * someone remembers to add it here.
 */
export const NOTIFICATION_TYPES_BY_FILTER = {
  reactions: ['rev_received'],
  results: ['results_published', 'results_amended'],
  locked: ['session_locked'],
  announcements: ['announcement'],
} as const satisfies Record<
  Exclude<NotificationFilter, 'all'>,
  readonly string[]
>;

export function isNotificationFilter(
  value: unknown,
): value is NotificationFilter {
  return (NOTIFICATION_FILTER_VALUES as readonly unknown[]).includes(value);
}
