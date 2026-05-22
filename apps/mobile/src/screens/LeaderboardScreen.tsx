import { Ionicons } from '@expo/vector-icons';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '../components/ui/Avatar';
import { Badge } from '../components/ui/Badge';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { PageHero } from '../components/ui/PageHero';
import type { ConvexId } from '../integrations/convex/api';
import { api } from '../integrations/convex/api';
import type { ProfileStackParamList } from '../navigation/types';
import { useMobileConfig } from '../providers/mobile-config';
import { colors, radii } from '../theme/tokens';

type CombinedEntry = {
  rank: number;
  userId: ConvexId<'users'>;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  points: number;
  top5Points: number;
  h2hPoints: number;
  raceCount?: number;
  isViewer?: boolean;
};

const PAGE_LIMIT = 100;

export function LeaderboardScreen() {
  const { convexEnabled } = useMobileConfig();
  const navigation = useNavigation<NavigationProp<ProfileStackParamList>>();

  const result = useQuery(
    api.leaderboards.getCombinedSeasonLeaderboard,
    convexEnabled ? { limit: PAGE_LIMIT } : 'skip',
  );

  function handleRowPress(username?: string) {
    if (!username) {
      return;
    }
    void Haptics.selectionAsync();
    navigation.navigate('PublicProfile', { username });
  }

  if (!convexEnabled) {
    return (
      <View style={styles.screen}>
        <PageHero subtitle="2026 Season standings." title="Leaderboard" />
        <EmptyState
          body="Configure Convex to see standings."
          icon="trophy-outline"
          title="Not connected"
        />
      </View>
    );
  }

  if (result === undefined) {
    return <LoadingScreen />;
  }

  const entries = (result.entries ?? []) as CombinedEntry[];
  const viewerEntry = result.viewerEntry as CombinedEntry | null;
  const viewerOutsideTop = Boolean(
    viewerEntry && !entries.some((e) => e.isViewer),
  );
  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);
  const totalCount = result.totalCount ?? 0;

  return (
    <View style={styles.screen}>
      <PageHero
        subtitle={
          totalCount > 0
            ? `${totalCount.toLocaleString()} ${totalCount === 1 ? 'player' : 'players'} · Combined`
            : '2026 Combined standings.'
        }
        title="Leaderboard"
      />
      <FlatList
        contentContainerStyle={styles.listContent}
        data={rest}
        keyExtractor={(item) => String(item.userId)}
        ListEmptyComponent={
          podium.length === 0 ? (
            <EmptyState
              body="Standings will appear after the first race results."
              icon="trophy-outline"
              title="No scores yet"
            />
          ) : null
        }
        ListHeaderComponent={
          podium.length > 0 ? (
            <View style={styles.podiumWrapper}>
              {podium.map((entry) => (
                <PodiumRow
                  entry={entry}
                  key={String(entry.userId)}
                  onPress={() => handleRowPress(entry.username)}
                />
              ))}
              {viewerOutsideTop && viewerEntry ? (
                <View style={styles.viewerStrip}>
                  <Text style={styles.viewerStripLabel}>Your rank</Text>
                  <LeaderboardRow
                    entry={viewerEntry}
                    onPress={() => handleRowPress(viewerEntry.username)}
                  />
                </View>
              ) : null}
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <LeaderboardRow
            entry={item}
            onPress={() => handleRowPress(item.username)}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function PodiumRow({
  entry,
  onPress,
}: {
  entry: CombinedEntry;
  onPress?: () => void;
}) {
  const placeColor =
    entry.rank === 1
      ? colors.warning
      : entry.rank === 2
        ? '#C0C0C0'
        : '#CD7F32';
  const placeBg =
    entry.rank === 1
      ? 'rgba(251, 191, 36, 0.18)'
      : entry.rank === 2
        ? 'rgba(192, 192, 192, 0.18)'
        : 'rgba(205, 127, 50, 0.18)';
  const iconName = entry.rank === 1 ? 'trophy' : 'medal';

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.podiumRow,
        entry.isViewer ? styles.viewerRow : null,
        { borderColor: entry.isViewer ? colors.accent : placeColor },
      ]}
    >
      <View
        style={[styles.placeBadge, { backgroundColor: placeBg }]}
      >
        <Ionicons color={placeColor} name={iconName} size={18} />
        <Text style={[styles.placeText, { color: placeColor }]}>
          {entry.rank}
        </Text>
      </View>
      <Avatar imageUrl={entry.avatarUrl} name={entry.displayName ?? entry.username} size="md" />
      <View style={styles.rowText}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={styles.name}>
            {entry.displayName ?? entry.username}
          </Text>
          {entry.isViewer ? <Badge variant="accent">YOU</Badge> : null}
        </View>
        <Text style={styles.subline}>
          {entry.top5Points} Top 5 · {entry.h2hPoints} H2H
        </Text>
      </View>
      <View style={styles.pointsCol}>
        <Text style={styles.pointsValue}>{entry.points}</Text>
        <Text style={styles.pointsLabel}>pts</Text>
      </View>
    </Pressable>
  );
}

function LeaderboardRow({
  entry,
  onPress,
}: {
  entry: CombinedEntry;
  onPress?: () => void;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={[styles.row, entry.isViewer ? styles.viewerRow : null]}
    >
      <Text
        style={[
          styles.rank,
          entry.isViewer ? styles.rankViewer : null,
        ]}
      >
        {entry.rank}
      </Text>
      <Avatar imageUrl={entry.avatarUrl} name={entry.displayName ?? entry.username} size="sm" />
      <View style={styles.rowText}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={styles.name}>
            {entry.displayName ?? entry.username}
          </Text>
          {entry.isViewer ? <Badge variant="accent">YOU</Badge> : null}
        </View>
        <Text style={styles.subline}>
          {entry.top5Points} · {entry.h2hPoints}
        </Text>
      </View>
      <View style={styles.pointsCol}>
        <Text style={styles.pointsValueSmall}>{entry.points}</Text>
        <Text style={styles.pointsLabel}>pts</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  listContent: {
    gap: 8,
    paddingBottom: 32,
  },
  name: {
    color: colors.text,
    flexShrink: 1,
    fontSize: 14,
    fontWeight: '700',
  },
  nameRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  placeBadge: {
    alignItems: 'center',
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  placeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  podiumRow: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 2,
    flexDirection: 'row',
    gap: 12,
    padding: 12,
  },
  podiumWrapper: {
    gap: 8,
    paddingBottom: 12,
  },
  pointsCol: {
    alignItems: 'flex-end',
  },
  pointsLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.4,
  },
  pointsValue: {
    color: colors.text,
    fontSize: 20,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  pointsValueSmall: {
    color: colors.text,
    fontSize: 16,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  rank: {
    color: colors.textMuted,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    textAlign: 'center',
    width: 28,
  },
  rankViewer: {
    color: colors.accent,
  },
  row: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  screen: {
    backgroundColor: colors.page,
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  subline: {
    color: colors.textMuted,
    fontSize: 11,
  },
  viewerRow: {
    backgroundColor: colors.accentMuted,
    borderColor: colors.accent,
  },
  viewerStrip: {
    gap: 6,
    marginTop: 8,
  },
  viewerStripLabel: {
    color: colors.textMuted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
});
