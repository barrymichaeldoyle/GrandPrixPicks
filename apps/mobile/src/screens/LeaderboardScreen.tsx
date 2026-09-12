import { useRoute, type RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useConvex } from 'convex/react';
import { useQuery } from '../integrations/convex/query';
import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import { ScrollView as NativeScrollView, RefreshControl } from 'react-native';

import { Avatar } from '../components/ui/Avatar';
import { EmptyState } from '../components/ui/EmptyState';
import { FlagImage } from '../components/ui/FlagImage';
import { LoadingScreen } from '../components/ui/LoadingScreen';
import { Numeral } from '../components/ui/Numeral';
import { CollapsingChrome, TabChrome } from '../components/ui/TabChrome';
import { SegmentedTabs } from '../components/ui/SegmentedTabs';
import { SlantedStripe } from '../components/ui/SlantedStripe';
import { useHideOnScroll } from '../hooks/useHideOnScroll';
import type { ConvexId } from '../integrations/convex/api';
import { api } from '../integrations/convex/api';
import { captureAnalyticsEvent } from '../lib/analytics';
import { useRefreshSpinner } from '../lib/useRefreshSpinner';
import { useNow } from '../lib/useNow';
import type { LeaderboardStackParamList } from '../navigation/types';
import { useMobileConfig } from '../providers/mobile-config';
import { colors } from '../theme/tokens';
import { FlatList, Pressable, Text, View } from '../tw';

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
  // Combined deliberately has no subline of its own, so it falls through to
  // the weekend count below. It used to split the total back into "x Top 5 ·
  // y H2H", which is the one thing a combined board is for not doing: the web
  // leaderboard shows a single total against a race count, and this is the
  // same board.
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
  const now = useNow(60_000);

  const route =
    useRoute<RouteProp<LeaderboardStackParamList, 'LeaderboardMain'>>();
  const [timeChoice, setTimeChoice] = useState<TimeScope | null>(null);
  const mode: GameMode = 'combined';
  const roundScroll = useRef<NativeScrollView>(null);
  const roundPositions = useRef<Record<string, number>>({});
  const [scope, setScope] = useState<Scope>('global');
  const [chosenRaceId, setChosenRaceId] = useState<string | null>(null);
  const hide = useHideOnScroll();
  useEffect(() => {
    if (!route.params) {
      return;
    }
    // Synchronize a mounted tab with an external notification navigation event.
    // oxlint-disable-next-line react/set-state-in-effect
    setChosenRaceId(route.params.raceId ?? null);
    setTimeChoice(route.params.time ?? 'weekend');
  }, [route.params]);

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
  useEffect(() => {
    const x = selectedRaceId
      ? roundPositions.current[selectedRaceId]
      : undefined;
    if (x !== undefined) {
      roundScroll.current?.scrollTo({
        x: Math.max(0, x - 120),
        animated: false,
      });
    }
  }, [selectedRaceId]);

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

  const seasonCombinedFollowing = useQuery(
    api.leaderboards.getFriendsCombinedLeaderboard,
    isActive('season', 'combined', 'following') ? { limit: PAGE_SIZE } : 'skip',
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

  // Season pagination — extra pages fetched imperatively and appended.
  const viewKey = `${timeScope}:${scope}:${mode}:${selectedRaceId ?? ''}`;
  const [extraEntries, setExtraEntries] = useState<Entry[]>([]);
  const [pagedOffset, setPagedOffset] = useState(PAGE_SIZE);
  const [pagedHasMore, setPagedHasMore] = useState<boolean | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    // A new board identity resets the imperative pagination accumulator.
    // oxlint-disable-next-line react/set-state-in-effect
    setExtraEntries([]);
    setPagedOffset(PAGE_SIZE);
    setPagedHasMore(null);
  }, [viewKey]);

  const seasonQueryForView =
    scope === 'global'
      ? api.leaderboards.getCombinedSeasonLeaderboard
      : api.leaderboards.getFriendsCombinedLeaderboard;
  const activeSeason =
    scope === 'global' ? seasonCombinedGlobal : seasonCombinedFollowing;
  const activeWeekend = weekendCombined;

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
        <TabChrome title="Leaderboard" />
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
    return (
      <View className="flex-1 bg-page">
        <TabChrome title="Leaderboard" />
        <LoadingScreen />
      </View>
    );
  }

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

  const totalCount =
    timeScope === 'season' ? (activeSeason?.totalCount ?? 0) : 0;
  const subtitle =
    timeScope === 'weekend' && selectedRace
      ? selectedRace.name
      : `2026 Season${
          totalCount > 0
            ? ` · ${totalCount.toLocaleString()} ${totalCount === 1 ? 'player' : 'players'}`
            : ''
        }`;

  const isBoardLoading =
    timeScope === 'weekend'
      ? selectedRace != null && activeWeekend === undefined
      : activeSeason === undefined;

  const filters = (
    <View className="mb-4 gap-2.5">
      <SegmentedTabs
        onChange={(v) => {
          changeFilter('time', v);
          setTimeChoice(v);
        }}
        options={TIME_OPTIONS}
        value={timeScope}
      />
      {timeScope === 'weekend' && selectableRaces.length > 1 ? (
        <NativeScrollView
          contentContainerStyle={{ gap: 8 }}
          ref={roundScroll}
          onContentSizeChange={() =>
            roundScroll.current?.scrollTo({
              x: Math.max(
                0,
                (roundPositions.current[selectedRaceId ?? ''] ?? 0) - 120,
              ),
              animated: false,
            })
          }
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {selectableRaces.map((race) => {
            const isSelected = race._id === selectedRaceId;
            return (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                onLayout={({ nativeEvent }) => {
                  roundPositions.current[race._id] = nativeEvent.layout.x;
                  if (isSelected) {
                    roundScroll.current?.scrollTo({
                      x: Math.max(0, nativeEvent.layout.x - 120),
                      animated: false,
                    });
                  }
                }}
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
                    isSelected ? 'text-text-on-accent' : 'text-muted'
                  }`}
                >
                  R{race.round}
                </Text>
              </Pressable>
            );
          })}
        </NativeScrollView>
      ) : null}
      <SegmentedTabs
        onChange={(v) => {
          changeFilter('scope', v);
          setScope(v);
        }}
        options={SCOPE_OPTIONS}
        value={scope}
      />
    </View>
  );

  return (
    <CollapsingChrome
      chrome={<TabChrome title="Leaderboard" />}
      headerStyle={hide.headerStyle}
    >
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
            <View className="flex-row items-center gap-2 py-3">
              <View className="h-5 w-[30px] shrink-0">
                {timeScope === 'weekend' && selectedRace ? (
                  <FlagImage raceSlug={selectedRace.slug} />
                ) : null}
              </View>
              <Text className="text-muted flex-1 text-[13px] leading-[18px]">
                {subtitle}
              </Text>
            </View>
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
                {viewerOutsideTop && viewerEntry ? (
                  <View className="mt-2.5 rounded-lg border border-accent px-2">
                    <Text className="mt-2 text-xs font-medium text-accent">
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
        {...hide.scrollProps}
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
    </CollapsingChrome>
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
          body="Weekend standings unlock once you've submitted picks for this race. Make your picks on Home."
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
  // Flat data colours, the way team colours are. The metallic #FFD700 /
  // #C0C0C0 / #CD7F32 that used to be here are the "gold, silver, bronze"
  // reflex this direction rejects: DESIGN.md asks for no gradient, bevel or
  // metal, and these tokens are the muted versions it specifies.
  const placeColor =
    entry.rank === 1
      ? colors.podiumGold
      : entry.rank === 2
        ? colors.podiumSilver
        : colors.podiumBronze;
  const iconName = entry.rank === 1 ? 'trophy' : 'medal';
  const ordinal = ['1st', '2nd', '3rd'][entry.rank - 1] ?? `#${entry.rank}`;
  const subline = modeSubline(entry, mode);

  return (
    <Pressable
      accessibilityRole="button"
      className={`mb-2 flex-row items-center gap-2.5 overflow-hidden border border-border py-3 pr-3 pl-4 ${
        entry.isViewer ? 'bg-accent/10' : ''
      }`}
      disabled={!onPress}
      onPress={onPress}
    >
      {/* Podium colour in the house stripe, not a skewed 3px rule. A skew
          leans both edges and in proportion to height; web's motif keeps the
          outer edge flush and cants the inner edge by a fixed 5px. */}
      <SlantedStripe color={placeColor} />
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
            <Text className="overflow-hidden rounded-full bg-accent px-1.5 py-px text-xs font-extrabold text-text-on-accent">
              You
            </Text>
          ) : null}
        </View>
        {subline ? (
          <Text className="text-muted mt-px text-xs">{subline}</Text>
        ) : null}
      </View>
      <View className="min-w-11 items-end">
        <Numeral variant="large">{entry.points}</Numeral>
        <Text className="text-muted text-xs font-medium">pts</Text>
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
      accessibilityRole="button"
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
            <Text className="overflow-hidden rounded-full bg-accent px-1.5 py-px text-xs font-extrabold text-text-on-accent">
              You
            </Text>
          ) : null}
        </View>
        {subline ? (
          <Text className="text-muted mt-px text-xs">{subline}</Text>
        ) : null}
      </View>
      <View className="min-w-11 items-end">
        <Numeral variant="small">{entry.points}</Numeral>
        <Text className="text-muted text-xs font-medium">pts</Text>
      </View>
    </Pressable>
  );
}
