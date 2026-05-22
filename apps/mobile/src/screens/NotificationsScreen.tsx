import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { PageHero } from '../components/ui/PageHero';
import type { ConvexId } from '../integrations/convex/api';
import { api } from '../integrations/convex/api';
import { useMobileConfig } from '../providers/mobile-config';
import { colors, radii } from '../theme/tokens';

type Notification = {
  _id: ConvexId<'inAppNotifications'>;
  type: 'rev_received' | 'results_published' | 'session_locked';
  readAt?: number;
  createdAt: number;
  raceName?: string;
  raceSlug?: string;
  sessionType?: string;
  points?: number;
  actorUsername?: string;
  actorDisplayName?: string;
  actorAvatarUrl?: string;
  actors?: Array<{
    username?: string;
    displayName?: string;
    avatarUrl?: string;
    isFollowed: boolean;
  }>;
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
  const result = useQuery(
    api.inAppNotifications.getMyNotifications,
    convexEnabled ? {} : 'skip',
  );
  const markRead = useMutation(api.inAppNotifications.markRead);
  const markAllRead = useMutation(api.inAppNotifications.markAllRead);

  function handleMarkAll() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    void markAllRead({});
  }

  if (!convexEnabled) {
    return (
      <View style={styles.screen}>
        <PageHero title="Notifications" />
        <EmptyState
          body="Configure Convex to receive notifications."
          icon="notifications-off-outline"
          title="Not connected"
        />
      </View>
    );
  }

  if (result === undefined) {
    return <LoadingScreen />;
  }

  if (result === null) {
    return (
      <View style={styles.screen}>
        <PageHero title="Notifications" />
        <EmptyState
          body="Sign in to view notifications."
          icon="notifications-off-outline"
          title="Sign in required"
        />
      </View>
    );
  }

  const notifications = result.notifications as Notification[];
  const unreadCount = result.unreadCount ?? 0;

  return (
    <View style={styles.screen}>
      <PageHero
        action={
          unreadCount > 0 ? (
            <Pressable onPress={handleMarkAll} style={styles.markAllButton}>
              <Text style={styles.markAllText}>Mark all read</Text>
            </Pressable>
          ) : undefined
        }
        subtitle={
          unreadCount > 0
            ? `${unreadCount} unread`
            : 'You’re all caught up.'
        }
        title="Notifications"
      />
      <FlatList
        contentContainerStyle={
          notifications.length === 0
            ? styles.emptyContainer
            : styles.listContent
        }
        data={notifications}
        keyExtractor={(item) => String(item._id)}
        ListEmptyComponent={
          <EmptyState
            body="When you get revs, results, or session locks, they’ll appear here."
            icon="notifications-outline"
            title="No notifications yet"
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
      onPress={onPress}
      style={[styles.row, isUnread ? styles.unread : null]}
    >
      <NotificationIcon notification={notification} />
      <View style={styles.rowText}>
        <Text style={styles.rowTitle}>
          {getNotificationTitle(notification)}
        </Text>
        <Text style={styles.rowSubtitle}>
          {getNotificationSubtitle(notification)}
        </Text>
        <Text style={styles.rowTime}>
          {formatRelativeTime(notification.createdAt)}
        </Text>
      </View>
      {isUnread ? <View style={styles.unreadDot} /> : null}
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
      <View style={[styles.iconBubble, { backgroundColor: colors.accentMuted }]}>
        <Ionicons color={colors.accent} name="trophy" size={18} />
      </View>
    );
  }
  return (
    <View
      style={[styles.iconBubble, { backgroundColor: 'rgba(251, 191, 36, 0.18)' }]}
    >
      <Ionicons color={colors.warning} name="lock-closed" size={18} />
    </View>
  );
}

function getNotificationTitle(notification: Notification): string {
  if (notification.type === 'rev_received') {
    const count = notification.totalRevCount ?? 1;
    const actor = notification.actors?.[0];
    const name =
      actor?.displayName ??
      actor?.username ??
      notification.actorDisplayName ??
      notification.actorUsername ??
      'Someone';
    if (count > 1) {
      return `${name} and ${count - 1} other${count - 1 === 1 ? '' : 's'} revved your pick`;
    }
    return `${name} revved your pick`;
  }
  if (notification.type === 'results_published') {
    const points = notification.points ?? 0;
    return `Results published — ${points} pt${points === 1 ? '' : 's'}`;
  }
  return 'Session locked';
}

function getNotificationSubtitle(notification: Notification): string {
  const session = notification.sessionType
    ? notification.sessionType.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase())
    : null;
  if (notification.type === 'rev_received') {
    if (notification.raceName) {
      return notification.raceName;
    }
    return 'Tap to view in feed';
  }
  if (notification.type === 'results_published') {
    return [session, notification.raceName].filter(Boolean).join(' · ');
  }
  return [session, notification.raceName].filter(Boolean).join(' · ');
}

const styles = StyleSheet.create({
  emptyContainer: {
    flex: 1,
  },
  iconBubble: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  listContent: {
    gap: 8,
    paddingBottom: 24,
  },
  markAllButton: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  markAllText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '700',
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  rowSubtitle: {
    color: colors.textMuted,
    fontSize: 12,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowTime: {
    color: colors.textMuted,
    fontSize: 10,
    marginTop: 2,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  unread: {
    borderColor: colors.accent,
  },
  unreadDot: {
    backgroundColor: colors.accent,
    borderRadius: 4,
    height: 8,
    width: 8,
  },
});
