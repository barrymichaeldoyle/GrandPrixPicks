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

const HAIRLINE = StyleSheet.hairlineWidth;
const TABS: ReadonlyArray<Tab> = ['leaderboard', 'members', 'feed'];

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
      <View style={styles.header}>
        <View style={styles.headerInfo}>
          <Text style={styles.eyebrow}>League</Text>
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
            hitSlop={8}
            onPress={() =>
              navigation.navigate('LeagueSettings', { leagueSlug })
            }
          >
            <Text style={styles.settingsLink}>Settings</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.tabs}>
        {TABS.map((tab) => {
          const active = activeTab === tab;
          return (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(tab)}
              style={styles.tab}
            >
              <Text
                style={[styles.tabText, active ? styles.tabTextActive : null]}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
              <View
                style={[
                  styles.tabUnderline,
                  active ? styles.tabUnderlineActive : null,
                ]}
              />
            </Pressable>
          );
        })}
      </View>

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
      ItemSeparatorComponent={() => <View style={styles.divider} />}
      ListEmptyComponent={
        <EmptyState
          body="No scores yet. Predictions will appear here after sessions are scored."
          icon="trophy-outline"
          title="No standings yet"
        />
      }
      ListFooterComponent={
        viewerEntry && !entries.some((e) => e.isViewer) ? (
          <View style={styles.pinnedFooter}>
            <Text style={styles.pinnedLabel}>Your rank</Text>
            <LeaderboardRow entry={viewerEntry} />
          </View>
        ) : null
      }
      renderItem={({ item }) => <LeaderboardRow entry={item} />}
      showsVerticalScrollIndicator={false}
    />
  );
}

function LeaderboardRow({
  entry,
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
}) {
  const name = entry.displayName ?? entry.username;
  return (
    <View style={[styles.leaderRow, entry.isViewer ? styles.viewerTint : null]}>
      <Text style={styles.leaderRank}>#{entry.rank}</Text>
      <Avatar imageUrl={entry.avatarUrl} name={name} size="sm" />
      <Text numberOfLines={1} style={styles.leaderName}>
        {name}
      </Text>
      {entry.isViewer ? <Text style={styles.youTag}>YOU</Text> : null}
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
      ItemSeparatorComponent={() => <View style={styles.divider} />}
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
              <Text style={styles.adminTag}>ADMIN</Text>
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
        events.length === 0 ? styles.emptyContainer : styles.feedListContent
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
  adminTag: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  description: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 4,
  },
  divider: {
    backgroundColor: colors.border,
    height: HAIRLINE,
    marginLeft: 12,
  },
  emptyContainer: {
    flex: 1,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  feedListContent: {
    gap: 8,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  leaderName: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  leaderPoints: {
    alignItems: 'flex-end',
  },
  leaderPtsMain: {
    color: colors.text,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  leaderPtsSub: {
    color: colors.textMuted,
    fontSize: 10,
  },
  leaderRank: {
    color: colors.textMuted,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    width: 32,
  },
  leaderRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  listContent: {
    paddingBottom: 24,
  },
  memberName: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  memberRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  pinnedFooter: {
    gap: 6,
    paddingTop: 18,
  },
  pinnedLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
    gap: 14,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  settingsLink: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
  },
  tabs: {
    borderBottomColor: colors.border,
    borderBottomWidth: HAIRLINE,
    flexDirection: 'row',
    gap: 4,
  },
  tabText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    paddingVertical: 4,
  },
  tabTextActive: {
    color: colors.text,
  },
  tabUnderline: {
    backgroundColor: 'transparent',
    height: 2,
    width: '60%',
  },
  tabUnderlineActive: {
    backgroundColor: colors.accent,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  viewerTint: {
    backgroundColor: 'rgba(20, 184, 166, 0.10)',
    borderRadius: radii.md,
  },
  youTag: {
    color: colors.accent,
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
