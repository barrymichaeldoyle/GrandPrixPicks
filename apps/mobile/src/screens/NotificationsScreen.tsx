import { Ionicons } from '../components/ui/Ionicons';
import { NOTIFICATION_PAGE_SIZE } from '@grandprixpicks/shared/notifications';
import { useMutation } from 'convex/react';
import { usePaginatedQuery, useQuery } from '../integrations/convex/query';
import * as Haptics from 'expo-haptics';

import { SignedOutState } from '../components/SignedOutState';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import {
  CHROME_END_PADDING,
  CollapsingChrome,
  TabChrome,
} from '../components/ui/TabChrome';
import { useHideOnScroll } from '../hooks/useHideOnScroll';
import type { ConvexId } from '../integrations/convex/api';
import { api } from '../integrations/convex/api';
import {
  applyMarkAllReadToStore,
  applyMarkReadToStore,
} from '../lib/optimisticNotifications';
import { useRefreshSpinner } from '../lib/useRefreshSpinner';
import { useMobileConfig } from '../providers/mobile-config';
import { useToast } from '../providers/ToastProvider';
import { colors } from '../theme/tokens';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from '../tw';
import { routePushUrl } from '../lib/pushRouting';
import { userFacingMessage } from '../lib/userFacingError';
import { formatRelativeTime } from '@grandprixpicks/shared/dates';

type Notification = {
  _id: ConvexId<'inAppNotifications'>;
  type:
    | 'results_published'
    | 'results_amended'
    | 'session_locked'
    | 'announcement';
  readAt?: number;
  createdAt: number;
  raceId?: string;
  raceName?: string;
  raceSlug?: string;
  sessionType?: string;
  title?: string;
  body?: string;
  linkPath?: string;
};

/**
 * Where a row opens: the same place its push does. A results push opens the
 * round's weekend leaderboard (`push.ts`), so the row does too; it used to
 * fall back to the race page, a different screen for the same notice.
 */
function notificationPath(item: Notification): string | undefined {
  if (item.linkPath) {
    return item.linkPath;
  }
  if (
    (item.type === 'results_published' || item.type === 'results_amended') &&
    item.raceId
  ) {
    return `/leaderboard?time=weekend&raceId=${item.raceId}`;
  }
  return item.raceSlug ? `/races/${item.raceSlug}` : undefined;
}

export function NotificationsScreen({
  tabChrome = false,
}: {
  /**
   * The notifications tab has no native stack header, so it carries compact
   * chrome that hides on scroll. Pushed from Home or More, the stack already
   * titles the screen — repeating it here read as a glitch.
   */
  tabChrome?: boolean;
}) {
  const { convexEnabled } = useMobileConfig();
  const { refreshing, onRefresh } = useRefreshSpinner();
  const { showToast } = useToast();
  const hide = useHideOnScroll();
  const { results, status, loadMore } = usePaginatedQuery(
    api.inAppNotifications.getMyNotifications,
    convexEnabled ? {} : 'skip',
    { initialNumItems: NOTIFICATION_PAGE_SIZE },
  );
  const unread = useQuery(
    api.inAppNotifications.getMyUnreadCount,
    convexEnabled ? {} : 'skip',
  );
  const markRead = useMutation(
    api.inAppNotifications.markRead,
  ).withOptimisticUpdate((store, args) => {
    applyMarkReadToStore(store, args.notificationId);
  });
  const markAllRead = useMutation(
    api.inAppNotifications.markAllRead,
  ).withOptimisticUpdate((store) => {
    applyMarkAllReadToStore(store);
  });

  async function handleMarkAll() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await markAllRead({});
      showToast('All notifications marked read', 'success');
    } catch (err) {
      showToast(userFacingMessage(err, 'Could not mark all read'), 'error');
    }
  }

  if (!convexEnabled) {
    return (
      <View className="flex-1 bg-page">
        {tabChrome ? <TabChrome title="Notifications" /> : null}
        <View className="px-4 pt-3">
          {tabChrome ? null : <Header subtitle="Notifications" />}
          <EmptyState
            body="Configure Convex to receive notifications."
            icon="notifications-off-outline"
            title="Not connected"
          />
        </View>
      </View>
    );
  }

  if (status === 'LoadingFirstPage' || unread === undefined) {
    return (
      <View className="flex-1 bg-page">
        {tabChrome ? <TabChrome title="Notifications" /> : null}
        <LoadingScreen />
      </View>
    );
  }

  // `getMyUnreadCount` returns null for a reader with no identity, which is
  // the screen's auth signal. This used to be an EmptyState reading "Sign in
  // required" with no way to do so, which was a dead end even while the tabs
  // were gated and everyone arriving here had an account.
  if (unread === null) {
    const signedOut = (
      <SignedOutState
        behind={[
          'Results the moment a session is scored',
          'A reminder before picks lock, so a weekend cannot pass you by',
          'Updates from other players',
        ]}
        description="Notifications tell you when your picks score and when the next session is about to lock."
        eyebrow={tabChrome ? undefined : 'Notifications'}
        title="Keep up with your weekend"
      />
    );
    if (!tabChrome) {
      return signedOut;
    }
    return (
      <View className="flex-1 bg-page">
        <TabChrome title="Notifications" />
        {signedOut}
      </View>
    );
  }

  const notifications = results as Notification[];
  const unreadCount = unread.count;
  const unreadLabel = unread.hasMore ? `${unreadCount}+` : `${unreadCount}`;
  const markAll =
    unreadCount > 0 ? (
      <Pressable
        accessibilityRole="button"
        hitSlop={8}
        onPress={() => void handleMarkAll()}
      >
        <Text className="text-xs font-bold text-accent">Mark all read</Text>
      </Pressable>
    ) : null;

  const list = (
    <FlatList
      contentContainerClassName={notifications.length === 0 ? 'flex-1' : 'px-4'}
      contentContainerStyle={
        notifications.length === 0
          ? undefined
          : { paddingBottom: 24 + (tabChrome ? CHROME_END_PADDING : 0) }
      }
      data={notifications}
      keyExtractor={(item) => String(item._id)}
      ListEmptyComponent={
        <EmptyState
          body="Results and lock reminders."
          icon="notifications-outline"
          title="No notifications yet"
        />
      }
      ItemSeparatorComponent={RowSeparator}
      // Paging on scroll rather than a button: a phone list has no obvious
      // bottom edge to put one against.
      onEndReached={() => {
        if (status === 'CanLoadMore') {
          loadMore(NOTIFICATION_PAGE_SIZE);
        }
      }}
      // Two screens ahead, so the next page lands before the reader does.
      onEndReachedThreshold={2}
      // Held while there are older notifications, not only during a request,
      // so the list's height does not change under the reader's thumb.
      ListFooterComponent={
        status === 'CanLoadMore' || status === 'LoadingMore' ? (
          <View className="h-14 items-center justify-center">
            {status === 'LoadingMore' ? (
              <ActivityIndicator color={colors.textMuted} />
            ) : null}
          </View>
        ) : undefined
      }
      {...(tabChrome ? hide.scrollProps : {})}
      refreshControl={
        <RefreshControl
          colors={[colors.accent]}
          onRefresh={onRefresh}
          refreshing={refreshing}
          tintColor={colors.accent}
        />
      }
      renderItem={({ item }) => (
        <NotificationRow
          notification={item}
          onPress={() => {
            if (!item.readAt) {
              void Haptics.selectionAsync();
              void markRead({ notificationId: item._id });
            }
            // Same destinations as the push for this notification.
            routePushUrl(notificationPath(item));
          }}
        />
      )}
      showsVerticalScrollIndicator={false}
    />
  );

  if (tabChrome) {
    return (
      <CollapsingChrome
        chrome={<TabChrome action={markAll} title="Notifications" />}
        sheetStyle={hide.sheetStyle}
      >
        {list}
      </CollapsingChrome>
    );
  }

  return (
    <View className="flex-1 bg-page pt-3">
      <View className="px-4">
        <Header
          action={markAll}
          subtitle={
            unreadCount > 0
              ? `${unreadLabel} unread`
              : notifications.length > 0
                ? "You're all caught up"
                : undefined
          }
        />
      </View>
      {list}
    </View>
  );
}

function Header({
  subtitle,
  action,
}: {
  /** Omitted entirely when the list is empty: the empty state says it better. */
  subtitle?: string;
  action?: React.ReactNode;
}) {
  // The nav bar already titles this screen "Notifications" — repeating it
  // here read as a glitch, so the page header carries only the status line.
  return (
    <View className="flex-row items-center justify-between gap-3 pb-3">
      <Text className="text-muted flex-1 text-xs">{subtitle ?? ''}</Text>
      {action ?? null}
    </View>
  );
}

function NotificationRow({
  notification,
  onPress,
}: {
  notification: Notification;
  onPress: () => void;
}) {
  const isUnread = !notification.readAt;

  return (
    <Pressable
      accessibilityRole="button"
      className={`flex-row items-center gap-3 px-1.5 py-3 ${
        isUnread ? 'rounded-md bg-accent/10' : ''
      }`}
      onPress={onPress}
    >
      <NotificationIcon notification={notification} />
      <View className="flex-1 gap-0.5">
        <Text className="text-foreground text-sm font-bold">
          {getNotificationTitle(notification)}
        </Text>
        <Text className="text-muted text-xs">
          {getNotificationSubtitle(notification)}
        </Text>
        <Text className="text-muted mt-0.5 text-xs">
          {formatRelativeTime(notification.createdAt)}
        </Text>
      </View>
      {isUnread ? <View className="h-2 w-2 rounded bg-accent" /> : null}
    </Pressable>
  );
}

function NotificationIcon({ notification }: { notification: Notification }) {
  if (notification.type === 'results_published') {
    return (
      <View className="h-9 w-9 items-center justify-center rounded-full bg-accent-muted">
        <Ionicons color={colors.accent} name="trophy" size={18} />
      </View>
    );
  }
  if (notification.type === 'results_amended') {
    return (
      <View className="h-9 w-9 items-center justify-center rounded-full bg-warning/20">
        <Ionicons color={colors.warning} name="alert-circle" size={18} />
      </View>
    );
  }
  if (notification.type === 'announcement') {
    return (
      <View className="h-9 w-9 items-center justify-center rounded-full bg-accent/20">
        <Ionicons color={colors.accent} name="megaphone" size={18} />
      </View>
    );
  }
  return (
    <View className="h-9 w-9 items-center justify-center rounded-full bg-warning/20">
      <Ionicons color={colors.warning} name="lock-closed" size={18} />
    </View>
  );
}

// Results rows carry no points and no amendment note: either would spoil the
// session for anyone yet to watch it. The leaderboard the row opens has both.
function getNotificationTitle(notification: Notification): string {
  if (notification.type === 'results_published') {
    return 'Results are in';
  }
  if (notification.type === 'results_amended') {
    return 'Results were amended';
  }
  if (notification.type === 'announcement') {
    return notification.title ?? 'Announcement';
  }
  return 'Session locked';
}

function getNotificationSubtitle(notification: Notification): string {
  const session = notification.sessionType
    ? notification.sessionType
        .replace(/_/g, ' ')
        .replace(/^./, (c) => c.toUpperCase())
    : null;
  if (notification.type === 'announcement') {
    return notification.body ?? '';
  }
  return [session, notification.raceName].filter(Boolean).join(' · ');
}

/** Module scope: an inline component type remounted every separator per render. */
function RowSeparator() {
  return <View className="ml-[52px] h-px bg-border" />;
}
