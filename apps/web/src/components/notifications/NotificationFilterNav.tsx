import type { NotificationFilter } from '@grandprixpicks/shared/notifications';
import { Link } from '@tanstack/react-router';

import {
  formatNotificationCount,
  NOTIFICATION_FILTERS,
  type NotificationFilterCounts,
} from '@/lib/notificationFilters';

/**
 * Desktop rail control for the notifications page: one row per category with
 * its unread count, in the same card idiom as the dashboard rails.
 *
 * These are links, not buttons: the filter is URL state, so it should survive
 * a middle-click into a new tab and a copied address.
 */
export function NotificationFilterNav({
  filter,
  counts,
  countsTruncated = false,
  searchFor,
}: {
  filter: NotificationFilter;
  counts: NotificationFilterCounts;
  /** Counts cover a bounded window of history; render them as "N+" past it. */
  countsTruncated?: boolean;
  searchFor: (filter: NotificationFilter) => {
    filter?: NotificationFilter;
    unread?: true;
  };
}) {
  return (
    <nav
      aria-label="Notification filters"
      className="rounded-lg border border-border bg-surface p-2"
    >
      <ul className="space-y-0.5">
        {NOTIFICATION_FILTERS.map(({ value, label, icon: Icon }) => {
          const selected = filter === value;
          const { total, unread } = counts[value];
          return (
            <li key={value}>
              <Link
                to="/notifications"
                search={searchFor(value)}
                replace
                resetScroll={false}
                aria-current={selected ? 'true' : undefined}
                className={`flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-sm font-medium transition-colors ${
                  selected
                    ? 'bg-surface-muted/70 text-accent'
                    : 'text-text hover:bg-surface-muted/60 hover:text-accent'
                }`}
              >
                <Icon
                  className={`h-4 w-4 shrink-0 ${selected ? 'text-accent' : 'text-text-muted'}`}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 truncate">{label}</span>
                {unread > 0 ? (
                  <span className="gpp-mono shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] leading-none font-semibold text-text-on-accent">
                    {formatNotificationCount(unread, countsTruncated)}
                    <span className="sr-only"> unread</span>
                  </span>
                ) : total > 0 ? (
                  <span className="gpp-mono shrink-0 text-[11px] text-text-muted">
                    {formatNotificationCount(total, countsTruncated)}
                    <span className="sr-only"> notifications, all read</span>
                  </span>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
