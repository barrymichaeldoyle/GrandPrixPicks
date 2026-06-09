import { useClerk, useUser } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from 'convex/react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/ui/Avatar';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { Numeral } from '../components/ui/Numeral';
import { api } from '../integrations/convex/api';
import type { ConvexId } from '../integrations/convex/api';
import { useMobileConfig } from '../providers/mobile-config';
import { colors } from '../theme/tokens';
import type { ProfileStackParamList } from '../navigation/types';

const HAIRLINE = StyleSheet.hairlineWidth;

export function ProfileScreen() {
  const { clerkEnabled } = useMobileConfig();

  if (!clerkEnabled) {
    return (
      <View style={styles.screen}>
        <View style={styles.signedOutBlock}>
          <Text style={styles.eyebrow}>Profile</Text>
          <Text style={styles.title}>Sign-in not configured</Text>
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

  if (me === undefined) {
    return <LoadingScreen />;
  }

  const displayName =
    me?.displayName ?? clerkUser?.fullName ?? me?.username ?? 'You';
  const avatarUrl = me?.avatarUrl ?? clerkUser?.imageUrl ?? undefined;
  const username = me?.username;

  return (
    <ScrollView contentContainerStyle={styles.content} style={styles.screen}>
      <View style={styles.hero}>
        <Avatar imageUrl={avatarUrl} name={displayName} size="lg" />
        <View style={styles.heroText}>
          <Text style={styles.displayName}>{displayName}</Text>
          {username ? <Text style={styles.username}>@{username}</Text> : null}
        </View>
      </View>

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
          <Numeral variant="large">
            {followCounts?.followerCount ?? '—'}
          </Numeral>
          <Text style={styles.followLabel}>Followers</Text>
        </Pressable>
        <View style={styles.vDivider} />
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
          <Numeral variant="large">
            {followCounts?.followingCount ?? '—'}
          </Numeral>
          <Text style={styles.followLabel}>Following</Text>
        </Pressable>
      </View>

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

      <View style={styles.section}>
        <Text style={styles.sectionEyebrow}>Shortcuts</Text>
        <View>
          {username ? (
            <>
              <LinkRow
                icon="documents-outline"
                label="Picks history"
                onPress={() =>
                  navigation.navigate('PredictionHistory', { username })
                }
                subtitle="Every weekend you've picked"
              />
              <View style={styles.divider} />
            </>
          ) : null}
          <LinkRow
            icon="trophy-outline"
            label="Leaderboard"
            onPress={() => navigation.navigate('Leaderboard')}
            subtitle="Season standings"
          />
          <View style={styles.divider} />
          <LinkRow
            icon="settings-outline"
            label="Settings"
            onPress={() => navigation.navigate('Settings')}
            subtitle="Profile, notifications, sign out"
          />
        </View>
      </View>

      <Pressable
        hitSlop={8}
        onPress={() => void signOut()}
        style={styles.signOutLink}
      >
        <Ionicons color={colors.textMuted} name="log-out-outline" size={14} />
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
    </ScrollView>
  );
}

function LinkRow({
  icon,
  label,
  subtitle,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.linkRow}>
      <Ionicons color={colors.accent} name={icon} size={18} />
      <View style={styles.linkText}>
        <Text style={styles.linkLabel}>{label}</Text>
        <Text style={styles.linkSubtitle}>{subtitle}</Text>
      </View>
      <Ionicons color={colors.textMuted} name="chevron-forward" size={16} />
    </Pressable>
  );
}

function StatCell({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={styles.statCell}>
      <Numeral variant="large">{value}</Numeral>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  content: {
    gap: 24,
    paddingBottom: 40,
    paddingTop: 16,
  },
  displayName: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  divider: {
    backgroundColor: colors.border,
    height: HAIRLINE,
    marginLeft: 30,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
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
    gap: 0,
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
  linkLabel: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  linkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    paddingVertical: 12,
  },
  linkSubtitle: {
    color: colors.textMuted,
    fontSize: 11,
    marginTop: 2,
  },
  linkText: {
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
  signedOutBlock: {
    gap: 4,
    paddingTop: 16,
  },
  signOutLink: {
    alignItems: 'center',
    alignSelf: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingVertical: 8,
  },
  signOutText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
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
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
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
