import type { ReactionType } from '@grandprixpicks/shared/reactions';
import { REACTION_BY_TYPE } from '@grandprixpicks/shared/reactions';
import { Ionicons } from '@expo/vector-icons';
import { NOTIFICATION_PAGE_SIZE } from '@grandprixpicks/shared/notifications';
import { useMutation } from 'convex/react';
import { usePaginatedQuery, useQuery } from '../integrations/convex/query';
import * as Haptics from 'expo-haptics';

import { Avatar } from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import type { ConvexId } from '../integrations/convex/api';
import { api } from '../integrations/convex/api';
import { useRefreshSpinner } from '../lib/useRefreshSpinner';
import { useMobileConfig } from '../providers/mobile-config';
import { useToast } from '../providers/ToastProvider';
import { colors } from '../theme/tokens';
import { FlatList, Pressable, RefreshControl, Text, View } from '../tw';

type Notification = {
  _id: ConvexId<'inAppNotifications'>;
  type:
    | 'rev_received'
    | 'results_published'
    | 'results_amended'
    | 'session_locked'
    | 'announcement';
  readAt?: number;
  createdAt: number;
  raceName?: string;
  raceSlug?: string;
  sessionType?: string;
  points?: number;
  amendmentNote?: string;
  title?: string;
  body?: string;
  linkPath?: string;
  actorUsername?: string;
  actorDisplayName?: string;
  actorAvatarUrl?: string;
  reactionType?: ReactionType;
  actors?: Array<{
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    isFollowed: boolean;
    reactionType: ReactionType;
  }>;
  totalReactionCount?: number;
  totalRevCount?: number;
};

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  if (hours < 24) {
    return `${hours}h ago`;
  }
  if (days < 7) {
    return `${days}d ago`;
  }
  return new Date(timestamp).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

export function NotificationsScreen() {
  const { convexEnabled } = useMobileConfig();
  const { refreshing, onRefresh } = useRefreshSpinner();
  const { showToast } = useToast();
  const { results, status, loadMore } = usePaginatedQuery(
    api.inAppNotifications.getMyNotifications,
    convexEnabled ? {} : 'skip',
    { initialNumItems: NOTIFICATION_PAGE_SIZE },
  );
  const unread = useQuery(
    api.inAppNotifications.getMyUnreadCount,
    convexEnabled ? {} : 'skip',
  );
  const markRead = useMutation(api.inAppNotifications.markRead);
  const markAllRead = useMutation(api.inAppNotifications.markAllRead);

  async function handleMarkAll() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await markAllRead({});
      showToast('All notifications marked read', 'success');
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : 'Could not mark all read',
        'error',
      );
    }
  }

  if (!convexEnabled) {
    return (
      <View className="flex-1 bg-page px-4 pt-3">
        <Header subtitle="Notifications" />
        <EmptyState
          body="Configure Convex to receive notifications."
          icon="notifications-off-outline"
          title="Not connected"
        />
      </View>
    );
  }

  if (status === 'LoadingFirstPage' || unread === undefined) {
    return <LoadingScreen />;
  }

  if (unread === null) {
    return (
      <View className="flex-1 bg-page px-4 pt-3">
        <Header subtitle="Notifications" />
        <EmptyState
          body="Sign in to view notifications."
          icon="notifications-off-outline"
          title="Sign in required"
        />
      </View>
    );
  }

  const notifications = results as Notification[];
  const unreadCount = unread.count;
  const unreadLabel = unread.hasMore ? `${unreadCount}+` : `${unreadCount}`;

  return (
    <View className="flex-1 bg-page px-4 pt-3">
      <Header
        subtitle={
          unreadCount > 0 ? `${unreadLabel} unread` : "You're all caught up"
        }
        action={
          unreadCount > 0 ? (
            <Pressable hitSlop={8} onPress={() => void handleMarkAll()}>
              <Text className="text-xs font-bold text-accent">
                Mark all read
              </Text>
            </Pressable>
          ) : null
        }
      />
      <FlatList
        contentContainerClassName={
          notifications.length === 0 ? 'flex-1' : 'pb-6'
        }
        data={notifications}
        keyExtractor={(item) => String(item._id)}
        ListEmptyComponent={
          <EmptyState
            body="When you get reactions, results, or session locks, they'll appear here."
            icon="notifications-outline"
            title="No notifications yet"
          />
        }
        ItemSeparatorComponent={() => (
          <View className="ml-[52px] h-px bg-border" />
        )}
        // Paging on scroll rather than a button: a phone list has no obvious
        // bottom edge to put one against.
        onEndReached={() => {
          if (status === 'CanLoadMore') {
            loadMore(NOTIFICATION_PAGE_SIZE);
          }
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          status === 'LoadingMore' ? (
            <Text className="text-muted py-4 text-center text-xs">
              Loading older notifications
            </Text>
          ) : null
        }
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
            }}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function Header({
  subtitle,
  action,
}: {
  subtitle: string;
  action?: React.ReactNode;
}) {
  // The nav bar already titles this screen "Notifications" — repeating it
  // here read as a glitch, so the page header carries only the status line.
  return (
    <View className="flex-row items-center justify-between gap-3 pb-3">
      <Text className="text-muted flex-1 text-xs">{subtitle}</Text>
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
        <Text className="text-muted mt-0.5 text-[10px]">
          {formatRelativeTime(notification.createdAt)}
        </Text>
      </View>
      {isUnread ? <View className="h-2 w-2 rounded bg-accent" /> : null}
    </Pressable>
  );
}

function NotificationIcon({ notification }: { notification: Notification }) {
  if (notification.type === 'rev_received') {
    const actor = notification.actors?.[0];
    const displayName =
      actor?.displayName ??
      actor?.username ??
      notification.actorDisplayName ??
      notification.actorUsername;
    const imageUrl = actor?.avatarUrl ?? notification.actorAvatarUrl;
    return <Avatar imageUrl={imageUrl} name={displayName ?? null} size="md" />;
  }
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

function getNotificationTitle(notification: Notification): string {
  if (notification.type === 'rev_received') {
    const count =
      notification.totalReactionCount ?? notification.totalRevCount ?? 1;
    const actor = notification.actors?.[0];
    const name =
      actor?.displayName ??
      actor?.username ??
      notification.actorDisplayName ??
      notification.actorUsername ??
      'Someone';
    if (count > 1) {
      return `${name} and ${count - 1} other${count - 1 === 1 ? '' : 's'} reacted to your pick`;
    }
    const reactionType =
      actor?.reactionType ?? notification.reactionType ?? 'fire';
    return `${name} reacted ${REACTION_BY_TYPE[reactionType].emoji} to your pick`;
  }
  if (notification.type === 'results_published') {
    const points = notification.points ?? 0;
    return `Results published: ${points} pt${points === 1 ? '' : 's'}`;
  }
  if (notification.type === 'results_amended') {
    const points = notification.points;
    return points !== undefined
      ? `Results amended: now ${points} pt${points === 1 ? '' : 's'}`
      : 'Results amended';
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
  if (notification.type === 'rev_received') {
    if (notification.raceName) {
      return notification.raceName;
    }
    return 'Tap to view in feed';
  }
  if (notification.type === 'results_amended' && notification.amendmentNote) {
    return notification.amendmentNote;
  }
  if (notification.type === 'announcement') {
    return notification.body ?? '';
  }
  return [session, notification.raceName].filter(Boolean).join(' · ');
}
