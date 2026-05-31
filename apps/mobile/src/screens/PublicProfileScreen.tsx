import { Ionicons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMutation, useQuery } from 'convex/react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/ui/Avatar';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { Numeral } from '../components/ui/Numeral';
import type { ConvexId } from '../integrations/convex/api';
import { api } from '../integrations/convex/api';
import type { ProfileStackParamList } from '../navigation/types';
import { colors, radii } from '../theme/tokens';

type Props = NativeStackScreenProps<ProfileStackParamList, 'PublicProfile'>;

const HAIRLINE = StyleSheet.hairlineWidth;

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

  if (profile === undefined) {
    return <LoadingScreen />;
  }
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
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <View style={styles.hero}>
        <Avatar
          imageUrl={profile.avatarUrl ?? undefined}
          name={displayName}
          size="lg"
        />
        <View style={styles.heroText}>
          <Text style={styles.displayName}>{displayName}</Text>
          {profile.username ? (
            <Text style={styles.username}>@{profile.username}</Text>
          ) : null}
        </View>
      </View>

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
          <Numeral variant="large">
            {followCounts?.followerCount ?? '—'}
          </Numeral>
          <Text style={styles.followLabel}>Followers</Text>
        </Pressable>
        <View style={styles.vDivider} />
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
          <Numeral variant="large">
            {followCounts?.followingCount ?? '—'}
          </Numeral>
          <Text style={styles.followLabel}>Following</Text>
        </Pressable>
      </View>

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

      {stats ? (
        <View style={styles.section}>
          <Text style={styles.sectionEyebrow}>Season stats</Text>
          <View style={styles.statRow}>
            <StatCell label="Season pts" value={stats.totalPoints} />
            <View style={styles.vDivider} />
            <StatCell
              label="Global rank"
              value={stats.seasonRank ? `#${stats.seasonRank}` : '—'}
            />
            <View style={styles.vDivider} />
            <StatCell label="Weekends" value={stats.weekendCount} />
            <View style={styles.vDivider} />
            <StatCell
              label="H2H rank"
              value={stats.h2hSeasonRank ? `#${stats.h2hSeasonRank}` : '—'}
            />
          </View>
        </View>
      ) : null}

      {profile.username ? (
        <Pressable
          onPress={() =>
            navigation.navigate('PredictionHistory', {
              username: profile.username as string,
            })
          }
          style={styles.historyLink}
        >
          <View style={styles.historyLinkText}>
            <Text style={styles.historyLinkLabel}>Picks history</Text>
            <Text style={styles.historyLinkSubtitle}>
              {isOwner
                ? 'Your weekend-by-weekend picks'
                : `@${profile.username}'s picks per weekend`}
            </Text>
          </View>
          <Ionicons
            color={colors.textMuted}
            name="chevron-forward"
            size={16}
          />
        </Pressable>
      ) : null}
    </ScrollView>
  );
}

function StatCell({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.statCell}>
      <Numeral variant="large">{value}</Numeral>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 22,
    paddingBottom: 40,
    paddingTop: 16,
  },
  displayName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
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
    borderColor: colors.buttonAccent,
  },
  followButtonText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '700',
  },
  followButtonTextActive: {
    color: colors.text,
  },
  followLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginTop: 2,
    textTransform: 'uppercase',
  },
  followRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  followStat: {
    alignItems: 'center',
    flex: 1,
    paddingVertical: 4,
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
  historyLink: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  historyLinkLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  historyLinkSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  historyLinkText: {
    flex: 1,
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    gap: 10,
  },
  sectionEyebrow: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  statCell: {
    alignItems: 'center',
    flex: 1,
    gap: 2,
    paddingVertical: 4,
  },
  statLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.4,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  statRow: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  username: {
    color: colors.textMuted,
    fontSize: 14,
  },
  vDivider: {
    backgroundColor: colors.border,
    height: 28,
    width: HAIRLINE,
  },
});
