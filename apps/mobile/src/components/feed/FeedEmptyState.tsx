import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';

import type { ConvexId } from '../../integrations/convex/api';
import { api } from '../../integrations/convex/api';
import { useQuery } from '../../integrations/convex/query';
import type { RootTabParamList } from '../../navigation/types';
import { colors } from '../../theme/tokens';
import { Pressable, Text, View } from '../../tw';
import { Avatar } from '../ui/Avatar';
import { FollowButton } from '../ui/FollowButton';
import { Ionicons } from '../ui/Ionicons';

/**
 * What a signed-in player sees under the picks card when the activity stream
 * has nothing in it, following web's `FeedContent` branches:
 *
 * - league-mates to follow: already on screen in `SuggestedFollowsSection`, so
 *   nothing here, rather than the same three people twice;
 * - following nobody: the season's top players, with a Follow button each;
 * - following people who have not scored yet: one line saying so.
 */
export function FeedEmptyState() {
  const navigation = useNavigation<NavigationProp<RootTabParamList>>();
  const followedIds = useQuery(api.follows.getViewerFollowedIds, {});
  const suggested = useQuery(api.follows.getSuggestedLeagueMembersToFollow, {
    limit: 3,
  });
  const topPlayers = useQuery(api.leaderboards.getCombinedSeasonLeaderboard, {
    limit: 6,
  });

  /*
   * Which branch this mount settled on, held once chosen. Following the first
   * player in the list would otherwise swap the list for "No recent activity"
   * under the reader's thumb, before they reach the second Follow button.
   * The list goes when the feed fills and this component unmounts.
   */
  const [mode, setMode] = useState<'none' | 'quiet' | 'discover'>();
  if (
    mode === undefined &&
    followedIds !== undefined &&
    suggested !== undefined
  ) {
    // Guarded render-time state adjustment, as `SuggestedFollowsSection` does.
    // oxlint-disable-next-line react/set-state-in-effect
    setMode(
      suggested.length > 0
        ? 'none'
        : followedIds.length > 0
          ? 'quiet'
          : 'discover',
    );
  }

  if (mode === undefined || mode === 'none') {
    return null;
  }

  if (mode === 'quiet') {
    return (
      <View className="mx-4 mt-3 rounded-lg border border-border bg-surface px-4 py-4">
        <Text className="text-foreground text-center text-sm font-semibold">
          No recent activity yet
        </Text>
        <Text className="text-muted mt-1 text-center text-sm leading-5">
          The players in your feed have not posted any new scores yet.
        </Text>
      </View>
    );
  }

  const top = (topPlayers?.entries ?? [])
    .filter((player) => !player.isViewer)
    .slice(0, 5);

  return (
    <View className="mx-4 mt-3 overflow-hidden rounded-lg border border-border bg-surface">
      <View className="px-4 py-4">
        <Text className="text-foreground text-base font-semibold">
          Find players to follow
        </Text>
        <Text className="text-muted mt-1 text-sm leading-5">
          Follow players to see their picks and results here.
        </Text>
      </View>
      {top.length > 0 ? (
        <>
          <Text className="text-muted border-t border-border px-4 pt-3 text-xs font-medium">
            Top players this season
          </Text>
          <View className="mt-1">
            {top.map((player, index) => (
              <View
                className={`flex-row items-center gap-2.5 px-4 py-2.5 ${
                  index > 0 ? 'border-t border-border/40' : ''
                }`}
                key={String(player.userId)}
              >
                <Pressable
                  accessibilityLabel={`${player.username}, rank ${player.rank}, ${player.points.toLocaleString()} points`}
                  accessibilityRole="button"
                  className="min-w-0 flex-1 flex-row items-center gap-2.5"
                  onPress={() =>
                    navigation.navigate('HomeTab', {
                      screen: 'PublicProfile',
                      params: { username: player.username },
                    })
                  }
                >
                  <Avatar
                    imageUrl={player.avatarUrl}
                    name={player.username}
                    size="sm"
                  />
                  <View className="min-w-0 flex-1">
                    <Text
                      className="text-foreground text-sm font-semibold"
                      numberOfLines={1}
                    >
                      {player.username}
                    </Text>
                    <Text
                      className="text-muted mt-px text-xs"
                      numberOfLines={1}
                    >
                      {`Rank #${player.rank} · ${player.points.toLocaleString()} pts`}
                    </Text>
                  </View>
                </Pressable>
                <FollowButton
                  compact
                  followeeId={player.userId as ConvexId<'users'>}
                  source="feed_empty_state"
                />
              </View>
            ))}
          </View>
        </>
      ) : null}
      <Pressable
        accessibilityRole="button"
        className="flex-row items-center justify-center gap-2 border-t border-border py-3 active:bg-surface-elevated"
        onPress={() =>
          navigation.navigate('LeaderboardTab', {
            screen: 'LeaderboardMain',
            params: { time: 'season' },
          })
        }
      >
        <Ionicons color={colors.accent} name="trophy-outline" size={15} />
        <Text className="text-sm font-semibold text-accent">
          See full leaderboard
        </Text>
      </Pressable>
    </View>
  );
}
