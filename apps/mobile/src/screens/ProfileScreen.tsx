import { useClerk, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from 'convex/react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/ui/Avatar';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { api } from '../integrations/convex/api';
import type { ConvexId } from '../integrations/convex/api';
import { useMobileConfig } from '../providers/mobile-config';
import { colors, radii } from '../theme/tokens';
import { useTypography } from '../theme/typography';
import type { ProfileStackParamList } from '../navigation/types';

export function ProfileScreen() {
  const { clerkEnabled } = useMobileConfig();
  const { titleFontFamily } = useTypography();

  if (!clerkEnabled) {
    return (
      <View style={styles.screen}>
        <Text
          style={[
            styles.title,
            titleFontFamily ? { fontFamily: titleFontFamily } : null,
          ]}
        >
          Profile
        </Text>
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons
              color={colors.accentHover}
              name="information-circle-outline"
              size={18}
            />
            <Text style={styles.infoTitle}>Sign-in not configured</Text>
          </View>
          <Text style={styles.body}>
            Add your Clerk publishable key in mobile env to enable account
            sign-in.
          </Text>
        </View>
      </View>
    );
  }

  return <SignedInProfileScreen />;
}

function SignedInProfileScreen() {
  const navigation = useNavigation<NavigationProp<ProfileStackParamList>>();
  const { signOut } = useClerk();
  const { user: clerkUser } = useUser();
  const me = useQuery(api.users.me);
  const followCounts = useQuery(
    api.follows.getFollowCounts,
    me ? { userId: me._id as ConvexId<'users'> } : 'skip',
  );
  const stats = useQuery(
    api.users.getUserStats,
    me ? { userId: me._id as ConvexId<'users'> } : 'skip',
  );

  if (me === undefined) {return <LoadingScreen />;}

  const displayName =
    me?.displayName ?? clerkUser?.fullName ?? me?.username ?? 'You';
  const avatarUrl = me?.avatarUrl ?? clerkUser?.imageUrl ?? undefined;
  const username = me?.username;

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      style={styles.screen}
    >
      {/* Avatar + name */}
      <View style={styles.hero}>
        <Avatar size="lg" src={avatarUrl} name={displayName} />
        <View style={styles.heroText}>
          <Text style={styles.displayName}>{displayName}</Text>
          {username ? (
            <Text style={styles.username}>@{username}</Text>
          ) : null}
        </View>
      </View>

      {/* Follow counts */}
      <View style={styles.followRow}>
        <Pressable
          onPress={() =>
            username
              ? navigation.navigate('FollowerList', {
                  username,
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
            username
              ? navigation.navigate('FollowerList', {
                  username,
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

      {/* Stats grid */}
      {stats ? (
        <View style={styles.statsGrid}>
          <StatBox label="Season pts" value={stats.totalPoints} />
          <StatBox
            label="Global rank"
            value={
              stats.seasonRank
                ? `#${stats.seasonRank}`
                : '—'
            }
          />
          <StatBox label="Weekends" value={stats.weekendCount} />
          <StatBox
            label="H2H rank"
            value={
              stats.h2hSeasonRank
                ? `#${stats.h2hSeasonRank}`
                : '—'
            }
          />
        </View>
      ) : null}

      {/* Sign out */}
      <Pressable
        onPress={() => void signOut()}
        style={styles.signOutButton}
      >
        <Ionicons color={colors.textMuted} name="log-out-outline" size={16} />
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

function StatBox({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) {
  return (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
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
  infoCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.xl,
    borderWidth: 1,
    gap: 8,
    padding: 14,
  },
  infoRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  infoTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
    paddingHorizontal: 16,
  },
  signOutButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 12,
  },
  signOutText: {
    color: colors.textMuted,
    fontSize: 14,
    fontWeight: '600',
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
  title: {
    color: colors.text,
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.2,
    lineHeight: 38,
  },
  username: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
