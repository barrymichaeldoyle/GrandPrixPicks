import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQuery } from 'convex/react';
import { useEffect, useRef, useState } from 'react';

import type { FeedEvent } from '../../components/feed/FeedEventCard';
import { FeedEventCard } from '../../components/feed/FeedEventCard';
import type { SessionHeader } from '../../components/feed/SessionGroupCard';
import { SessionGroupCard } from '../../components/feed/SessionGroupCard';
import { HomeExplore } from '../../components/home/HomeExplore';
import { HomeHero } from '../../components/home/HomeHero';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import { PageHero } from '../../components/ui/PageHero';
import type { ConvexId } from '../../integrations/convex/api';
import { api } from '../../integrations/convex/api';
import { captureAnalyticsEvent } from '../../lib/analytics';
import { useRefreshSpinner } from '../../lib/useRefreshSpinner';
import type { FeedStackParamList } from '../../navigation/types';
import { useMobileConfig } from '../../providers/mobile-config';
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

type FeedGroup =
  | { kind: 'session'; key: string; events: FeedEvent[] }
  | { kind: 'standalone'; key: string; event: FeedEvent };

export function FeedScreen() {
  const { convexEnabled } = useMobileConfig();
  const navigation = useNavigation<NavigationProp<FeedStackParamList>>();
  const { refreshing, onRefresh } = useRefreshSpinner();

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

  if (!convexEnabled) {
    return (
      <View className="flex-1 bg-page px-4 pt-3">
        <PageHero
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

  if (page0 === undefined) {
    return <LoadingScreen />;
  }

  const allEvents = loadedPages.flatMap((p) => p.events);
  const allSessions: Record<string, SessionHeader> = Object.assign(
    {},
    ...loadedPages.map((p) => p.sessions),
  );

  // Group session_locked / score_published by race+session, keep the rest
  // standalone, preserving feed order (matches web).
  const groups: FeedGroup[] = [];
  const sessionGroups = new Map<string, FeedGroup & { kind: 'session' }>();
  for (const event of allEvents) {
    if (
      (event.type === 'score_published' || event.type === 'session_locked') &&
      event.raceId &&
      event.sessionType
    ) {
      const key = `${event.raceId}_${event.sessionType}`;
      let group = sessionGroups.get(key);
      if (!group) {
        group = { kind: 'session', key, events: [] };
        sessionGroups.set(key, group);
        groups.push(group);
      }
      group.events.push(event);
    } else {
      groups.push({ kind: 'standalone', key: String(event._id), event });
    }
  }

  return (
    <View className="flex-1 bg-page px-4 pt-3">
      <FlatList
        contentContainerClassName="gap-3 pb-6"
        data={groups}
        keyExtractor={(group) => group.key}
        ListEmptyComponent={null}
        ListFooterComponent={
          isLoadingMore ? (
            <Text className="text-muted py-3 text-center text-xs">
              Loading more…
            </Text>
          ) : null
        }
        ListHeaderComponent={
          <View className="gap-2">
            <HomeHero />
            {groups.length > 0 ? (
              <Text className="text-muted mb-2 px-1 text-[11px] font-bold uppercase">
                Activity
              </Text>
            ) : (
              <View className="gap-5">
                <HomeExplore />
                <TopPlayersToFollow />
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
        renderItem={({ item }) =>
          item.kind === 'standalone' ? (
            <FeedEventCard
              event={item.event}
              onPress={() => openEvent(item.event)}
            />
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
          )
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

/**
 * Empty-feed discovery: the season's top players with one-tap follow,
 * so a new account can fill its feed without leaving the tab.
 */
function TopPlayersToFollow() {
  const navigation = useNavigation<NavigationProp<FeedStackParamList>>();
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
                  className="flex-1 flex-row items-center gap-2.5"
                  onPress={() =>
                    p.username
                      ? navigation.navigate('PublicProfile', {
                          username: p.username,
                        })
                      : null
                  }
                >
                  <Avatar
                    imageUrl={p.avatarUrl}
                    name={p.displayName ?? p.username ?? '?'}
                    size="sm"
                  />
                  <View className="flex-1">
                    <Text
                      className="text-foreground text-sm font-semibold"
                      numberOfLines={1}
                    >
                      {p.displayName ?? p.username}
                    </Text>
                    <Text className="text-muted mt-px text-[11px]">
                      Rank #{p.rank} · {p.points.toLocaleString()} pts
                    </Text>
                  </View>
                </Pressable>
                <Pressable
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
