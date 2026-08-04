import type { NotificationFilter } from '@grandprixpicks/shared/notifications';
import { Link } from '@tanstack/react-router';
import { Check } from 'lucide-react';

import {
  formatNotificationCount,
  NOTIFICATION_FILTERS,
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
  countsTruncated = false,
  unreadOnly,
  searchFor,
  onUnreadOnlyChange,
}: {
  filter: NotificationFilter;
  counts: NotificationFilterCounts;
  /** Counts cover a bounded window of history; render them as "N+" past it. */
  countsTruncated?: boolean;
  unreadOnly: boolean;
  searchFor: (filter: NotificationFilter) => {
    filter?: NotificationFilter;
    unread?: true;
  };
  onUnreadOnlyChange: (unreadOnly: boolean) => void;
}) {
  const unreadToggle = (
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
  );

  return (
    <div className="mb-5">
      {/*
        One scrolling row beats a wrapping block of chips on a phone. The
        negative margin lets it bleed to the screen edge so the last chip reads
        as scrollable rather than clipped.

        The unread toggle rides in the same row rather than owning a second one
        below it, which spent a full row of a phone screen on a single control.
        It leads, and a hairline separates it from the categories, because it is
        not a sixth category: it is a lens over whichever one is selected, and
        it survives changing them. Sitting inline between "All" and "Reactions"
        it read as a category you would lose by picking another.
      */}
      <div
        role="group"
        // Distinct from the rail `<nav aria-label="Notification filters">`,
        // which is the same set of categories at `lg`. Two landmarks answering
        // to one name is a coin toss for anyone navigating by label.
        aria-label="Filter notifications"
        className="-mx-4 flex [scrollbar-width:none] items-center gap-2 overflow-x-auto px-4 pb-1 [&::-webkit-scrollbar]:hidden"
      >
        {unreadToggle}
        {/* `contents` so these stay flex items of the scrolling row while the
            wrapper still carries the one `lg:hidden` that retires the whole
            category group to the desktop rail. */}
        <div className="contents lg:hidden">
          {/* `border-strong`, not `border`: a hairline at the card-edge value
              is invisible against a pill row and reads as an accidental gap,
              which is worse than no separator at all. */}
          <span
            aria-hidden
            className="mx-0.5 h-5 w-px shrink-0 self-center bg-border-strong"
          />
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
                    {formatNotificationCount(unread, countsTruncated)}
                    <span className="sr-only"> unread</span>
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
