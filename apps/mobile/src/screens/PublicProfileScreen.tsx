import { useMutation, useQuery } from 'convex/react';

import { Avatar } from '../components/ui/Avatar';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { Numeral } from '../components/ui/Numeral';
import type { ConvexId } from '../integrations/convex/api';
import { api } from '../integrations/convex/api';
import { Pressable, ScrollView, Text, View } from '../tw';

// Lightweight player view reachable from the Feed and Leaderboard stacks.
// Only needs the username param, so it is typed independently of any stack.
type Props = {
  route: { params: { username: string } };
};

export function PublicProfileScreen({ route }: Props) {
  const { username } = route.params;

  const profile = useQuery(api.users.getProfileByUsername, { username });
  const me = useQuery(api.users.me);
  const isFollowing = useQuery(
    api.follows.isFollowing,
    profile ? { followeeId: profile._id as ConvexId<'users'> } : 'skip',
  );
  const followCounts = useQuery(
    api.follows.getFollowCounts,
    profile ? { userId: profile._id as ConvexId<'users'> } : 'skip',
  );
  const stats = useQuery(
    api.users.getUserStats,
    profile ? { userId: profile._id as ConvexId<'users'> } : 'skip',
  );

  const follow = useMutation(api.follows.follow);
  const unfollow = useMutation(api.follows.unfollow);

  if (profile === undefined) {
    return <LoadingScreen />;
  }
  if (profile === null) {
    return (
      <View className="flex-1 bg-page px-4">
        <Text className="p-4 text-sm text-error">User not found.</Text>
      </View>
    );
  }

  const isOwner = me ? profile._id === me._id : false;
  const displayName = profile.displayName ?? profile.username ?? username;

  async function handleFollowToggle() {
    if (!profile) {
      return;
    }
    if (isFollowing) {
      await unfollow({ followeeId: profile._id as ConvexId<'users'> });
    } else {
      await follow({ followeeId: profile._id as ConvexId<'users'> });
    }
  }

  return (
    <ScrollView
      className="flex-1 bg-page px-4"
      contentContainerClassName="gap-[22px] pb-10 pt-4"
    >
      <View className="flex-row items-center gap-4">
        <Avatar
          imageUrl={profile.avatarUrl ?? undefined}
          name={displayName}
          size="lg"
        />
        <View className="flex-1 gap-1">
          <Text className="text-foreground text-[22px] font-extrabold">
            {displayName}
          </Text>
          {profile.username ? (
            <Text className="text-muted text-sm">@{profile.username}</Text>
          ) : null}
        </View>
      </View>

      <View className="flex-row items-center justify-around">
        <View className="flex-1 items-center py-1">
          <Numeral variant="large">
            {followCounts?.followerCount ?? '—'}
          </Numeral>
          <Text className="text-muted mt-0.5 text-[11px] font-semibold uppercase">
            Followers
          </Text>
        </View>
        <View className="h-7 w-px bg-border" />
        <View className="flex-1 items-center py-1">
          <Numeral variant="large">
            {followCounts?.followingCount ?? '—'}
          </Numeral>
          <Text className="text-muted mt-0.5 text-[11px] font-semibold uppercase">
            Following
          </Text>
        </View>
      </View>

      {!isOwner && isFollowing !== undefined ? (
        <Pressable
          className={`items-center rounded-lg border py-2.5 ${
            isFollowing
              ? 'border-button-accent bg-button-accent'
              : 'border-accent'
          }`}
          onPress={() => void handleFollowToggle()}
        >
          <Text
            className={`text-sm font-bold ${
              isFollowing ? 'text-foreground' : 'text-accent'
            }`}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </Pressable>
      ) : null}

      {stats ? (
        <View className="gap-2.5">
          <Text className="text-muted text-[10px] font-extrabold uppercase">
            Season stats
          </Text>
          <View className="flex-row items-center">
            <StatCell label="Season pts" value={stats.totalPoints} />
            <View className="h-7 w-px bg-border" />
            <StatCell
              label="Global rank"
              value={stats.seasonRank ? `#${stats.seasonRank}` : '—'}
            />
            <View className="h-7 w-px bg-border" />
            <StatCell label="Weekends" value={stats.weekendCount} />
            <View className="h-7 w-px bg-border" />
            <StatCell
              label="H2H rank"
              value={stats.h2hSeasonRank ? `#${stats.h2hSeasonRank}` : '—'}
            />
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <View className="flex-1 items-center gap-0.5 py-1">
      <Numeral variant="large">{value}</Numeral>
      <Text className="text-muted text-center text-[10px] font-bold uppercase">
        {label}
      </Text>
    </View>
  );
}
