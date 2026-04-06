import { useAuth } from '@clerk/react';
import { api } from '@convex-generated/api';
import { createFileRoute, Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { Gauge, Trophy } from 'lucide-react';
import { useState } from 'react';

import { Button } from '../../components/Button/Button';
import { Avatar } from '../../components/Avatar';
import {
  FeedEmptyState,
  FeedItem,
  FeedItemSkeleton,
  SessionSeparator,
} from '../../components/FeedItem';
import { FollowButton } from '../../components/FollowButton';
import { canonicalMeta, noIndexMeta } from '../../lib/site';

export const Route = createFileRoute('/feed/')({
  component: FeedPage,
  head: () => {
    const canonical = canonicalMeta('/feed');
    return {
      meta: [
        { title: 'Feed | Grand Prix Picks' },
        {
          name: 'description',
          content: "See what's happening with your friends and leagues.",
        },
        ...noIndexMeta(),
        ...canonical.meta,
      ],
      links: [...canonical.links],
    };
  },
});

// Pre-allocate up to 5 pages of feed (5 × 40 = 200 events max)
const MAX_EXTRA_PAGES = 4;

export function FeedContent() {
  const [extraCursors, setExtraCursors] = useState<(string | null)[]>(
    Array(MAX_EXTRA_PAGES).fill(null),
  );

  const page0 = useQuery(api.feed.getPersonalizedFeed, {});
  const page1 = useQuery(
    api.feed.getPersonalizedFeed,
    extraCursors[0] !== null ? { paginationCursor: extraCursors[0] } : 'skip',
  );
  const page2 = useQuery(
    api.feed.getPersonalizedFeed,
    extraCursors[1] !== null ? { paginationCursor: extraCursors[1] } : 'skip',
  );
  const page3 = useQuery(
    api.feed.getPersonalizedFeed,
    extraCursors[2] !== null ? { paginationCursor: extraCursors[2] } : 'skip',
  );
  const page4 = useQuery(
    api.feed.getPersonalizedFeed,
    extraCursors[3] !== null ? { paginationCursor: extraCursors[3] } : 'skip',
  );
  const followedIds = useQuery(api.follows.getViewerFollowedIds, {});
  const myLeagues = useQuery(api.leagues.getMyLeagues);
  const suggestedLeagueMembers = useQuery(
    api.follows.getSuggestedLeagueMembersToFollow,
    { limit: 3 },
  );

  const allPageData = [page0, page1, page2, page3, page4];
  const activePagesCount = 1 + extraCursors.filter((c) => c !== null).length;
  const activePages = allPageData.slice(0, activePagesCount);
  const isLoadingMore =
    activePagesCount > 1 && activePages.some((p) => p === undefined);

  const loadedPages = activePages.filter(
    (p): p is NonNullable<typeof p> => p !== undefined,
  );
  const lastLoadedPage = loadedPages.at(-1);

  const hasMore =
    (lastLoadedPage?.hasMore ?? false) && activePagesCount <= MAX_EXTRA_PAGES;

  function handleLoadMore() {
    if (!lastLoadedPage?.nextCursor) {
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

  if (page0 === undefined) {
    return (
      <div className="space-y-3">
        <FeedItemSkeleton />
        <FeedItemSkeleton />
        <FeedItemSkeleton />
        <FeedItemSkeleton />
      </div>
    );
  }

  // Merge events and sessions from all loaded pages
  const allEvents = loadedPages.flatMap((p) => p.events);
  const allSessions = Object.assign({}, ...loadedPages.map((p) => p.sessions));

  if (allEvents.length === 0) {
    if (
      followedIds === undefined ||
      myLeagues === undefined ||
      suggestedLeagueMembers === undefined
    ) {
      return (
        <FeedEmptyState
          icon={Gauge}
          title="Setting up your feed"
          message="Finding players and leagues to show here."
        />
      );
    }

    const hasLeagues = (myLeagues?.length ?? 0) > 0;
    const hasSuggestions = (suggestedLeagueMembers?.length ?? 0) > 0;
    const followsNobody = (followedIds?.length ?? 0) === 0;

    if (hasSuggestions && suggestedLeagueMembers) {
      return (
        <FeedEmptyState
          icon={Gauge}
          title="Start with people in your leagues"
          message="Follow a few league-mates to see their scores and activity here."
        >
          <div className="space-y-2 text-left">
            {suggestedLeagueMembers.map((user) => (
              <div
                key={user._id}
                className="flex items-center gap-3 rounded-xl border border-border bg-surface-muted/35 px-3 py-2"
              >
                <Link
                  to="/p/$username"
                  params={{ username: user.username }}
                  search={{ from: undefined, fromLabel: undefined }}
                  className="shrink-0"
                >
                  <Avatar
                    avatarUrl={user.avatarUrl}
                    username={user.username}
                    size="sm"
                  />
                </Link>
                <div className="min-w-0 flex-1">
                  <Link
                    to="/p/$username"
                    params={{ username: user.username }}
                    search={{ from: undefined, fromLabel: undefined }}
                    className="truncate text-sm font-semibold text-text hover:text-accent"
                  >
                    {user.displayName}
                  </Link>
                  <p className="truncate text-xs text-text-muted">
                    {user.sharedLeagueNames.length > 0
                      ? `In ${user.sharedLeagueNames.join(' and ')}`
                      : `${user.sharedLeagueCount} shared leagues`}
                  </p>
                </div>
                <FollowButton followeeId={user._id} />
              </div>
            ))}
          </div>
        </FeedEmptyState>
      );
    }

    if (followsNobody) {
      return (
        <FeedEmptyState
          icon={Gauge}
          title={
            hasLeagues
              ? 'You are not following anyone yet'
              : 'Find players to follow'
          }
          message={
            hasLeagues
              ? 'Your leagues are a good place to start, or you can browse the leaderboard to find more players.'
              : 'Browse the leaderboard to find players to follow and start filling your feed.'
          }
        >
          <div className="flex justify-center">
            <Button asChild variant="primary" size="md" leftIcon={Trophy}>
              <Link to="/leaderboard">Browse leaderboard</Link>
            </Button>
          </div>
        </FeedEmptyState>
      );
    }

    return (
      <FeedEmptyState
        icon={Gauge}
        title="No recent activity yet"
        message="The players and leagues in your feed have not posted any new scores yet."
      />
    );
  }

  type Group =
    | { kind: 'session'; key: string; events: (typeof allEvents)[number][] }
    | { kind: 'standalone'; event: (typeof allEvents)[number] };

  const groups: Group[] = [];
  const sessionGroupMap = new Map<string, Group & { kind: 'session' }>();

  for (const event of allEvents) {
    if (
      (event.type === 'score_published' || event.type === 'session_locked') &&
      event.raceId &&
      event.sessionType
    ) {
      const key = `${event.raceId}_${event.sessionType}`;
      let group = sessionGroupMap.get(key);
      if (!group) {
        group = { kind: 'session', key, events: [] };
        sessionGroupMap.set(key, group);
        groups.push(group);
      }
      group.events.push(event);
    } else {
      groups.push({ kind: 'standalone', event });
    }
  }

  return (
    <div className="space-y-3">
      {groups.map((group) => {
        if (group.kind === 'standalone') {
          return <FeedItem key={group.event._id} event={group.event} />;
        }
        const session = allSessions[group.key];
        const isMulti = group.events.length > 1;
        const sessionWithTime = {
          ...session,
          createdAt: group.events[group.events.length - 1]?.createdAt,
        };
        return (
          <div key={group.key}>
            <SessionSeparator session={sessionWithTime} grouped={isMulti} />
            {group.events.map((event, i) => {
              const position = !isMulti
                ? undefined
                : i === 0
                  ? 'first'
                  : i === group.events.length - 1
                    ? 'last'
                    : 'middle';
              return (
                <FeedItem
                  key={event._id}
                  event={event}
                  grouped={isMulti}
                  position={position}
                />
              );
            })}
          </div>
        );
      })}
      {isLoadingMore && (
        <div className="space-y-3">
          <FeedItemSkeleton />
          <FeedItemSkeleton />
        </div>
      )}
      {hasMore && !isLoadingMore && (
        <div className="flex justify-center pt-2">
          <Button variant="secondary" size="md" onClick={handleLoadMore}>
            Load more
          </Button>
        </div>
      )}
    </div>
  );
}

function FeedPage() {
  const { isSignedIn, isLoaded } = useAuth();

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-accent" />
            <h1 className="text-xl font-bold text-text">Your Feed</h1>
          </div>
        </div>

        {!isLoaded ? (
          <div className="space-y-3">
            <FeedItemSkeleton />
            <FeedItemSkeleton />
            <FeedItemSkeleton />
            <FeedItemSkeleton />
          </div>
        ) : !isSignedIn ? (
          <div className="rounded-xl border border-border bg-surface px-6 py-10 text-center">
            <Gauge className="mx-auto mb-3 h-8 w-8 text-accent" />
            <p className="mb-4 text-sm text-text-muted">
              Sign in to see scores from your friends and leagues.
            </p>
            <Button asChild variant="primary" size="md">
              <Link to="/">Go to home</Link>
            </Button>
          </div>
        ) : (
          <FeedContent />
        )}
      </div>
    </div>
  );
}
