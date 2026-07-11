import { Ionicons } from '@expo/vector-icons';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useConvex, useQuery } from 'convex/react';
import * as Haptics from 'expo-haptics';
import { useEffect, useState } from 'react';
import { RefreshControl } from 'react-native';

import { Avatar } from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/EmptyState';
import { FlagImage } from '../components/ui/FlagImage';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { Numeral } from '../components/ui/Numeral';
import { PageHero } from '../components/ui/PageHero';
import { PodiumBackdrop } from '../components/ui/PodiumBackdrop';
import { ScreenGlow } from '../components/ui/ScreenGlow';
import { SegmentedTabs } from '../components/ui/SegmentedTabs';
import type { ConvexId } from '../integrations/convex/api';
import { api } from '../integrations/convex/api';
import { captureAnalyticsEvent } from '../lib/analytics';
import { useRefreshSpinner } from '../lib/useRefreshSpinner';
import type { LeaderboardStackParamList } from '../navigation/types';
import { useMobileConfig } from '../providers/mobile-config';
import { colors } from '../theme/tokens';
import { FlatList, Pressable, ScrollView, Text, View } from '../tw';

type TimeScope = 'weekend' | 'season';
type GameMode = 'combined' | 'top5' | 'h2h';
type Scope = 'global' | 'following';

type Entry = {
  rank: number;
  userId: ConvexId<'users'>;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  points: number;
  raceCount?: number;
  isViewer?: boolean;
  // combined
  top5Points?: number;
  h2hPoints?: number;
  // h2h
  correctPicks?: number;
  totalPicks?: number;
};

type SeasonResult = {
  entries: Entry[];
  totalCount?: number;
  hasMore?: boolean;
  viewerEntry?: Entry | null;
};

type WeekendResult = {
  status: 'visible' | 'locked';
  reason: 'sign_in' | 'no_prediction' | null;
  entries: Entry[];
};

type RaceLite = {
  _id: ConvexId<'races'>;
  name: string;
  slug: string;
  round: number;
  season: number;
  status: string;
  hasSprint?: boolean;
  sprintQualiLockAt?: number;
  qualiLockAt?: number;
};

const PAGE_SIZE = 50;

const TIME_OPTIONS = [
  { value: 'weekend', label: 'Race Weekend' },
  { value: 'season', label: 'Season' },
] as const;
const MODE_OPTIONS = [
  { value: 'combined', label: 'Combined' },
  { value: 'top5', label: 'Top 5' },
  { value: 'h2h', label: 'H2H' },
] as const;
const SCOPE_OPTIONS = [
  { value: 'global', label: 'Global' },
  { value: 'following', label: 'Following' },
] as const;

// Mirrors web's isRaceSelectableForLeaderboard: a race joins the weekend
// selector once its first session has locked (or it is locked/finished).
function isRaceSelectable(race: RaceLite, now: number): boolean {
  if (race.status === 'cancelled') {
    return false;
  }
  if (race.status === 'finished' || race.status === 'locked') {
    return true;
  }
  const firstLockAt = race.hasSprint
    ? (race.sprintQualiLockAt ?? race.qualiLockAt)
    : race.qualiLockAt;
  return firstLockAt !== undefined && now >= firstLockAt;
}

function modeSubline(entry: Entry, mode: GameMode): string | null {
  if (mode === 'combined') {
    return `${entry.top5Points ?? 0} Top 5 · ${entry.h2hPoints ?? 0} H2H`;
  }
  if (mode === 'h2h') {
    return `${entry.correctPicks ?? 0}/${entry.totalPicks ?? 0} correct`;
  }
  if (entry.raceCount) {
    return `${entry.raceCount} ${entry.raceCount === 1 ? 'weekend' : 'weekends'}`;
  }
  return null;
}

export function LeaderboardScreen() {
  const { convexEnabled } = useMobileConfig();
  const navigation = useNavigation<NavigationProp<LeaderboardStackParamList>>();
  const convex = useConvex();
  const { refreshing, onRefresh } = useRefreshSpinner();

  const [timeChoice, setTimeChoice] = useState<TimeScope | null>(null);
  const [mode, setMode] = useState<GameMode>('combined');
  const [scope, setScope] = useState<Scope>('global');
  const [chosenRaceId, setChosenRaceId] = useState<string | null>(null);

  const defaultRace = useQuery(
    api.races.getWeekendLeaderboardRace,
    convexEnabled ? {} : 'skip',
  ) as RaceLite | null | undefined;
  const allRaces = useQuery(
    api.races.listRaces,
    convexEnabled ? { season: 2026 } : 'skip',
  ) as RaceLite[] | undefined;

  const selectedRace =
    allRaces?.find((r) => r._id === chosenRaceId) ?? defaultRace ?? null;
  const selectedRaceId = selectedRace?._id;

  // Probes the default race's combined board. Bare visits default to the
  // weekend tab only when that board has something to show — mid-weekend
  // before results, season standings beat an empty board (matches web).
  const defaultWeekendProbe = useQuery(
    api.leaderboards.getCombinedRaceLeaderboard,
    convexEnabled && defaultRace ? { raceId: defaultRace._id } : 'skip',
  ) as WeekendResult | undefined;

  const weekendHasScores =
    defaultWeekendProbe?.status === 'visible' &&
    defaultWeekendProbe.entries.length > 0;
  const timeScope: TimeScope =
    timeChoice ?? (weekendHasScores ? 'weekend' : 'season');

  function isActive(t: TimeScope, m: GameMode, s: Scope) {
    return convexEnabled && timeScope === t && mode === m && scope === s;
  }

  // Season boards (one live subscription per view; the rest are skipped)
  const seasonCombinedGlobal = useQuery(
    api.leaderboards.getCombinedSeasonLeaderboard,
    isActive('season', 'combined', 'global') ? { limit: PAGE_SIZE } : 'skip',
  ) as SeasonResult | undefined;
  const seasonTop5Global = useQuery(
    api.leaderboards.getSeasonLeaderboard,
    isActive('season', 'top5', 'global') ? { limit: PAGE_SIZE } : 'skip',
  ) as SeasonResult | undefined;
  const seasonH2HGlobal = useQuery(
    api.h2h.getH2HSeasonLeaderboard,
    isActive('season', 'h2h', 'global') ? { limit: PAGE_SIZE } : 'skip',
  ) as SeasonResult | undefined;
  const seasonCombinedFollowing = useQuery(
    api.leaderboards.getFriendsCombinedLeaderboard,
    isActive('season', 'combined', 'following') ? { limit: PAGE_SIZE } : 'skip',
  ) as SeasonResult | undefined;
  const seasonTop5Following = useQuery(
    api.leaderboards.getFriendsLeaderboard,
    isActive('season', 'top5', 'following') ? { limit: PAGE_SIZE } : 'skip',
  ) as SeasonResult | undefined;
  const seasonH2HFollowing = useQuery(
    api.leaderboards.getFriendsH2HLeaderboard,
    isActive('season', 'h2h', 'following') ? { limit: PAGE_SIZE } : 'skip',
  ) as SeasonResult | undefined;

  // Weekend boards — `friendsOnly` narrows to followed players
  const weekendArgs =
    selectedRaceId != null
      ? {
          raceId: selectedRaceId,
          ...(scope === 'following' ? { friendsOnly: true } : {}),
        }
      : null;
  const weekendCombined = useQuery(
    api.leaderboards.getCombinedRaceLeaderboard,
    timeScope === 'weekend' && mode === 'combined' && weekendArgs
      ? weekendArgs
      : 'skip',
  ) as WeekendResult | undefined;
  const weekendTop5 = useQuery(
    api.leaderboards.getRaceLeaderboard,
    timeScope === 'weekend' && mode === 'top5' && weekendArgs
      ? weekendArgs
      : 'skip',
  ) as WeekendResult | undefined;
  const weekendH2H = useQuery(
    api.leaderboards.getH2HRaceLeaderboard,
    timeScope === 'weekend' && mode === 'h2h' && weekendArgs
      ? weekendArgs
      : 'skip',
  ) as WeekendResult | undefined;

  // Season pagination — extra pages fetched imperatively and appended.
  const viewKey = `${timeScope}:${scope}:${mode}:${selectedRaceId ?? ''}`;
  const [extraEntries, setExtraEntries] = useState<Entry[]>([]);
  const [pagedOffset, setPagedOffset] = useState(PAGE_SIZE);
  const [pagedHasMore, setPagedHasMore] = useState<boolean | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    setExtraEntries([]);
    setPagedOffset(PAGE_SIZE);
    setPagedHasMore(null);
  }, [viewKey]);

  const seasonQueryForView =
    scope === 'global'
      ? mode === 'combined'
        ? api.leaderboards.getCombinedSeasonLeaderboard
        : mode === 'top5'
          ? api.leaderboards.getSeasonLeaderboard
          : api.h2h.getH2HSeasonLeaderboard
      : mode === 'combined'
        ? api.leaderboards.getFriendsCombinedLeaderboard
        : mode === 'top5'
          ? api.leaderboards.getFriendsLeaderboard
          : api.leaderboards.getFriendsH2HLeaderboard;

  const activeSeason: SeasonResult | undefined =
    scope === 'global'
      ? mode === 'combined'
        ? seasonCombinedGlobal
        : mode === 'top5'
          ? seasonTop5Global
          : seasonH2HGlobal
      : mode === 'combined'
        ? seasonCombinedFollowing
        : mode === 'top5'
          ? seasonTop5Following
          : seasonH2HFollowing;

  const activeWeekend: WeekendResult | undefined =
    mode === 'combined'
      ? weekendCombined
      : mode === 'top5'
        ? weekendTop5
        : weekendH2H;

  async function loadMoreSeason() {
    if (
      timeScope !== 'season' ||
      loadingMore ||
      !activeSeason ||
      !(pagedHasMore ?? activeSeason.hasMore)
    ) {
      return;
    }
    setLoadingMore(true);
    try {
      const more = (await convex.query(seasonQueryForView, {
        limit: PAGE_SIZE,
        offset: pagedOffset,
      })) as SeasonResult;
      setExtraEntries((prev) => [...prev, ...more.entries]);
      setPagedOffset((prev) => prev + PAGE_SIZE);
      setPagedHasMore(more.hasMore ?? false);
    } finally {
      setLoadingMore(false);
    }
  }

  function handleRowPress(username?: string) {
    if (!username) {
      return;
    }
    void Haptics.selectionAsync();
    captureAnalyticsEvent('leaderboard_player_opened');
    navigation.navigate('PublicProfile', { username });
  }

  function changeFilter(filter: string, value: string) {
    captureAnalyticsEvent('leaderboard_filter_changed', { filter, value });
  }

  if (!convexEnabled) {
    return (
      <View className="flex-1 bg-page">
        <Header timeScope="season" subtitle="2026 standings" />
        <EmptyState
          body="Configure Convex to see standings."
          icon="trophy-outline"
          title="Not connected"
        />
      </View>
    );
  }

  // Block until the default view is resolved so the tab doesn't flash from
  // Season to Weekend once the probe lands (web resolves this in its loader).
  if (
    timeChoice === null &&
    (defaultRace === undefined ||
      (defaultRace !== null && defaultWeekendProbe === undefined))
  ) {
    return <LoadingScreen />;
  }

  const now = Date.now();
  const selectableRaces = (allRaces ?? [])
    .filter((r) => isRaceSelectable(r, now))
    .concat(
      defaultRace && !(allRaces ?? []).some((r) => r._id === defaultRace._id)
        ? [defaultRace]
        : [],
    )
    .sort((a, b) => a.round - b.round);

  const seasonEntries = activeSeason
    ? [...activeSeason.entries, ...extraEntries]
    : [];
  const entries: Entry[] =
    timeScope === 'weekend'
      ? activeWeekend?.status === 'visible'
        ? activeWeekend.entries
        : []
      : seasonEntries;

  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  const viewerEntry =
    timeScope === 'season' ? (activeSeason?.viewerEntry ?? null) : null;
  const viewerOutsideTop = Boolean(
    viewerEntry && !entries.some((e) => e.isViewer),
  );

  const modeLabel =
    mode === 'combined' ? 'Combined' : mode === 'top5' ? 'Top 5' : 'H2H';
  const totalCount =
    timeScope === 'season' ? (activeSeason?.totalCount ?? 0) : 0;
  const subtitle =
    timeScope === 'weekend' && selectedRace
      ? `${selectedRace.name} · ${modeLabel}`
      : `2026 Season · ${modeLabel}${
          totalCount > 0
            ? ` · ${totalCount.toLocaleString()} ${totalCount === 1 ? 'player' : 'players'}`
            : ''
        }`;

  const isBoardLoading =
    timeScope === 'weekend'
      ? selectedRace != null && activeWeekend === undefined
      : activeSeason === undefined;

  const filters = (
    <View className="mb-4 gap-2.5 rounded-xl border border-border bg-surface/60 p-2.5">
      <SegmentedTabs
        onChange={(v) => {
          changeFilter('time', v);
          setTimeChoice(v);
        }}
        options={TIME_OPTIONS}
        value={timeScope}
      />
      {timeScope === 'weekend' && selectableRaces.length > 1 ? (
        <ScrollView
          contentContainerClassName="gap-2"
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {selectableRaces.map((race) => {
            const isSelected = race._id === selectedRaceId;
            return (
              <Pressable
                className={`flex-row items-center gap-1.5 rounded-full border px-2.5 py-1.5 ${
                  isSelected
                    ? 'border-button-accent bg-button-accent'
                    : 'border-border'
                }`}
                key={race._id}
                onPress={() => {
                  changeFilter('race', race.slug);
                  setChosenRaceId(race._id);
                }}
              >
                <FlagImage raceSlug={race.slug} />
                <Text
                  className={`text-xs font-bold ${
                    isSelected ? 'text-foreground' : 'text-muted'
                  }`}
                >
                  R{race.round}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
      <SegmentedTabs
        onChange={(v) => {
          changeFilter('scope', v);
          setScope(v);
        }}
        options={SCOPE_OPTIONS}
        value={scope}
      />
      <SegmentedTabs
        onChange={(v) => {
          changeFilter('mode', v);
          setMode(v);
        }}
        options={MODE_OPTIONS}
        value={mode}
      />
    </View>
  );

  return (
    <View className="flex-1 bg-page">
      <ScreenGlow />
      <Header timeScope={timeScope} subtitle={subtitle} />
      <FlatList
        contentContainerClassName="px-4 pb-8"
        data={rest}
        ItemSeparatorComponent={() => (
          <View className="ml-[52px] h-px bg-border" />
        )}
        keyExtractor={(item) => String(item.userId)}
        ListEmptyComponent={
          podium.length === 0 && !isBoardLoading ? (
            <BoardEmptyState
              defaultRace={defaultRace ?? null}
              mode={mode}
              scope={scope}
              selectedRace={selectedRace}
              timeScope={timeScope}
              weekend={activeWeekend}
            />
          ) : null
        }
        ListFooterComponent={
          loadingMore ? (
            <Text className="text-muted py-4 text-center text-xs">
              Loading more…
            </Text>
          ) : null
        }
        ListHeaderComponent={
          <View>
            {filters}
            {podium.length > 0 ? (
              <View className="mb-1">
                {podium.map((entry) => (
                  <PodiumRow
                    entry={entry}
                    key={String(entry.userId)}
                    mode={mode}
                    onPress={() => handleRowPress(entry.username)}
                  />
                ))}
                {rest.length > 0 ? (
                  <Text className="text-muted mt-2.5 mb-1.5 text-[10px] font-extrabold uppercase">
                    The chasing pack
                  </Text>
                ) : null}
                {viewerOutsideTop && viewerEntry ? (
                  <View className="mt-2.5 rounded-lg border border-accent px-2">
                    <Text className="mt-2 text-[10px] font-extrabold text-accent uppercase">
                      Your rank
                    </Text>
                    <BoardRow
                      entry={viewerEntry}
                      mode={mode}
                      onPress={() => handleRowPress(viewerEntry.username)}
                    />
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
        }
        onEndReached={() => void loadMoreSeason()}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            colors={[colors.accent]}
            onRefresh={onRefresh}
            refreshing={refreshing}
            tintColor={colors.accent}
          />
        }
        renderItem={({ item }) => (
          <BoardRow
            entry={item}
            mode={mode}
            onPress={() => handleRowPress(item.username)}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function Header({
  timeScope,
  subtitle,
}: {
  timeScope: TimeScope;
  subtitle: string;
}) {
  return (
    <View className="px-4 pt-3 pb-3">
      <PageHero
        eyebrow={timeScope === 'weekend' ? 'Race Weekend' : 'Season Rankings'}
        subtitle={subtitle}
        title="Leaderboard"
      />
    </View>
  );
}

function BoardEmptyState({
  timeScope,
  scope,
  mode,
  defaultRace,
  selectedRace,
  weekend,
}: {
  timeScope: TimeScope;
  scope: Scope;
  mode: GameMode;
  defaultRace: RaceLite | null;
  selectedRace: RaceLite | null;
  weekend: WeekendResult | undefined;
}) {
  const icon = mode === 'h2h' ? 'flash-outline' : 'trophy-outline';

  if (timeScope === 'weekend') {
    if (!defaultRace) {
      return (
        <EmptyState
          body="Weekend leaderboards will appear once the season begins."
          icon="calendar-outline"
          title="No races yet"
        />
      );
    }
    if (weekend?.status === 'locked') {
      return (
        <EmptyState
          body="Weekend standings unlock once you've submitted picks for this race. Head to the Picks tab to get yours in."
          icon="lock-closed-outline"
          title="Make picks to see this board"
        />
      );
    }
    if (scope === 'following') {
      return (
        <EmptyState
          body={
            selectedRace?.status === 'finished'
              ? 'None of the people you follow submitted predictions for this weekend. Browse the global leaderboard to find players to follow.'
              : 'Follow other players from their profile to see them here.'
          }
          icon="people-outline"
          title="No one here yet"
        />
      );
    }
    return (
      <EmptyState
        body={
          selectedRace?.status === 'finished'
            ? 'No predictions were submitted for this weekend.'
            : 'Scores will appear once race results are published.'
        }
        icon={icon}
        title="No scores yet"
      />
    );
  }

  if (scope === 'following') {
    return (
      <EmptyState
        body="Follow other players from their profile to see a leaderboard of just the people you follow."
        icon="people-outline"
        title="No one here yet"
      />
    );
  }
  return (
    <EmptyState
      body="Standings will appear after the first race results."
      icon={icon}
      title="No scores yet"
    />
  );
}

function PodiumRow({
  entry,
  mode,
  onPress,
}: {
  entry: Entry;
  mode: GameMode;
  onPress?: () => void;
}) {
  const placeColor =
    entry.rank === 1
      ? colors.warning
      : entry.rank === 2
        ? '#C0C0C0'
        : '#CD7F32';
  const iconName = entry.rank === 1 ? 'trophy' : 'medal';
  const podiumRank = Math.min(Math.max(entry.rank, 1), 3) as 1 | 2 | 3;
  const ordinal = ['1st', '2nd', '3rd'][entry.rank - 1] ?? `#${entry.rank}`;
  const subline = modeSubline(entry, mode);

  return (
    <Pressable
      className={`mb-2 flex-row items-center gap-2.5 overflow-hidden rounded-xl border border-border px-3 py-3 ${
        entry.isViewer ? 'bg-accent/10' : ''
      }`}
      disabled={!onPress}
      onPress={onPress}
    >
      <PodiumBackdrop rank={podiumRank} />
      <View className="w-[74px] flex-row items-center gap-2">
        <View
          className="h-9 w-9 items-center justify-center rounded-full"
          style={{ backgroundColor: `${placeColor}26` }}
        >
          <Ionicons color={placeColor} name={iconName} size={17} />
        </View>
        <Text
          className="text-[13px] font-extrabold"
          style={{ color: placeColor }}
        >
          {ordinal}
        </Text>
      </View>
      <Avatar
        imageUrl={entry.avatarUrl}
        name={entry.displayName ?? entry.username}
        size="md"
      />
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text
            className="text-foreground shrink text-sm font-semibold"
            numberOfLines={1}
          >
            {entry.displayName ?? entry.username}
          </Text>
          {entry.isViewer ? (
            <Text className="text-foreground overflow-hidden rounded-full bg-accent px-1.5 py-px text-[9px] font-extrabold">
              YOU
            </Text>
          ) : null}
        </View>
        {subline ? (
          <Text className="text-muted mt-px text-[11px]">{subline}</Text>
        ) : null}
      </View>
      <View className="min-w-11 items-end">
        <Numeral variant="large">{entry.points}</Numeral>
        <Text className="text-muted text-[10px] font-semibold uppercase">
          pts
        </Text>
      </View>
    </Pressable>
  );
}

function BoardRow({
  entry,
  mode,
  onPress,
}: {
  entry: Entry;
  mode: GameMode;
  onPress?: () => void;
}) {
  const subline = modeSubline(entry, mode);
  return (
    <Pressable
      className={`flex-row items-center gap-2.5 px-1 py-2.5 ${
        entry.isViewer ? 'bg-accent/10' : ''
      }`}
      disabled={!onPress}
      onPress={onPress}
    >
      <Numeral
        style={{ textAlign: 'center', width: 28 }}
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
      <View className="flex-1">
        <View className="flex-row items-center gap-1.5">
          <Text
            className="text-foreground shrink text-sm font-semibold"
            numberOfLines={1}
          >
            {entry.displayName ?? entry.username}
          </Text>
          {entry.isViewer ? (
            <Text className="text-foreground overflow-hidden rounded-full bg-accent px-1.5 py-px text-[9px] font-extrabold">
              YOU
            </Text>
          ) : null}
        </View>
        {subline ? (
          <Text className="text-muted mt-px text-[11px]">{subline}</Text>
        ) : null}
      </View>
      <View className="min-w-11 items-end">
        <Numeral variant="small">{entry.points}</Numeral>
        <Text className="text-muted text-[10px] font-semibold uppercase">
          pts
        </Text>
      </View>
    </Pressable>
  );
}
