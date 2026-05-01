import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useQuery } from 'convex/react';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import type { FeedEvent } from '../../components/feed/FeedEventCard';
import { FeedEventCard } from '../../components/feed/FeedEventCard';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import type { ConvexId } from '../../integrations/convex/api';
import { api } from '../../integrations/convex/api';
import type { LeaguesStackParamList } from '../../navigation/types';
import { colors, radii } from '../../theme/tokens';
import { useTypography } from '../../theme/typography';

type Props = NativeStackScreenProps<LeaguesStackParamList, 'LeagueDetail'>;
type Tab = 'leaderboard' | 'members' | 'feed';

export function LeagueDetailScreen({ route, navigation }: Props) {
  const { leagueSlug } = route.params;
  const { titleFontFamily } = useTypography();
  const [activeTab, setActiveTab] = useState<Tab>('leaderboard');

  const league = useQuery(api.leagues.getLeagueBySlug, { slug: leagueSlug });

  if (league === undefined) {
    return <LoadingScreen />;
  }
  if (league === null) {
    return (
      <View style={styles.screen}>
        <EmptyState icon="alert-circle-outline" title="League not found" />
      </View>
    );
  }

  const isAdmin = league.viewerRole === 'admin';

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text
            numberOfLines={1}
            style={[
              styles.title,
              titleFontFamily ? { fontFamily: titleFontFamily } : null,
            ]}
          >
            {league.name}
          </Text>
          <Text style={styles.meta}>
            {league.memberCount} member{league.memberCount !== 1 ? 's' : ''} ·
            Season {league.season}
          </Text>
          {league.description ? (
            <Text numberOfLines={2} style={styles.description}>
              {league.description}
            </Text>
          ) : null}
        </View>
        {isAdmin ? (
          <Pressable
            onPress={() =>
              navigation.navigate('LeagueSettings', { leagueSlug })
            }
            style={styles.settingsButton}
          >
            <Text style={styles.settingsButtonText}>Settings</Text>
          </Pressable>
        ) : null}
      </View>

      {/* Tab bar */}
      <View style={styles.tabs}>
        {(['leaderboard', 'members', 'feed'] as Tab[]).map((tab) => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={[styles.tab, activeTab === tab ? styles.tabActive : null]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab ? styles.tabTextActive : null,
              ]}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Tab content */}
      {activeTab === 'leaderboard' ? (
        <LeaderboardTab leagueId={league._id} />
      ) : activeTab === 'members' ? (
        <MembersTab leagueId={league._id} />
      ) : (
        <FeedTab leagueId={league._id} />
      )}
    </View>
  );
}

function LeaderboardTab({ leagueId }: { leagueId: ConvexId<'leagues'> }) {
  const result = useQuery(api.leaderboards.getLeagueCombinedSeasonLeaderboard, {
    leagueId,
    limit: 50,
  });

  if (result === undefined) {
    return <LoadingScreen />;
  }

  const { entries, viewerEntry } = result;

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={entries}
      keyExtractor={(item) => item.userId}
      ListEmptyComponent={
        <EmptyState
          body="No scores yet — predictions will appear here after sessions are scored."
          icon="trophy-outline"
          title="No standings yet"
        />
      }
      ListFooterComponent={
        viewerEntry && !entries.some((e) => e.isViewer) ? (
          <LeaderboardRow entry={viewerEntry} pinned />
        ) : null
      }
      renderItem={({ item }) => <LeaderboardRow entry={item} />}
      showsVerticalScrollIndicator={false}
    />
  );
}

function LeaderboardRow({
  entry,
  pinned = false,
}: {
  entry: {
    rank: number;
    displayName?: string | null;
    username: string;
    avatarUrl?: string | null;
    points: number;
    top5Points: number;
    h2hPoints: number;
    isViewer: boolean;
  };
  pinned?: boolean;
}) {
  const name = entry.displayName ?? entry.username;
  return (
    <View
      style={[
        styles.leaderRow,
        entry.isViewer ? styles.leaderRowViewer : null,
        pinned ? styles.leaderRowPinned : null,
      ]}
    >
      <Text style={styles.leaderRank}>#{entry.rank}</Text>
      <Avatar imageUrl={entry.avatarUrl} name={name} size="sm" />
      <Text numberOfLines={1} style={styles.leaderName}>
        {name}
      </Text>
      <View style={styles.leaderPoints}>
        <Text style={styles.leaderPtsMain}>{entry.points}</Text>
        <Text style={styles.leaderPtsSub}>
          {entry.top5Points}+{entry.h2hPoints}
        </Text>
      </View>
    </View>
  );
}

function MembersTab({ leagueId }: { leagueId: ConvexId<'leagues'> }) {
  const members = useQuery(api.leagues.getLeagueMembers, {
    leagueId,
  });

  if (members === undefined) {
    return <LoadingScreen />;
  }

  return (
    <FlatList
      contentContainerStyle={styles.listContent}
      data={members}
      keyExtractor={(item) => item.userId}
      ListEmptyComponent={
        <EmptyState icon="people-outline" title="No members found" />
      }
      renderItem={({ item }) => {
        const name = item.displayName ?? item.username;
        return (
          <View style={styles.memberRow}>
            <Avatar imageUrl={item.avatarUrl} name={name} size="md" />
            <Text numberOfLines={1} style={styles.memberName}>
              {name}
            </Text>
            {item.role === 'admin' ? (
              <View style={styles.adminBadge}>
                <Text style={styles.adminBadgeText}>Admin</Text>
              </View>
            ) : null}
          </View>
        );
      }}
      showsVerticalScrollIndicator={false}
    />
  );
}

function FeedTab({ leagueId }: { leagueId: ConvexId<'leagues'> }) {
  const result = useQuery(api.feed.getLeagueFeed, {
    leagueId,
  });

  if (result === undefined) {
    return <LoadingScreen />;
  }

  const events = (result?.events ?? []) as FeedEvent[];

  return (
    <FlatList
      contentContainerStyle={
        events.length === 0 ? styles.emptyContainer : styles.listContent
      }
      data={events}
      keyExtractor={(item) => item._id}
      ListEmptyComponent={
        <EmptyState
          body="League activity will appear here after sessions are scored."
          icon="pulse-outline"
          title="Nothing here yet"
        />
      }
      renderItem={({ item }) => <FeedEventCard event={item} />}
      showsVerticalScrollIndicator={false}
    />
  );
}

const styles = StyleSheet.create({
  adminBadge: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  adminBadgeText: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: '700',
  },
  description: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  emptyContainer: {
    flex: 1,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 10,
  },
  headerInfo: {
    flex: 1,
    gap: 3,
  },
  leaderName: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
  },
  leaderPoints: {
    alignItems: 'flex-end',
  },
  leaderPtsMain: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  leaderPtsSub: {
    color: colors.textMuted,
    fontSize: 10,
  },
  leaderRank: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '700',
    width: 32,
  },
  leaderRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  leaderRowPinned: {
    borderColor: colors.accent,
    marginTop: 4,
  },
  leaderRowViewer: {
    borderColor: colors.accent,
  },
  listContent: {
    gap: 8,
    paddingBottom: 24,
  },
  memberName: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
  },
  memberRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    padding: 12,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  settingsButton: {
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  settingsButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  tab: {
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 7,
  },
  tabActive: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  tabTextActive: {
    color: colors.accent,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
