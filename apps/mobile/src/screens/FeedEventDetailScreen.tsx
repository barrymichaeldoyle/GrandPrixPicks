import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from 'convex/react';

import type { FeedEvent } from '../components/feed/FeedEventCard';
import { FeedEventCard } from '../components/feed/FeedEventCard';
import { Avatar } from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import type { ConvexId } from '../integrations/convex/api';
import { api } from '../integrations/convex/api';
import type { HomeStackParamList } from '../navigation/types';
import { useMobileConfig } from '../providers/mobile-config';
import { FlatList, Text, View } from '../tw';

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
      <View className="flex-1 bg-page">
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
      <View className="flex-1 bg-page">
        <EmptyState
          body="This feed item doesn't exist or is no longer available."
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
      className="flex-1 bg-page"
      contentContainerClassName="px-4 pb-8 pt-3"
      data={users}
      keyExtractor={(item) => String(item.userId)}
      ListEmptyComponent={
        revUsers === undefined ? null : (
          <Text className="text-muted py-4 text-center text-[13px]">
            No revs yet.
          </Text>
        )
      }
      ListHeaderComponent={
        <View className="gap-[18px] pb-2">
          <FeedEventCard event={event} />
          <Text className="text-muted text-[10px] font-extrabold uppercase">
            Revs{users.length > 0 ? ` · ${users.length}` : ''}
          </Text>
        </View>
      }
      ItemSeparatorComponent={() => (
        <View className="ml-[52px] h-px bg-border" />
      )}
      renderItem={({ item }) => <RevUserRow user={item} />}
      showsVerticalScrollIndicator={false}
    />
  );
}

function RevUserRow({ user }: { user: RevUser }) {
  const name = user.displayName ?? user.username ?? 'Unknown';
  return (
    <View className="flex-row items-center gap-3 py-2.5">
      <Avatar imageUrl={user.avatarUrl} name={name} size="md" />
      <View className="flex-1 gap-0.5">
        <Text className="text-foreground text-sm font-bold">{name}</Text>
        {user.username ? (
          <Text className="text-muted text-xs">@{user.username}</Text>
        ) : null}
      </View>
    </View>
  );
}
