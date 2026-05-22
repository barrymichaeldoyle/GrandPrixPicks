import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from 'convex/react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import type { FeedEvent } from '../components/feed/FeedEventCard';
import { FeedEventCard } from '../components/feed/FeedEventCard';
import { Avatar } from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { PageHero } from '../components/ui/PageHero';
import type { ConvexId } from '../integrations/convex/api';
import { api } from '../integrations/convex/api';
import type { HomeStackParamList } from '../navigation/types';
import { useMobileConfig } from '../providers/mobile-config';
import { colors, radii } from '../theme/tokens';

type Props = NativeStackScreenProps<HomeStackParamList, 'FeedEventDetail'>;

type RevUser = {
  userId: ConvexId<'users'>;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
};

export function FeedEventDetailScreen({ route }: Props) {
  const { convexEnabled } = useMobileConfig();
  const feedEventId = route.params.feedEventId as ConvexId<'feedEvents'>;

  const detail = useQuery(
    api.feed.getFeedEvent,
    convexEnabled ? { feedEventId } : 'skip',
  );
  const revUsers = useQuery(
    api.feed.getRevUsers,
    convexEnabled ? { feedEventId } : 'skip',
  );

  if (!convexEnabled) {
    return (
      <View style={styles.screen}>
        <PageHero title="Prediction" />
        <EmptyState
          body="Configure Convex to view this prediction."
          icon="cloud-offline-outline"
          title="Not connected"
        />
      </View>
    );
  }

  if (detail === undefined) {
    return <LoadingScreen />;
  }

  if (detail === null) {
    return (
      <View style={styles.screen}>
        <PageHero title="Prediction" />
        <EmptyState
          body="This feed item doesn’t exist or is no longer available."
          icon="alert-circle-outline"
          title="Not found"
        />
      </View>
    );
  }

  const event = detail.event as FeedEvent;
  const users = (revUsers ?? []) as RevUser[];

  return (
    <FlatList
      contentContainerStyle={styles.content}
      data={users}
      keyExtractor={(item) => String(item.userId)}
      ListEmptyComponent={
        revUsers === undefined ? null : (
          <Text style={styles.emptyRevs}>No revs yet.</Text>
        )
      }
      ListHeaderComponent={
        <View style={styles.headerWrap}>
          <FeedEventCard event={event} />
          <Text style={styles.sectionTitle}>
            Revs {users.length > 0 ? `(${users.length})` : ''}
          </Text>
        </View>
      }
      renderItem={({ item }) => <RevUserRow user={item} />}
      showsVerticalScrollIndicator={false}
      style={styles.screen}
    />
  );
}

function RevUserRow({ user }: { user: RevUser }) {
  const name = user.displayName ?? user.username ?? 'Unknown';
  return (
    <View style={styles.revRow}>
      <Avatar imageUrl={user.avatarUrl} name={name} size="md" />
      <View style={styles.revRowText}>
        <Text style={styles.revName}>{name}</Text>
        {user.username ? (
          <Text style={styles.revUsername}>@{user.username}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 8,
    paddingBottom: 32,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  emptyRevs: {
    color: colors.textMuted,
    fontSize: 13,
    paddingVertical: 16,
    textAlign: 'center',
  },
  headerWrap: {
    gap: 16,
    paddingBottom: 8,
  },
  revName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  revRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  revRowText: {
    flex: 1,
    gap: 2,
  },
  revUsername: {
    color: colors.textMuted,
    fontSize: 12,
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
  },
});
