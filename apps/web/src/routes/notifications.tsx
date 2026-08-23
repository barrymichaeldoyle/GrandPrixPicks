import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import {
  isNotificationFilter,
  NOTIFICATION_PAGE_SIZE,
  type NotificationFilter,
} from '@grandprixpicks/shared/notifications';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useMutation } from 'convex/react';
import { usePaginatedQuery, useQuery } from '@/integrations/convex/query';
import { CheckCheck } from 'lucide-react';
import { useEffect } from 'react';

import { AppPageLayout, RailItem } from '@/components/AppPageLayout';
import { Button } from '@/components/Button/Button';
import {
  NotificationItem,
  type Notification,
} from '@/components/NotificationItem';
import { NotificationFilterNav } from '@/components/notifications/NotificationFilterNav';
import { NotificationSettingsCard } from '@/components/notifications/NotificationSettingsCard';
import {
  NotificationToolbar,
  NotificationUnreadToggle,
} from '@/components/notifications/NotificationToolbar';
import { PageLoader } from '@/components/PageLoader';
import { SignInPrompt } from '@/components/SignInPrompt';
import { ProfileCard } from '@/components/dashboard/ProfileCard';
import { QuickLinksCard } from '@/components/dashboard/QuickLinksCard';
import { RailFooterLinks } from '@/components/dashboard/RailFooterLinks';
import { SuggestedFollowsCard } from '@/components/dashboard/SuggestedFollowsCard';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { captureAnalyticsEvent } from '@/lib/analytics';
import {
  EMPTY_NOTIFICATION_FILTER_COUNTS,
  mergeNotificationPages,
  NOTIFICATION_FILTERS,
} from '@/lib/notificationFilters';
import { pageMeta } from '@/lib/site';

type NotificationSearch = { filter?: NotificationFilter; unread?: true };

const DAY_MS = 86_400_000;

/** Notifications arrive newest-first, so day buckets stay in order. */
function dayGroupLabel(timestamp: number): string {
  const now = new Date();
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();

  if (timestamp >= startOfToday) {
    return 'Today';
  }
  if (timestamp >= startOfToday - DAY_MS) {
    return 'Yesterday';
  }
  if (timestamp >= startOfToday - 7 * DAY_MS) {
    return 'Earlier this week';
  }
  return 'Older';
}

function groupByDay(
  notifications: Notification[],
): { label: string; id: string; notifications: Notification[] }[] {
  const groups: {
    label: string;
    id: string;
    notifications: Notification[];
  }[] = [];
  for (const notification of notifications) {
    const label = dayGroupLabel(notification.createdAt);
    const last = groups.at(-1);
    if (last?.label === label) {
      last.notifications.push(notification);
    } else {
      groups.push({
        label,
        id: `notification-group-${label.toLowerCase().replaceAll(' ', '-')}`,
        notifications: [notification],
      });
    }
  }
  return groups;
}

export const Route = createFileRoute('/notifications')({
  validateSearch: (search: Record<string, unknown>): NotificationSearch => {
    const raw = search.filter;
    return {
      ...(isNotificationFilter(raw) && raw !== 'all' ? { filter: raw } : {}),
      ...(search.unread === true || search.unread === 'true'
        ? { unread: true as const }
        : {}),
    };
  },
  component: NotificationsPage,
  head: () =>
    pageMeta({
      title: 'Notifications | Grand Prix Picks',
      description: 'Session locks, results, reactions, and announcements.',
      path: '/notifications',
      noIndex: true,
    }),
});

function NotificationsPage() {
  const { isSignedIn, isLoaded } = useViewerSession();
  const { filter: filterParam, unread: unreadParam } = Route.useSearch();
  const filter: NotificationFilter = filterParam ?? 'all';
  const unreadOnly = unreadParam === true;
  const navigate = Route.useNavigate();

  // The filters are query arguments, not a post-filter over the loaded page.
  // Changing one starts a fresh pagination of that category, so an empty list
  // means the category is empty rather than "not in what we happen to hold".
  const {
    results,
    status,
    loadMore,
    isLoading: isLoadingPage,
  } = usePaginatedQuery(
    api.inAppNotifications.getMyNotifications,
    isSignedIn ? { filter, unreadOnly } : 'skip',
    { initialNumItems: NOTIFICATION_PAGE_SIZE },
  );
  // The unread total is counted server-side off the unread index, so it stays
  // honest no matter how far back the reader has paged. Its `null` also marks
  // the gap where Clerk has a session but Convex has no auth token yet, which
  // would otherwise render as an empty inbox.
  const unread = useQuery(
    api.inAppNotifications.getMyUnreadCount,
    isSignedIn ? {} : 'skip',
  );
  // Counted server-side over the whole history for the same reason the list is
  // filtered server-side: a badge derived from the loaded page said "no
  // reactions" to someone who had eleven.
  const countsResult = useQuery(
    api.inAppNotifications.getMyNotificationCounts,
    isSignedIn ? {} : 'skip',
  );
  const me = useQuery(api.users.me, isSignedIn ? {} : 'skip');
  const markAllReadMutation = useMutation(api.inAppNotifications.markAllRead);
  const markReadMutation = useMutation(api.inAppNotifications.markRead);

  const isLoadingFirstPage =
    status === 'LoadingFirstPage' || unread === undefined || unread === null;
  const unreadCount = unread?.count ?? 0;
  const unreadLabel =
    unread?.hasMore && unreadCount > 0 ? `${unreadCount}+` : `${unreadCount}`;

  // A reaction thread whose rows straddle a page boundary comes back as two
  // groups; merging on the feed event puts it back together.
  const notifications = mergeNotificationPages(results as Notification[]);
  const counts = countsResult?.counts ?? EMPTY_NOTIFICATION_FILTER_COUNTS;
  const countsTruncated = countsResult?.truncated ?? false;
  const groups = groupByDay(notifications);
  const activeFilter = NOTIFICATION_FILTERS.find((f) => f.value === filter);
  const canLoadMore = status === 'CanLoadMore';
  const isLoadingMore = status === 'LoadingMore' || isLoadingPage;

  // A filtered page can come back short of a full page without being the end
  // of the category. That is a detail of how the scan is chunked, not
  // something to hand to the reader as a button, so keep pulling while the
  // list is empty and there is more to read.
  useEffect(() => {
    if (canLoadMore && notifications.length === 0) {
      loadMore(NOTIFICATION_PAGE_SIZE);
    }
  }, [canLoadMore, notifications.length, loadMore]);

  // An empty list is only news once the category is exhausted: until then the
  // effect above is still pulling, and showing "nothing here" in the meantime
  // would be the same lie in a quieter voice.
  const isResolving =
    isLoadingFirstPage ||
    (notifications.length === 0 && status !== 'Exhausted');

  function searchFor(nextFilter: NotificationFilter): NotificationSearch {
    return {
      ...(nextFilter === 'all' ? {} : { filter: nextFilter }),
      ...(unreadOnly ? { unread: true as const } : {}),
    };
  }

  function updateSearch(next: {
    filter?: NotificationFilter;
    unreadOnly?: boolean;
  }) {
    const nextFilter = next.filter ?? filter;
    const nextUnreadOnly = next.unreadOnly ?? unreadOnly;
    captureAnalyticsEvent('notifications_filter_changed', {
      filter: nextFilter,
      unread_only: nextUnreadOnly,
    });
    void navigate({
      search: {
        ...(nextFilter === 'all' ? {} : { filter: nextFilter }),
        ...(nextUnreadOnly ? { unread: true as const } : {}),
      },
      replace: true,
      resetScroll: false,
    });
  }

  function handleLoadMore() {
    captureAnalyticsEvent('notifications_load_more', {
      loaded_count: notifications.length,
    });
    loadMore(NOTIFICATION_PAGE_SIZE);
  }

  function handleMarkRead(
    id: Id<'inAppNotifications'>,
    feedEventId?: Id<'feedEvents'>,
  ) {
    captureAnalyticsEvent('notification_marked_read', {
      notification_id: id,
      has_feed_event: Boolean(feedEventId),
    });
    markReadMutation({
      notificationId: id,
      feedEventId,
    });
  }

  // Signed-out is resolved at SSR, so it renders before Clerk boots rather
  // than behind the loader. Only a viewer we already believe is signed in
  // waits, and only for their session to confirm.
  if (!isSignedIn) {
    return (
      <SignInPrompt
        eyebrow="Notifications"
        title="Everything that happened while you were away"
        description="One inbox for the sessions you have picks in: what locked, what scored, and who reacted."
        actionLabel="Sign in to see your notifications"
        behind={[
          'Session lock reminders before you miss a pick',
          'Your score, the moment results publish',
          'Reactions to your picks and posts',
          'League invites and member activity',
        ]}
      />
    );
  }

  if (!isLoaded) {
    return <PageLoader />;
  }

  const loadMoreButton = canLoadMore ? (
    <div className="flex justify-center">
      <Button variant="secondary" size="md" onClick={handleLoadMore}>
        Load older notifications
      </Button>
    </div>
  ) : null;

  return (
    <AppPageLayout
      leftLabel="Filters and profile"
      left={
        <>
          <RailItem hideOnMobile>
            <NotificationFilterNav
              filter={filter}
              counts={counts}
              countsTruncated={countsTruncated}
              searchFor={searchFor}
            />
          </RailItem>
          <RailItem hideOnMobile>
            <ProfileCard me={me} />
          </RailItem>
          <RailItem order={3}>
            <QuickLinksCard />
          </RailItem>
        </>
      }
      rightLabel="Notification settings and suggestions"
      right={
        <>
          <RailItem order={1}>
            <NotificationSettingsCard />
          </RailItem>
          <RailItem order={2}>
            <SuggestedFollowsCard />
          </RailItem>
          <RailItem order={4}>
            <RailFooterLinks />
          </RailItem>
        </>
      }
    >
      {/*
        A utility header, not a page hero. This is a destination you reach by
        tapping a thing already labelled "Notifications", and the route is
        `noIndex`, so a display title over a sentence defining the word was
        costing half a phone screen to tell the reader something they knew and
        nobody else could read.

        On a phone it goes further and hides the word entirely: the tab bar's
        active item already says NOTIFICATIONS, directly below the list. The
        `h1` stays in the document — the page still needs one, and so does
        anyone landing here by heading navigation — it just stops being said
        three times on one screen.

        Settings live in the Delivery rail card, which also appears in the
        mobile widget stack, so the header carries no second link.
      */}
      {/* The controls share the title's line rather than stacking under it: at
          `md` and up the title is one short word and the row beside it was
          empty, so a second row was spending vertical space on nothing. Below
          `md` the title is `sr-only` and takes no width, so the control cluster
          spreads across the full row exactly as it did before. */}
      {/* The row is held to the height of its tallest state. "Mark all read"
          is a 36px control (44px under a thumb) and the lens pill beside it is
          shorter, so without a floor the row shrank the instant the count hit
          zero and pulled the whole list up under the finger that had just
          tapped it. */}
      <header className="mb-4 flex min-h-9 items-center justify-between gap-3 pointer-coarse:min-h-11">
        <h1 className="gpp-label text-text-muted max-md:sr-only">
          Notifications
        </h1>
        {/* The unread lens sits here rather than above the list, which also
            fixes what the old header did at zero unread: it held an empty
            paragraph open so the row would not collapse and yank the list up
            under the thumb that had just marked everything read. A control
            that is always present holds the row open by itself. */}
        <div className="flex min-w-0 items-center gap-3 max-md:w-full max-md:justify-between">
          <NotificationUnreadToggle
            unreadOnly={unreadOnly}
            onUnreadOnlyChange={(next) => updateSearch({ unreadOnly: next })}
          />
          {unreadCount > 0 ? (
            <div className="flex min-w-0 items-center gap-2">
              <span className="truncate text-sm text-text-muted">
                {unreadLabel} unread
              </span>
              <Button
                size="sm"
                variant="text"
                leftIcon={CheckCheck}
                onClick={() => {
                  captureAnalyticsEvent('notifications_mark_all_read', {
                    unread_count: unreadCount,
                  });
                  void markAllReadMutation({});
                }}
              >
                Mark all read
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      <NotificationToolbar
        filter={filter}
        counts={counts}
        countsTruncated={countsTruncated}
        searchFor={searchFor}
      />

      {/* Filtering, loading and mark-as-read change the list silently. */}
      <p role="status" className="sr-only">
        {isResolving
          ? 'Loading notifications'
          : `Showing ${notifications.length} ${activeFilter?.shortLabel.toLowerCase() ?? ''} notifications${unreadOnly ? ', unread only' : ''}. ${unreadLabel} unread in total.`}
      </p>

      {isResolving ? (
        <NotificationListSkeleton />
      ) : groups.length === 0 ? (
        // No load-more button here any more. The query is filtered, so an
        // empty result is the whole answer for this category rather than a
        // report on what happened to be in memory, and there is nothing left
        // for the reader to go digging through.
        <EmptyState
          categoryLabel={activeFilter?.shortLabel.toLowerCase() ?? 'new'}
          isDefaultView={filter === 'all' && !unreadOnly}
          unreadOnly={unreadOnly}
          // "You've read them all" and "there are none" are different facts,
          // and the counts know which one this is.
          categoryHasAny={counts[filter].total > 0}
          onShowAll={() => updateSearch({ filter: 'all', unreadOnly: false })}
        />
      ) : (
        <div className="space-y-5">
          {groups.map((group) => (
            <section key={group.id} aria-labelledby={group.id}>
              {/* A day heading earns its place by separating one bucket from
                  another. A lone "Older" over the entire list separates
                  nothing and just repeats what the timestamps say, so it goes
                  visually and stays for screen readers, which still need the
                  section labelled. */}
              <h2
                id={group.id}
                className={`gpp-label mb-2 text-text-muted ${groups.length === 1 ? 'sr-only' : ''}`}
              >
                {group.label}
              </h2>
              <ul className="divide-y divide-border/50 overflow-hidden rounded-lg border border-border bg-surface">
                {group.notifications.map((notification) => (
                  <NotificationItem
                    key={notification._id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                  />
                ))}
              </ul>
            </section>
          ))}
          {isLoadingMore ? <NotificationListSkeleton rows={2} /> : null}
          {!isLoadingMore && loadMoreButton}
          {status === 'Exhausted' && notifications.length > 0 ? (
            <p className="text-center text-xs text-text-muted">
              That&apos;s your whole notification history.
            </p>
          ) : null}
        </div>
      )}
    </AppPageLayout>
  );
}

/**
 * Keeps the page shell (and both rails) on screen while a page loads, rather
 * than swapping the whole route for a centred spinner.
 *
 * Mirrors a single day-group's card — the common first-paint case, where the
 * live heading is `sr-only`. A pulse bar above the list used to sit exactly
 * where the unread control lived when it was stacked under the title; once
 * that control moved onto the title row, the bar was only spending height the
 * content never claimed, then yanking the list up on arrival.
 */
function NotificationListSkeleton({ rows = 4 }: { rows?: number }) {
  // Varied title widths so four identical bars don't read as a stuck paint.
  const titleWidths = ['w-2/3', 'w-1/2', 'w-3/5', 'w-3/4'] as const;

  return (
    <div
      aria-hidden
      className="divide-y divide-border/50 overflow-hidden rounded-lg border border-border bg-surface"
    >
      {Array.from({ length: rows }, (_, row) => (
        <div key={row} className="flex items-start gap-3 px-4 py-3">
          {/* Same leading slot as NotificationItem's RowBody. */}
          <div className="flex w-8 shrink-0 items-start pt-0.5">
            <div className="h-8 w-8 animate-pulse rounded-full bg-surface-muted" />
          </div>
          <div className="min-w-0 flex-1">
            {/* `pr-5` matches the corner reserved for the mark-as-read control. */}
            <div className="pr-5">
              <div
                className={`h-3.5 animate-pulse rounded bg-surface-muted ${titleWidths[row % titleWidths.length]}`}
              />
            </div>
            <div className="mt-1 h-3 w-28 animate-pulse rounded bg-surface-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Says what is true of the whole category, not of the loaded page.
 *
 * The old copy ("Nothing in what has loaded so far. Try another filter, or
 * load older notifications.") was an accurate description of a client-side
 * filter and a terrible thing to read: it admitted the app had not actually
 * checked, and asked the reader to page through their own history to find out.
 * With the filter in the query there is nothing left to qualify.
 */
function EmptyState({
  categoryLabel,
  isDefaultView,
  unreadOnly,
  categoryHasAny,
  onShowAll,
}: {
  categoryLabel: string;
  isDefaultView: boolean;
  unreadOnly: boolean;
  /** Whether this category holds anything at all, read or not. */
  categoryHasAny: boolean;
  onShowAll: () => void;
}) {
  // Under "unread only" there are two ways to be empty, and telling someone
  // they have read every announcement when they have never had one is the kind
  // of small wrongness that makes the rest of the page feel untrustworthy.
  const readThemAll = unreadOnly && categoryHasAny;
  const title = isDefaultView
    ? "You're all caught up"
    : readThemAll
      ? 'Nothing unread here'
      : `No ${categoryLabel} yet`;

  return (
    <div className="rounded-lg border border-border bg-surface px-5 py-10 text-center">
      <p className="text-sm font-medium text-text">{title}</p>
      <p className="mt-1 text-xs leading-relaxed text-text-muted">
        {isDefaultView
          ? "We'll ping you when sessions lock, results publish, or someone reacts to your picks."
          : readThemAll
            ? "You've read every one of these."
            : 'Try another filter, or check back after the next session.'}
      </p>
      {isDefaultView ? (
        <Link
          to="/races"
          className="mt-4 inline-flex rounded-lg border border-border px-3 py-2 text-xs font-semibold text-accent transition-colors hover:border-accent/60 hover:bg-accent/10 hover:text-accent-hover"
        >
          View race calendar
        </Link>
      ) : (
        <button
          type="button"
          onClick={onShowAll}
          className="mt-4 inline-flex rounded-lg border border-border px-3 py-2 text-xs font-semibold text-accent transition-colors hover:border-accent/60 hover:bg-accent/10 hover:text-accent-hover"
        >
          Show all notifications
        </button>
      )}
    </div>
  );
}
