import { Ionicons } from '@expo/vector-icons';
import { reasonText } from '@grandprixpicks/shared/follows';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useState } from 'react';

import { Avatar } from '../ui/Avatar';
import { FollowButton } from '../ui/FollowButton';
import type { ConvexId } from '../../integrations/convex/api';
import { api } from '../../integrations/convex/api';
import { useQuery } from '../../integrations/convex/query';
import { useIsSignedIn } from '../../lib/useIsSignedIn';
import type { HomeStackParamList } from '../../navigation/types';
import { colors } from '../../theme/tokens';
import { Pressable, Text, View } from '../../tw';

/**
 * Who to follow, ranked by mutual followers and shared leagues — matching
 * web's `SuggestedFollowsCard`, not mobile's old `TopPlayersToFollow` (season
 * leaderboard rank, shown only over an empty feed). Web keeps this visible
 * on every load, in the rail beside the dashboard; mobile has no rail, so it
 * sits directly under the picks card instead, same as web's placement logic
 * (context for the picks a player just made or is about to).
 */
export function SuggestedFollowsSection() {
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
  const isSignedIn = useIsSignedIn();
  const suggested = useQuery(
    api.follows.getSuggestedLeagueMembersToFollow,
    isSignedIn ? { limit: 3 } : 'skip',
  );

  /*
   * Following someone drops them from this reactive query's result and pulls
   * a replacement in behind them — refilling the list is what causes follow
   * fatigue, so the mount pins whoever it showed first. Matches web.
   */
  const [pinned, setPinned] = useState<typeof suggested>(undefined);
  if (pinned === undefined && suggested && suggested.length > 0) {
    // Guarded render-time state adjustment, not an effect: avoids painting
    // a blank section for one frame while never accepting a reactive swap.
    // oxlint-disable-next-line react/set-state-in-effect
    setPinned(suggested);
  }
  const rows = pinned ?? suggested;

  if (!rows || rows.length === 0) {
    return null;
  }

  return (
    <View className="mt-1 rounded-lg border border-border bg-surface p-4">
      <View className="mb-2 flex-row items-center gap-2">
        <Ionicons color={colors.accent} name="person-add-outline" size={16} />
        <Text className="text-muted text-xs font-medium">
          Players to follow
        </Text>
      </View>
      <View>
        {rows.map((user, i) => (
          <View key={String(user._id)}>
            {i > 0 ? <View className="h-px bg-border/40" /> : null}
            <View className="flex-row items-center gap-2.5 py-2">
              <Pressable
                accessibilityRole="button"
                className="flex-1 flex-row items-center gap-2.5"
                onPress={() =>
                  user.username
                    ? navigation.navigate('PublicProfile', {
                        username: user.username,
                      })
                    : null
                }
              >
                <Avatar
                  imageUrl={user.avatarUrl}
                  name={user.displayName}
                  size="sm"
                />
                <View className="min-w-0 flex-1">
                  <Text
                    className="text-foreground text-sm font-semibold"
                    numberOfLines={1}
                  >
                    {user.displayName}
                  </Text>
                  <Text className="text-muted mt-px text-xs" numberOfLines={1}>
                    {reasonText(user)}
                  </Text>
                </View>
              </Pressable>
              <FollowButton
                compact
                followeeId={user._id as ConvexId<'users'>}
                source="suggested_follows"
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
