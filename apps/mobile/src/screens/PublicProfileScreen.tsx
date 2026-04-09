import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery } from 'convex/react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Avatar } from '../components/ui/Avatar';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import type { ConvexId } from '../integrations/convex/api';
import { api } from '../integrations/convex/api';
import type { ProfileStackParamList } from '../navigation/types';
import { colors, radii } from '../theme/tokens';

type Props = NativeStackScreenProps<ProfileStackParamList, 'PublicProfile'>;

export function PublicProfileScreen({ route, navigation }: Props) {
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

  if (profile === undefined) {return <LoadingScreen />;}
  if (profile === null) {
    return (
      <View style={styles.screen}>
        <Text style={styles.errorText}>User not found.</Text>
      </View>
    );
  }

  const isOwner = me ? profile._id === me._id : false;
  const displayName = profile.displayName ?? profile.username ?? username;

  async function handleFollowToggle() {
    if (!profile) {return;}
    if (isFollowing) {
      await unfollow({ followeeId: profile._id as ConvexId<'users'> });
    } else {
      await follow({ followeeId: profile._id as ConvexId<'users'> });
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      {/* Hero */}
      <View style={styles.hero}>
        <Avatar
          name={displayName}
          size="lg"
          src={profile.avatarUrl ?? undefined}
        />
        <View style={styles.heroText}>
          <Text style={styles.displayName}>{displayName}</Text>
          {profile.username ? (
            <Text style={styles.username}>@{profile.username}</Text>
          ) : null}
        </View>
      </View>

      {/* Follow counts */}
      <View style={styles.followRow}>
        <Pressable
          onPress={() =>
            profile.username
              ? navigation.navigate('FollowerList', {
                  username: profile.username,
                  tab: 'followers',
                })
              : null
          }
          style={styles.followStat}
        >
          <Text style={styles.followNumber}>
            {followCounts?.followerCount ?? '—'}
          </Text>
          <Text style={styles.followLabel}>Followers</Text>
        </Pressable>
        <View style={styles.followDivider} />
        <Pressable
          onPress={() =>
            profile.username
              ? navigation.navigate('FollowerList', {
                  username: profile.username,
                  tab: 'following',
                })
              : null
          }
          style={styles.followStat}
        >
          <Text style={styles.followNumber}>
            {followCounts?.followingCount ?? '—'}
          </Text>
          <Text style={styles.followLabel}>Following</Text>
        </Pressable>
      </View>

      {/* Follow / Unfollow button */}
      {!isOwner && isFollowing !== undefined ? (
        <Pressable
          onPress={() => void handleFollowToggle()}
          style={[
            styles.followButton,
            isFollowing ? styles.followButtonActive : null,
          ]}
        >
          <Text
            style={[
              styles.followButtonText,
              isFollowing ? styles.followButtonTextActive : null,
            ]}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </Pressable>
      ) : null}

      {/* Stats */}
      {stats ? (
        <View style={styles.statsGrid}>
          <StatBox label="Season pts" value={stats.totalPoints} />
          <StatBox
            label="Global rank"
            value={stats.seasonRank ? `#${stats.seasonRank}` : '—'}
          />
          <StatBox label="Weekends" value={stats.weekendCount} />
          <StatBox
            label="H2H rank"
            value={stats.h2hSeasonRank ? `#${stats.h2hSeasonRank}` : '—'}
          />
        </View>
      ) : null}
    </ScrollView>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 20,
    paddingBottom: 40,
    paddingTop: 16,
  },
  displayName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '700',
  },
  errorText: {
    color: colors.error,
    fontSize: 14,
    padding: 16,
  },
  followButton: {
    alignItems: 'center',
    borderColor: colors.accent,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    paddingVertical: 10,
  },
  followButtonActive: {
    backgroundColor: colors.buttonAccent,
  },
  followButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  followButtonTextActive: {
    color: colors.page,
  },
  followDivider: {
    backgroundColor: colors.border,
    height: 32,
    width: 1,
  },
  followLabel: {
    color: colors.textMuted,
    fontSize: 12,
  },
  followNumber: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  followRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
  },
  followStat: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
  },
  hero: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  heroText: {
    flex: 1,
    gap: 4,
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
    paddingHorizontal: 16,
  },
  statBox: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    flex: 1,
    gap: 4,
    paddingVertical: 14,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  statValue: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '800',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  username: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
