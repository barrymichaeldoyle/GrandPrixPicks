import type { NotificationFilter } from '@grandprixpicks/shared/notifications';
import { Link } from '@tanstack/react-router';
import { Check } from 'lucide-react';
import { useEffect, useRef } from 'react';

import {
  formatNotificationCount,
  NOTIFICATION_FILTERS,
  type NotificationFilterCounts,
} from '@/lib/notificationFilters';

const pillClass =
  'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none';

/**
 * The unread lens, which is not a filter category: it narrows whichever
 * category is selected and survives changing them.
 *
 * It used to lead the chip row, where it ate roughly a third of a phone's
 * width and pushed the last two categories off screen with nothing to say they
 * were there. It lives in the page header now, which is the row that had space
 * going spare, and where its "lens over everything below" reading is the
 * obvious one.
 *
 * A button rather than a link: it is a state toggle rather than a destination,
 * and `aria-pressed` is what conveys that.
 */
export function NotificationUnreadToggle({
  unreadOnly,
  onUnreadOnlyChange,
}: {
  unreadOnly: boolean;
  onUnreadOnlyChange: (unreadOnly: boolean) => void;
}) {
  return (
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
}

/**
 * The category chips: the mobile stand-in for the rail nav, which only appears
 * from `lg`. Chips are links for the same reason the rail nav is — the filter
 * is URL state.
 */
export function NotificationToolbar({
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
  const rowRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLAnchorElement>(null);

  // A selected category that sits off the right edge is a filter the reader
  // cannot see they are inside: the list is narrowed and the control saying so
  // is out of frame. Centring it is also the scroll affordance — a row that
  // arrives already scrolled is visibly a row that scrolls.
  //
  // Instant, not smooth: on first paint there is nothing to animate away from,
  // and `scrollTo` on the row (rather than `scrollIntoView` on the chip) keeps
  // this from ever moving the page vertically.
  useEffect(() => {
    const row = rowRef.current;
    const chip = selectedRef.current;
    if (!row || !chip) {
      return;
    }
    const centred = chip.offsetLeft - (row.clientWidth - chip.clientWidth) / 2;
    row.scrollTo({ left: Math.max(0, centred) });
  }, [filter]);

  return (
    <div className="mb-5 lg:hidden">
      {/*
        One scrolling row beats a wrapping block of chips on a phone. The
        negative margin lets it bleed to the screen edge so the last chip reads
        as scrollable rather than clipped.

        The unread toggle used to lead this row and cost it a third of its
        width, which was the difference between five categories being reachable
        and two of them being invisible. It lives in the page header now.
      */}
      <div
        ref={rowRef}
        role="group"
        // Distinct from the rail `<nav aria-label="Notification filters">`,
        // which is the same set of categories at `lg`. Two landmarks answering
        // to one name is a coin toss for anyone navigating by label.
        aria-label="Filter notifications"
        className="-mx-4 flex [scrollbar-width:none] items-center gap-2 overflow-x-auto px-4 pb-1 [&::-webkit-scrollbar]:hidden"
      >
        {NOTIFICATION_FILTERS.map(({ value, shortLabel, icon: Icon }) => {
          const selected = filter === value;
          const { unread } = counts[value];
          return (
            <Link
              key={value}
              ref={selected ? selectedRef : undefined}
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
  );
}
