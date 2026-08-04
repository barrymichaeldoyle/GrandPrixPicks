import { Link } from '@tanstack/react-router';
import { Check } from 'lucide-react';

import {
  NOTIFICATION_FILTERS,
  type NotificationFilter,
  type NotificationFilterCounts,
} from '@/lib/notificationFilters';

const pillClass =
  'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none';

/**
 * Filter controls above the list. The category chips are the mobile stand-in
 * for the rail nav, which collapses below `lg`; the unread switch is the one
 * control that stays visible at every width.
 *
 * Chips are links for the same reason the rail nav is. The switch stays a
 * button: it is a state toggle rather than a destination, and `aria-pressed`
 * is what conveys that.
 */
export function NotificationToolbar({
  filter,
  counts,
  unreadOnly,
  searchFor,
  onUnreadOnlyChange,
}: {
  filter: NotificationFilter;
  counts: NotificationFilterCounts;
  unreadOnly: boolean;
  searchFor: (filter: NotificationFilter) => {
    filter?: NotificationFilter;
    unread?: true;
  };
  onUnreadOnlyChange: (unreadOnly: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      {/* One scrolling row beats a wrapping block of five chips on a phone.
          The negative margin lets it bleed to the screen edge so the last chip
          reads as scrollable rather than clipped. */}
      <div
        aria-label="Notification categories"
        className="-mx-4 flex [scrollbar-width:none] gap-2 overflow-x-auto px-4 pb-1 lg:hidden [&::-webkit-scrollbar]:hidden"
      >
        {NOTIFICATION_FILTERS.map(({ value, shortLabel, icon: Icon }) => {
          const selected = filter === value;
          const { unread } = counts[value];
          return (
            <Link
              key={value}
              to="/notifications"
              search={searchFor(value)}
              replace
              resetScroll={false}
              aria-current={selected ? 'true' : undefined}
              className={`${pillClass} ${
                selected
                  ? 'border-accent bg-accent text-text-on-accent'
                  : 'border-border bg-surface text-text hover:border-border-strong hover:bg-surface-muted/60'
              }`}
            >
              <Icon className="h-3.5 w-3.5" aria-hidden />
              {shortLabel}
              {unread > 0 && !selected ? (
                <span className="gpp-mono text-[10px] text-accent">
                  {unread}
                  <span className="sr-only"> unread</span>
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>

      <button
        type="button"
        aria-pressed={unreadOnly}
        onClick={() => onUnreadOnlyChange(!unreadOnly)}
        className={`${pillClass} ${
          unreadOnly
            ? 'border-accent bg-accent text-text-on-accent'
            : 'border-border bg-surface text-text-muted hover:border-border-strong hover:text-text'
        }`}
      >
        <Check
          className={`h-3.5 w-3.5 ${unreadOnly ? 'opacity-100' : 'opacity-40'}`}
          aria-hidden
        />
        Unread only
      </button>
    </div>
  );
}
