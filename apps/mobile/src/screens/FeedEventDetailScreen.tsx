import type { ReactionType } from '@grandprixpicks/shared/reactions';
import {
  REACTION_BY_TYPE,
  REACTION_OPTIONS,
} from '@grandprixpicks/shared/reactions';
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

type ReactionUser = {
  userId: ConvexId<'users'>;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  reactionType: ReactionType;
};

type ReactionListItem =
  | {
      kind: 'header';
      reactionType: ReactionType;
      count: number;
    }
  | { kind: 'user'; user: ReactionUser };

export function FeedEventDetailScreen({ route }: Props) {
  const { convexEnabled } = useMobileConfig();
  const feedEventId = route.params.feedEventId as ConvexId<'feedEvents'>;

  const detail = useQuery(
    api.feed.getFeedEvent,
    convexEnabled ? { feedEventId } : 'skip',
  );
  const reactionUsers = useQuery(
    api.feed.getReactionUsers,
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
  const users = (reactionUsers ?? []) as ReactionUser[];
  const listItems: ReactionListItem[] = REACTION_OPTIONS.flatMap((reaction) => {
    const matchingUsers = users.filter(
      (user) => user.reactionType === reaction.type,
    );
    if (matchingUsers.length === 0) {
      return [];
    }
    return [
      {
        kind: 'header' as const,
        reactionType: reaction.type,
        count: matchingUsers.length,
      },
      ...matchingUsers.map((user) => ({
        kind: 'user' as const,
        user,
      })),
    ];
  });

  return (
    <FlatList
      className="flex-1 bg-page"
      contentContainerClassName="px-4 pb-8 pt-3"
      contentInsetAdjustmentBehavior="automatic"
      data={listItems}
      keyExtractor={(item) =>
        item.kind === 'header'
          ? `header-${item.reactionType}`
          : String(item.user.userId)
      }
      ListEmptyComponent={
        reactionUsers === undefined ? null : (
          <Text className="text-muted py-4 text-center text-[13px]">
            No reactions yet.
          </Text>
        )
      }
      ListHeaderComponent={
        <View className="gap-[18px] pb-2">
          <FeedEventCard event={event} />
          <Text className="text-muted text-[10px] font-extrabold uppercase">
            Reactions{users.length > 0 ? ` · ${users.length}` : ''}
          </Text>
        </View>
      }
      renderItem={({ item }) =>
        item.kind === 'header' ? (
          <ReactionSectionHeader
            count={item.count}
            reactionType={item.reactionType}
          />
        ) : (
          <ReactionUserRow user={item.user} />
        )
      }
      showsVerticalScrollIndicator={false}
    />
  );
}

function ReactionSectionHeader({
  reactionType,
  count,
}: {
  reactionType: ReactionType;
  count: number;
}) {
  const reaction = REACTION_BY_TYPE[reactionType];
  return (
    <View className="mt-2 flex-row items-center gap-2 rounded-md bg-surface px-3 py-2">
      <Text className="text-lg">{reaction.emoji}</Text>
      <Text className="text-foreground flex-1 text-xs font-bold">
        {reaction.label}
      </Text>
      <Text
        className="text-muted text-xs font-semibold"
        style={{ fontVariant: ['tabular-nums'] }}
      >
        {count}
      </Text>
    </View>
  );
}

function ReactionUserRow({ user }: { user: ReactionUser }) {
  const name = user.displayName ?? user.username ?? 'Unknown';
  return (
    <View className="ml-3 flex-row items-center gap-3 border-b border-border py-2.5">
      <Avatar imageUrl={user.avatarUrl} name={name} size="md" />
      <View className="flex-1 gap-0.5">
        <Text className="text-foreground text-sm font-bold">{name}</Text>
        {user.username ? (
          <Text className="text-muted text-xs">@{user.username}</Text>
        ) : null}
      </View>
      <Text className="pr-2 text-base">
        {REACTION_BY_TYPE[user.reactionType].emoji}
      </Text>
    </View>
  );
}
