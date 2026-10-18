import {
  compareFeedOrder,
  type FeedGroup,
  groupFeedEvents,
  weekendStarts,
} from '@grandprixpicks/shared/feedGroups';
import { useAuth } from '@clerk/expo';
import { useConvex } from 'convex/react';
import type { NavigationProp } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from '../../integrations/convex/query';
// Mobile runs no React Compiler (babel-plugin-react-compiler is neither
// installed nor enabled for Expo), so nothing memoises the list for us. The
// feed is the one screen where that shows: an unmemoised `renderItem` and
// freshly built blocks re-rendered every row on every page load and clock tick.
// oxlint-disable-next-line no-restricted-imports
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { FeedEvent } from '../../components/feed/FeedEventCard';
import { FeedEmptyState } from '../../components/feed/FeedEmptyState';
import { FeedEventCard } from '../../components/feed/FeedEventCard';
import { NewsGroupCard } from '../../components/feed/NewsGroupCard';
import { WeekendSplit } from '../../components/feed/WeekendSplit';
import { LiveClassificationCard } from '../../components/feed/live-classification-card';
import type { SessionHeader } from '../../components/feed/SessionGroupCard';
import { SessionGroupCard } from '../../components/feed/SessionGroupCard';
import { PicksConnectedScreen } from '../picks/PicksConnectedScreen';
import { GuestWeekendNews } from '../../components/home/GuestWeekendNews';
import { SignedOutHomePanel } from '../../components/home/SignedOutHomePanel';
import { RaceRecapCard } from '../../components/home/RaceRecapCard';
import { SuggestedFollowsSection } from '../../components/home/SuggestedFollowsSection';
import { EmptyState } from '../../components/ui/EmptyState';
import { LoadingScreen } from '../../components/ui/LoadingScreen';
import {
  CHROME_END_PADDING,
  CollapsingChrome,
  TabChrome,
} from '../../components/ui/TabChrome';
import { useHideOnScroll } from '../../hooks/useHideOnScroll';
import type { ConvexId } from '../../integrations/convex/api';
import { api } from '../../integrations/convex/api';
import { captureAnalyticsEvent } from '../../lib/analytics';
import { feedGroupKey, reuseFeedGroups } from '../../lib/feedGroupIdentity';
import { homePaintIsPending } from '../../lib/homePaint';
import { useConnectedDraft } from '../../lib/useConnectedDraft';
import { CASCADE_DRAFT_SESSION } from '../picks/picksShared';
import { useIsSignedIn } from '../../lib/useIsSignedIn';
import { useHomePaintGate } from '../../lib/useHomePaintGate';
import { useNow } from '../../lib/useNow';
import { useRefreshSpinner } from '../../lib/useRefreshSpinner';
import { bucketWeatherNow } from '../../lib/weatherNow';
import type { HomeStackParamList } from '../../navigation/types';
import { useMobileConfig } from '../../providers/mobile-config';
import { colors } from '../../theme/tokens';
import { ActivityIndicator, FlatList, RefreshControl, View } from '../../tw';

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

  const [extraCursors, setExtraCursors] = useState<(string | null)[]>(
    Array(MAX_EXTRA_PAGES).fill(null),
  );
  // Pages past the live ones. The first five pages are subscriptions so
  // reactions and late scores update in place; older history is fetched once
  // and appended. Without this the feed ended at 200 events, which a player
  // following a couple of dozen people reaches inside three weekends.
  const convex = useConvex();
  // Tagged with the viewer they were fetched for, so a different account
  // after sign-out/in never sees the previous player's history.
  const [archive, setArchive] = useState<{
    viewerId: string | undefined;
    pages: NonNullable<FeedPage>[];
  }>({ viewerId: undefined, pages: [] });
  const [archiveLoading, setArchiveLoading] = useState(false);

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

  // Once a guest has drafted a card, the weekend card carries the account
  // prompt itself (the terms of the draft and a sign-in button), so the
  // general panel below would say the same thing twice on one screen.
  const guestDraft = useConnectedDraft(
    weekend?.race.slug ?? '',
    CASCADE_DRAFT_SESSION,
    !isSignedIn && Boolean(weekend),
  );
  const guestHasDraft =
    guestDraft.top5.length > 0 ||
    Object.keys(guestDraft.h2hByMatchup).length > 0;

  const weatherNow = bucketWeatherNow(now);
  // Warms the forecast the weekend card's own row reads, so it paints with
  // the rest of the card rather than a beat later.
  const weatherSlug = weekend?.race.slug;
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
  const archivePages = archive.viewerId === me?._id ? archive.pages : [];
  const isLoadingMore =
    archiveLoading ||
    (activePagesCount > 1 && activePages.some((p) => p === undefined));

  // Only re-derived when a page actually changes. Convex hands back the same
  // page object until its data moves, so the 30-second clock tick, a footer
  // toggle or the viewer's own profile updating no longer rebuild the list.
  const loadedPages = useMemo(
    () => [
      ...activePages.filter((p): p is NonNullable<FeedPage> => p != null),
      ...archivePages,
    ],
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- activePages is a slice of these
    [page0, page1, page2, page3, page4, activePagesCount, archivePages],
  );
  const lastLoadedPage = loadedPages.at(-1);
  const hasMore = lastLoadedPage?.hasMore ?? false;

  function handleLoadMore() {
    if (isLoadingMore || !hasMore || !lastLoadedPage?.nextCursor) {
      return;
    }
    const nextCursor = lastLoadedPage.nextCursor;
    captureAnalyticsEvent('feed_paginated', {
      page: activePagesCount + archivePages.length + 1,
    });
    if (activePagesCount > MAX_EXTRA_PAGES) {
      setArchiveLoading(true);
      convex
        .query(api.feed.getPersonalizedFeed, { paginationCursor: nextCursor })
        .then((page) => {
          if (page) {
            setArchive({
              viewerId: me?._id,
              pages: [...archivePages, page as NonNullable<FeedPage>],
            });
          }
        })
        .catch(() => {
          // Leave the list as it is; the next scroll to the end retries.
        })
        .finally(() => setArchiveLoading(false));
      return;
    }
    setExtraCursors((prev) => {
      const next = [...prev];
      const idx = next.findIndex((c) => c === null);
      if (idx !== -1) {
        next[idx] = lastLoadedPage.nextCursor;
      }
      return next;
    });
  }

  const openEvent = useCallback(
    (event: FeedEvent) => {
      captureAnalyticsEvent('feed_event_opened', { type: event.type });
      navigation.navigate('FeedEventDetail', {
        feedEventId: String(event._id),
      });
    },
    [navigation],
  );

  // Feed order (weekend, then time) across pages, and each event once: a
  // reactive page refreshing can briefly hold the boundary event its
  // neighbour also has. Same merge as web's `FeedContent`.
  //
  // Blocks keep their object identity across recomputes (`reuseFeedGroups`),
  // so a new page at the end leaves every row above it untouched. Without
  // that, each "Loading more" re-rendered the whole list at once, and the
  // rows went blank for the frames it took.
  const previousGroupsRef = useRef<FeedGroup<FeedEvent>[]>([]);
  const { groups, startsWeekend, allSessions } = useMemo(() => {
    const allEvents = Array.from(
      new Map(
        loadedPages.flatMap((p) => p.events).map((event) => [event._id, event]),
      ).values(),
    ).sort(compareFeedOrder);
    const sessions: Record<string, SessionHeader> = Object.assign(
      {},
      ...loadedPages.map((p) => p.sessions),
    );
    const next = reuseFeedGroups(
      previousGroupsRef.current,
      groupFeedEvents(allEvents),
    );
    previousGroupsRef.current = next;
    return {
      groups: next,
      // Which cards open a weekend, so the chequer can go above them. Same
      // rule as web, from the same function.
      startsWeekend: weekendStarts(next),
      allSessions: sessions,
    };
  }, [loadedPages]);

  const viewerId = me?._id as ConvexId<'users'> | undefined;
  const renderItem = useCallback(
    ({ index, item }: { index: number; item: FeedGroup<FeedEvent> }) => (
      <FeedRow
        first={index === 0}
        item={item}
        onOpen={openEvent}
        session={item.kind === 'session' ? allSessions[item.key] : undefined}
        split={startsWeekend[index] ?? false}
        viewerId={viewerId}
      />
    ),
    [allSessions, openEvent, startsWeekend, viewerId],
  );

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
      signedIn: isSignedIn,
      discoveryPending,
      feed: page0,
      me,
      recap,
      weekend,
      weatherPending,
    }),
    isSignedIn ? 'signed-in' : 'signed-out',
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

  return (
    <CollapsingChrome chrome={<TabChrome brand />} sheetStyle={hide.sheetStyle}>
      <FlatList
        contentContainerStyle={{ paddingBottom: 24 + CHROME_END_PADDING }}
        data={groups}
        keyExtractor={feedGroupKey}
        ListEmptyComponent={
          isSignedIn && page0 != null ? <FeedEmptyState /> : null
        }
        // Reserved for as long as there is more to load, not only while a
        // page is in flight: a footer that came and went with each request
        // changed the list's height under the reader's thumb.
        ListFooterComponent={
          hasMore ? (
            <View className="h-14 items-center justify-center">
              {isLoadingMore ? (
                <ActivityIndicator color={colors.textMuted} />
              ) : null}
            </View>
          ) : null
        }
        ListHeaderComponent={
          <FeedListHeader
            guestNewsRace={isSignedIn || !weekend ? null : weekend.race}
            isSignedIn={isSignedIn}
            showSignedOutPanel={
              groups.length === 0 && !isSignedIn && !guestHasDraft
            }
          />
        }
        onEndReached={handleLoadMore}
        // Three screens ahead, which is about one page of 40 events: the next
        // page is requested as the reader enters the last one loaded. At 1.5
        // a few flicks still reached the end a second before the page did,
        // and the list sat bouncing on its footer until it landed.
        onEndReachedThreshold={3}
        {...hide.scrollProps}
        refreshControl={
          <RefreshControl
            colors={[colors.accent]}
            onRefresh={onRefresh}
            refreshing={refreshing}
            tintColor={colors.accent}
          />
        }
        renderItem={renderItem}
        showsVerticalScrollIndicator={false}
      />
    </CollapsingChrome>
  );
}

/**
 * Everything above the activity. Memoised so a feed page arriving or the
 * clock ticking does not re-render the picks card and its editors; each part
 * holds its own subscriptions and re-renders itself when its data changes.
 */
const FeedListHeader = memo(function FeedListHeader({
  guestNewsRace,
  isSignedIn,
  showSignedOutPanel,
}: {
  /** The weekend whose news a guest reads here; null signed in (the feed has it). */
  guestNewsRace: { slug: string; name: string } | null;
  isSignedIn: boolean;
  showSignedOutPanel: boolean;
}) {
  return (
    <View>
      <RaceRecapCard className="mx-4 mt-3 mb-3" />
      {/* Signed in or not. A guest drafts on the device and the card shows
          the draft; it replaced a countdown-only hero that gave a visitor
          nothing to do until they had signed in. */}
      <PicksConnectedScreen embedded />
      {/* Ranked by mutual followers and shared leagues, matching web's
          dashboard rail card — always visible for a signed-in player, not
          just over an empty feed, the way the old leaderboard-rank version
          here was. */}
      {isSignedIn ? (
        <View className="px-4 pt-3">
          <SuggestedFollowsSection />
        </View>
      ) : null}
      {/* Under the weekend, not above it. Leading the tab with lap times from
          a session in progress put them ahead of the picks the tab exists to
          take. */}
      <LiveClassificationCard />
      {guestNewsRace ? (
        <View className="pt-3">
          <GuestWeekendNews
            raceName={guestNewsRace.name}
            raceSlug={guestNewsRace.slug}
          />
        </View>
      ) : null}
      {/* No "Activity" heading over the list. The tab is Home, the rows below
          are plainly the activity, and the web feed dropped the same label. */}
      {showSignedOutPanel ? (
        <View className="px-4 pt-2">
          <SignedOutHomePanel />
        </View>
      ) : null}
    </View>
  );
});

/**
 * One block of the feed. Memoised on its block object: `reuseFeedGroups`
 * keeps that object while the block's events are unchanged, so only the rows
 * whose data moved re-render.
 */
const FeedRow = memo(function FeedRow({
  first,
  item,
  onOpen,
  session,
  split,
  viewerId,
}: {
  first: boolean;
  item: FeedGroup<FeedEvent>;
  onOpen: (event: FeedEvent) => void;
  session: SessionHeader | undefined;
  split: boolean;
  viewerId: ConvexId<'users'> | undefined;
}) {
  const card =
    item.kind === 'standalone' ? (
      <FeedEventCard event={item.event} onPress={() => onOpen(item.event)} />
    ) : item.kind === 'news' ? (
      <NewsGroupCard events={item.events} />
    ) : (
      <SessionGroupCard
        events={item.events}
        session={
          session ?? {
            raceName: item.events[0]?.raceName ?? 'Race',
            sessionType: item.events[0]?.sessionType ?? 'race',
            raceSlug: item.events[0]?.raceSlug,
            top5: [],
          }
        }
        viewerId={viewerId}
      />
    );
  // Joined, as on web's phone layout: no gap between blocks, and each block
  // after the first sits 1px up so its top hairline lands on the one above
  // instead of doubling it. Only a weekend break opens the sheet, with the
  // chequer 12px from each side.
  return (
    <View>
      {split ? <WeekendSplit className="mt-3 mb-3" /> : null}
      <View
        className={first && !split ? 'mt-3' : undefined}
        style={!first && !split ? { marginTop: -1 } : undefined}
      >
        {card}
      </View>
    </View>
  );
});
