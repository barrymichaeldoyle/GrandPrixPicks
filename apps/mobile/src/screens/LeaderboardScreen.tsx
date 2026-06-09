import { Ionicons } from '@expo/vector-icons';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Avatar } from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/EmptyState';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { Numeral } from '../components/ui/Numeral';
import { PodiumBackdrop } from '../components/ui/PodiumBackdrop';
import type { ConvexId } from '../integrations/convex/api';
import { api } from '../integrations/convex/api';
import { useRefreshSpinner } from '../lib/useRefreshSpinner';
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
const HAIRLINE = StyleSheet.hairlineWidth;

export function LeaderboardScreen() {
  const { convexEnabled } = useMobileConfig();
  const navigation = useNavigation<NavigationProp<ProfileStackParamList>>();
  const { refreshing, onRefresh } = useRefreshSpinner();

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
        <Header subtitle="2026 standings" />
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
  const subtitle =
    totalCount > 0
      ? `${totalCount.toLocaleString()} ${totalCount === 1 ? 'player' : 'players'} · Combined`
      : '2026 Combined standings';

  return (
    <View style={styles.screen}>
      <Header subtitle={subtitle} />
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
              {rest.length > 0 ? (
                <Text style={styles.restEyebrow}>The chasing pack</Text>
              ) : null}
              {viewerOutsideTop && viewerEntry ? (
                <View style={styles.viewerStrip}>
                  <Text style={styles.viewerStripLabel}>Your rank</Text>
                  <LeaderboardRow
                    entry={viewerEntry}
                    onPress={() => handleRowPress(viewerEntry.username)}
                    showDivider={false}
                  />
                </View>
              ) : null}
            </View>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.divider} />}
        refreshControl={
          <RefreshControl
            colors={[colors.accent]}
            onRefresh={onRefresh}
            refreshing={refreshing}
            tintColor={colors.accent}
          />
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

function Header({ subtitle }: { subtitle: string }) {
  return (
    <View style={styles.header}>
      <Text style={styles.eyebrow}>Leaderboard</Text>
      <Text style={styles.title}>2026 Season</Text>
      <Text style={styles.headerMeta}>{subtitle}</Text>
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
  const iconName = entry.rank === 1 ? 'trophy' : 'medal';
  const podiumRank = entry.rank as 1 | 2 | 3;

  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={[styles.podiumRow, entry.isViewer ? styles.viewerTint : null]}
    >
      <PodiumBackdrop rank={podiumRank} />
      <View style={styles.podiumLeft}>
        <Ionicons color={placeColor} name={iconName} size={20} />
        <Numeral style={{ color: placeColor }} variant="large">
          {entry.rank}
        </Numeral>
      </View>
      <Avatar
        imageUrl={entry.avatarUrl}
        name={entry.displayName ?? entry.username}
        size="md"
      />
      <View style={styles.rowText}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={styles.name}>
            {entry.displayName ?? entry.username}
          </Text>
          {entry.isViewer ? <Text style={styles.youTag}>YOU</Text> : null}
        </View>
        <Text style={styles.subline}>
          {entry.top5Points} Top 5 · {entry.h2hPoints} H2H
        </Text>
      </View>
      <View style={styles.pointsCol}>
        <Numeral variant="large">{entry.points}</Numeral>
        <Text style={styles.pointsLabel}>pts</Text>
      </View>
    </Pressable>
  );
}

function LeaderboardRow({
  entry,
  onPress,
  showDivider = true,
}: {
  entry: CombinedEntry;
  onPress?: () => void;
  showDivider?: boolean;
}) {
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      style={[
        styles.row,
        entry.isViewer ? styles.viewerTint : null,
        !showDivider ? styles.rowNoDivider : null,
      ]}
    >
      <Numeral
        style={styles.rank}
        tone={entry.isViewer ? 'accent' : 'muted'}
        variant="small"
      >
        {entry.rank}
      </Numeral>
      <Avatar
        imageUrl={entry.avatarUrl}
        name={entry.displayName ?? entry.username}
        size="sm"
      />
      <View style={styles.rowText}>
        <View style={styles.nameRow}>
          <Text numberOfLines={1} style={styles.name}>
            {entry.displayName ?? entry.username}
          </Text>
          {entry.isViewer ? <Text style={styles.youTag}>YOU</Text> : null}
        </View>
        <Text style={styles.subline}>
          {entry.top5Points} · {entry.h2hPoints}
        </Text>
      </View>
      <View style={styles.pointsCol}>
        <Numeral variant="body">{entry.points}</Numeral>
        <Text style={styles.pointsLabel}>pts</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  divider: {
    backgroundColor: colors.border,
    height: HAIRLINE,
    marginLeft: 12,
  },
  eyebrow: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  header: {
    gap: 2,
    paddingBottom: 16,
  },
  headerMeta: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  listContent: {
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
  podiumLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    minWidth: 48,
  },
  podiumRow: {
    alignItems: 'center',
    borderRadius: radii.lg,
    flexDirection: 'row',
    gap: 12,
    overflow: 'hidden',
    padding: 12,
    position: 'relative',
  },
  podiumWrapper: {
    gap: 8,
    paddingBottom: 18,
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
  rank: {
    color: colors.textMuted,
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    textAlign: 'center',
    width: 28,
  },
  restEyebrow: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    paddingTop: 12,
    textTransform: 'uppercase',
  },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 6,
    paddingVertical: 10,
  },
  rowNoDivider: {
    paddingHorizontal: 12,
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
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  viewerStrip: {
    gap: 6,
    marginTop: 10,
  },
  viewerStripLabel: {
    color: colors.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
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
