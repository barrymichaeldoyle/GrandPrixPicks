import { groupFeedEvents } from '@grandprixpicks/shared/feedGroups';
import { useAuth } from '@clerk/expo';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useMutation } from 'convex/react';
import { useQuery } from '../../integrations/convex/query';
import { useEffect, useRef, useState } from 'react';

import type { FeedEvent } from '../../components/feed/FeedEventCard';
import { FeedEventCard } from '../../components/feed/FeedEventCard';
import { NewsGroupCard } from '../../components/feed/NewsGroupCard';
import type { SessionHeader } from '../../components/feed/SessionGroupCard';
import { SessionGroupCard } from '../../components/feed/SessionGroupCard';
import { HomeExplore } from '../../components/home/HomeExplore';
import { PicksConnectedScreen } from '../PicksConnectedScreen';
import { HomeHero } from '../../components/home/HomeHero';
import { SignedOutHomePanel } from '../../components/home/SignedOutHomePanel';
import { RaceRecapCard } from '../../components/home/RaceRecapCard';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { PageHeader } from '../../components/ui/PageHeader';
import type { ConvexId } from '../../integrations/convex/api';
import { api } from '../../integrations/convex/api';
import { captureAnalyticsEvent } from '../../lib/analytics';
import { homePaintIsPending } from '../../lib/homePaint';
import { useIsSignedIn } from '../../lib/useIsSignedIn';
import { useHomePaintGate } from '../../lib/useHomePaintGate';
import { useRaceWeekends } from '../../lib/useRaceWeekends';
import { useRefreshSpinner } from '../../lib/useRefreshSpinner';
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
  const { isLoading: racesLoading } = useRaceWeekends();

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
    }),
  );

  if (!convexEnabled) {
    return (
      <View className="flex-1 bg-page px-4 pt-3">
        <PageHeader
          subtitle="Live updates from you and the people you follow."
          title="Feed"
        />
        <EmptyState
          body="Configure your Convex URL to see your feed."
          icon="pulse-outline"
          title="Not connected"
        />
      </View>
    );
  }

  if (holdPaint) {
    return <LoadingScreen />;
  }

  const allEvents = loadedPages.flatMap((p) => p.events);
  const allSessions: Record<string, SessionHeader> = Object.assign(
    {},
    ...loadedPages.map((p) => p.sessions),
  );

  const groups = groupFeedEvents(allEvents);

  return (
    <View className="flex-1 bg-page">
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
                <HomeExplore />
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
        refreshControl={
          <RefreshControl
            colors={[colors.accent]}
            onRefresh={onRefresh}
            refreshing={refreshing}
            tintColor={colors.accent}
          />
        }
        renderItem={({ item }) => {
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
                    top5: [],
                  }
                }
                viewerId={me?._id as ConvexId<'users'> | undefined}
              />
            );
          return <View className="px-4 pt-3">{card}</View>;
        }}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

/**
 * Empty-feed discovery: the season's top players with one-tap follow,
 * so a new account can fill its feed without leaving the tab.
 *
 * Signed-in only. `follows.follow` requires a viewer, so for a guest every
 * button here threw and rolled its own optimistic state back with nothing
 * shown — a Follow button that visibly un-pressed itself.
 */
function TopPlayersToFollow() {
  const navigation = useNavigation<NavigationProp<HomeStackParamList>>();
  const { showToast } = useToast();
  const topPlayers = useQuery(api.leaderboards.getCombinedSeasonLeaderboard, {
    limit: 6,
  });
  const follow = useMutation(api.follows.follow);
  const [followed, setFollowed] = useState<Set<string>>(new Set());

  const entries = (topPlayers?.entries ?? [])
    .filter((p) => !p.isViewer)
    .slice(0, 5);

  if (entries.length === 0) {
    return null;
  }

  async function handleFollow(userId: ConvexId<'users'>) {
    setFollowed((prev) => new Set(prev).add(String(userId)));
    try {
      await follow({ followeeId: userId });
    } catch {
      setFollowed((prev) => {
        const next = new Set(prev);
        next.delete(String(userId));
        return next;
      });
      showToast('Could not follow that player. Try again.', 'error');
    }
  }

  return (
    <View className="mt-1">
      <Text className="text-muted mb-2 px-1 text-[11px] font-bold uppercase">
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
                    <Text className="text-muted mt-px text-[11px]">
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
