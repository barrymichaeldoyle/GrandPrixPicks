import {
  groupFeedEvents,
  weekendStarts,
} from '@grandprixpicks/shared/feedGroups';
import { useAuth } from '@clerk/expo';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '../../integrations/convex/query';
import { useEffect, useRef, useState } from 'react';

import type { FeedEvent } from '../../components/feed/FeedEventCard';
import { FeedEventCard } from '../../components/feed/FeedEventCard';
import { NewsGroupCard } from '../../components/feed/NewsGroupCard';
import { WeekendSplit } from '../../components/feed/WeekendSplit';
import { LiveClassificationCard } from '../../components/feed/live-classification-card';
import type { SessionHeader } from '../../components/feed/SessionGroupCard';
import { SessionGroupCard } from '../../components/feed/SessionGroupCard';
import { PicksConnectedScreen } from '../PicksConnectedScreen';
import { HomeHero } from '../../components/home/HomeHero';
import { SignedOutHomePanel } from '../../components/home/SignedOutHomePanel';
import { RaceRecapCard } from '../../components/home/RaceRecapCard';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { CollapsingChrome, TabChrome } from '../../components/ui/TabChrome';
import { useFollowMutations } from '../../hooks/useFollowMutations';
import { useHideOnScroll } from '../../hooks/useHideOnScroll';
import type { ConvexId } from '../../integrations/convex/api';
import { api } from '../../integrations/convex/api';
import { captureAnalyticsEvent } from '../../lib/analytics';
import { getFeatured } from '../../lib/featuredWeekend';
import { homePaintIsPending } from '../../lib/homePaint';
import { useIsSignedIn } from '../../lib/useIsSignedIn';
import { useHomePaintGate } from '../../lib/useHomePaintGate';
import { useNow } from '../../lib/useNow';
import { useRaceWeekends } from '../../lib/useRaceWeekends';
import { useRefreshSpinner } from '../../lib/useRefreshSpinner';
import { bucketWeatherNow } from '../../lib/weatherNow';
import type { HomeStackParamList } from '../../navigation/types';
import { useMobileConfig } from '../../providers/mobile-config';
import { useToast } from '../../providers/ToastProvider';
import { colors } from '../../theme/tokens';
import { FlatList, Pressable, RefreshControl, Text, View } from '../../tw';

// Up to 5 reactive pages of feed (5 × 40 = 200 events), matching web.
const MAX_EXTRA_PAGES = 4;

type FeedPage =
  | {
      events: FeedEvent[];
      sessions: Record<string, SessionHeader>;
      hasMore: boolean;
      nextCursor: string | null;
    }
  | null
  | undefined;

export function FeedScreen() {
  const { clerkEnabled, convexEnabled } = useMobileConfig();
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
  const { refreshing, onRefresh } = useRefreshSpinner();
  const { isLoaded: authLoaded } = useAuth();
  const isSignedIn = useIsSignedIn();
  const now = useNow(30_000);
  const { isLoading: racesLoading, races } = useRaceWeekends();

  const [extraCursors, setExtraCursors] = useState<(string | null)[]>(
    Array(MAX_EXTRA_PAGES).fill(null),
  );

  const page0 = useQuery(
    api.feed.getPersonalizedFeed,
    convexEnabled ? {} : 'skip',
  ) as FeedPage;
  const page1 = useQuery(
    api.feed.getPersonalizedFeed,
    convexEnabled && extraCursors[0] !== null
      ? { paginationCursor: extraCursors[0] }
      : 'skip',
  ) as FeedPage;
  const page2 = useQuery(
    api.feed.getPersonalizedFeed,
    convexEnabled && extraCursors[1] !== null
      ? { paginationCursor: extraCursors[1] }
      : 'skip',
  ) as FeedPage;
  const page3 = useQuery(
    api.feed.getPersonalizedFeed,
    convexEnabled && extraCursors[2] !== null
      ? { paginationCursor: extraCursors[2] }
      : 'skip',
  ) as FeedPage;
  const page4 = useQuery(
    api.feed.getPersonalizedFeed,
    convexEnabled && extraCursors[3] !== null
      ? { paginationCursor: extraCursors[3] }
      : 'skip',
  ) as FeedPage;

  const me = useQuery(api.users.me, convexEnabled ? {} : 'skip');
  const recap = useQuery(api.home.getRaceRecap, convexEnabled ? {} : 'skip');
  const weekend = useQuery(
    api.races.getCurrentWeekend,
    convexEnabled ? {} : 'skip',
  );
  const topPlayers = useQuery(
    api.leaderboards.getCombinedSeasonLeaderboard,
    convexEnabled ? { limit: 6 } : 'skip',
  );

  const weatherNow = bucketWeatherNow(now);
  const featured = getFeatured(races, now);
  const weatherSlug = isSignedIn
    ? weekend?.race.slug
    : featured?.nextSession
      ? featured.race.slug
      : undefined;
  const shouldLoadWeather = Boolean(convexEnabled && weatherSlug);
  const weather = useQuery(
    api.weather.getByRaceSlug,
    shouldLoadWeather && weatherSlug
      ? { raceSlug: weatherSlug, now: weatherNow }
      : 'skip',
  );

  const feedLoadedRef = useRef(false);
  useEffect(() => {
    if (page0 !== undefined && !feedLoadedRef.current) {
      feedLoadedRef.current = true;
      captureAnalyticsEvent('feed_loaded', {
        events: page0?.events.length ?? 0,
      });
    }
  }, [page0]);

  const allPageData = [page0, page1, page2, page3, page4];
  const activePagesCount = 1 + extraCursors.filter((c) => c !== null).length;
  const activePages = allPageData.slice(0, activePagesCount);
  const isLoadingMore =
    activePagesCount > 1 && activePages.some((p) => p === undefined);

  const loadedPages = activePages.filter(
    (p): p is NonNullable<FeedPage> => p != null,
  );
  const lastLoadedPage = loadedPages.at(-1);
  const hasMore =
    (lastLoadedPage?.hasMore ?? false) && activePagesCount <= MAX_EXTRA_PAGES;

  function handleLoadMore() {
    if (isLoadingMore || !hasMore || !lastLoadedPage?.nextCursor) {
      return;
    }
    captureAnalyticsEvent('feed_paginated', { page: activePagesCount + 1 });
    setExtraCursors((prev) => {
      const next = [...prev];
      const idx = next.findIndex((c) => c === null);
      if (idx !== -1) {
        next[idx] = lastLoadedPage.nextCursor;
      }
      return next;
    });
  }

  function openEvent(event: FeedEvent) {
    captureAnalyticsEvent('feed_event_opened', { type: event.type });
    navigation.navigate('FeedEventDetail', {
      feedEventId: String(event._id),
    });
  }

  const discoveryPending =
    isSignedIn &&
    page0 != null &&
    page0.events.length === 0 &&
    topPlayers === undefined;
  const weatherPending = shouldLoadWeather && weather === undefined;
  const holdPaint = useHomePaintGate(
    homePaintIsPending({
      authLoaded,
      clerkEnabled,
      convexEnabled,
      discoveryPending,
      feed: page0,
      me,
      racesLoading,
      recap,
      weekend,
      weatherPending,
    }),
  );
  const hide = useHideOnScroll();

  if (!convexEnabled) {
    return (
      <View className="flex-1 bg-page">
        <TabChrome brand />
        <View className="px-4 pt-3">
          <EmptyState
            body="Configure your Convex URL to see your feed."
            icon="pulse-outline"
            title="Not connected"
          />
        </View>
      </View>
    );
  }

  if (holdPaint) {
    return (
      <View className="flex-1 bg-page">
        <TabChrome brand />
        <LoadingScreen />
      </View>
    );
  }

  const allEvents = loadedPages.flatMap((p) => p.events);
  const allSessions: Record<string, SessionHeader> = Object.assign(
    {},
    ...loadedPages.map((p) => p.sessions),
  );

  const groups = groupFeedEvents(allEvents);
  // Which cards open a weekend, so the chequer can go above them. Same rule as
  // web, from the same function.
  const startsWeekend = weekendStarts(groups);

  return (
    <CollapsingChrome
      chrome={<TabChrome brand />}
      headerStyle={hide.headerStyle}
    >
      <FlatList
        contentContainerClassName="pb-6"
        data={groups}
        keyExtractor={(group) =>
          group.kind === 'standalone'
            ? String(group.event._id)
            : group.kind === 'news'
              ? `news-${group.events[0]?._id}`
              : group.key
        }
        ListEmptyComponent={null}
        ListFooterComponent={
          isLoadingMore ? (
            <Text className="text-muted py-3 text-center text-xs">
              Loading more…
            </Text>
          ) : null
        }
        ListHeaderComponent={
          <View>
            <LiveClassificationCard />
            <RaceRecapCard className="mx-4 mt-3 mb-3" />
            {isSignedIn ? (
              <PicksConnectedScreen embedded />
            ) : (
              <View className="px-4 pt-3">
                <HomeHero />
              </View>
            )}
            {/* No "Activity" heading over the list. The tab is Home, the rows
                below are plainly the activity, and the web feed dropped the
                same label. */}
            {groups.length > 0 ? null : isSignedIn ? (
              <View className="gap-5 px-4 pt-4">
                <TopPlayersToFollow />
              </View>
            ) : (
              <View className="px-4 pt-2">
                <SignedOutHomePanel />
              </View>
            )}
          </View>
        }
        onEndReached={handleLoadMore}
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
        renderItem={({ index, item }) => {
          const card =
            item.kind === 'standalone' ? (
              <FeedEventCard
                event={item.event}
                onPress={() => openEvent(item.event)}
              />
            ) : item.kind === 'news' ? (
              <NewsGroupCard events={item.events} />
            ) : (
              <SessionGroupCard
                events={item.events}
                onPressEvent={openEvent}
                session={
                  allSessions[item.key] ?? {
                    raceName: item.events[0]?.raceName ?? 'Race',
                    sessionType: item.events[0]?.sessionType ?? 'race',
                    raceSlug: item.events[0]?.raceSlug,
                    top5: [],
                  }
                }
                viewerId={me?._id as ConvexId<'users'> | undefined}
              />
            );
          // The wrapper's own `pt-3` is the gap above the chequer, and `mb-3`
          // is the one below it, so a weekend break sits evenly between the two
          // cards it separates. Full bleed either way: the split runs wall to
          // wall even where the card it precedes is inset.
          return (
            <View className="pt-3">
              {startsWeekend[index] ? <WeekendSplit className="mb-3" /> : null}
              <View className={item.kind === 'standalone' ? 'px-4' : undefined}>
                {card}
              </View>
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </CollapsingChrome>
  );
}

/**
 * Empty-feed discovery: the season's top players with one-tap follow,
 * so a new account can fill its feed without leaving the tab.
 *
 * Signed-in only. `follows.follow` requires a viewer, so a guest never
 * reaches this block. Follow state comes from `getViewerFollowedIds`, written
 * into the query cache on tap so the button does not wait on the round-trip.
 */
function TopPlayersToFollow() {
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
  const { showToast } = useToast();
  const topPlayers = useQuery(api.leaderboards.getCombinedSeasonLeaderboard, {
    limit: 6,
  });
  const followedIds = useQuery(api.follows.getViewerFollowedIds, {});
  const { follow } = useFollowMutations();

  const entries = (topPlayers?.entries ?? [])
    .filter((p) => !p.isViewer)
    .slice(0, 5);

  if (entries.length === 0) {
    return null;
  }

  const followed = new Set(followedIds ?? []);

  async function handleFollow(userId: ConvexId<'users'>) {
    try {
      await follow({ followeeId: userId });
      captureAnalyticsEvent('user_followed', {
        followee_id: String(userId),
        source: 'home_top_players',
      });
    } catch {
      showToast('Could not follow that player. Try again.', 'error');
    }
  }

  return (
    <View className="mt-1">
      <Text className="text-muted mb-2 px-1 text-xs font-medium">
        Top players this season
      </Text>
      <View>
        {entries.map((p, i) => {
          const isFollowed = followed.has(String(p.userId));
          return (
            <View key={String(p.userId)}>
              {i > 0 ? <View className="ml-10 h-px bg-border" /> : null}
              <View className="flex-row items-center gap-2.5 py-2">
                <Pressable
                  accessibilityRole="button"
                  className="flex-1 flex-row items-center gap-2.5"
                  onPress={() =>
                    p.username
                      ? navigation.navigate('PublicProfile', {
                          username: p.username,
                        })
                      : null
                  }
                >
                  <Avatar imageUrl={p.avatarUrl} name={p.username} size="sm" />
                  <View className="flex-1">
                    <Text
                      className="text-foreground text-sm font-semibold"
                      numberOfLines={1}
                    >
                      {p.username}
                    </Text>
                    <Text className="text-muted mt-px text-xs">
                      Rank #{p.rank} · {p.points.toLocaleString()} pts
                    </Text>
                  </View>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  className={`rounded-full border px-3 py-1.5 ${
                    isFollowed ? 'border-border' : 'border-accent'
                  }`}
                  disabled={isFollowed}
                  onPress={() =>
                    void handleFollow(p.userId as ConvexId<'users'>)
                  }
                >
                  <Text
                    className={`text-xs font-bold ${
                      isFollowed ? 'text-muted' : 'text-accent'
                    }`}
                  >
                    {isFollowed ? 'Following' : 'Follow'}
                  </Text>
                </Pressable>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
