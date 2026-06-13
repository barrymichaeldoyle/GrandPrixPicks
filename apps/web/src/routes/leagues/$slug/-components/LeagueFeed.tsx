import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { useQuery } from 'convex/react';
import { Gauge } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/Button/Button';
import {
  FeedEmptyState,
  FeedItem,
  FeedItemSkeleton,
  SessionSeparator,
} from '@/components/FeedItem';

const MAX_LEAGUE_FEED_EXTRA_PAGES = 4;

export function LeagueFeed({ leagueId }: { leagueId: Id<'leagues'> }) {
  const [extraCursors, setExtraCursors] = useState<(string | null)[]>(
    Array(MAX_LEAGUE_FEED_EXTRA_PAGES).fill(null),
  );

  const page0 = useQuery(api.feed.getLeagueFeed, { leagueId });
  const page1 = useQuery(
    api.feed.getLeagueFeed,
    extraCursors[0] !== null
      ? { leagueId, paginationCursor: extraCursors[0] }
      : 'skip',
  );
  const page2 = useQuery(
    api.feed.getLeagueFeed,
    extraCursors[1] !== null
      ? { leagueId, paginationCursor: extraCursors[1] }
      : 'skip',
  );
  const page3 = useQuery(
    api.feed.getLeagueFeed,
    extraCursors[2] !== null
      ? { leagueId, paginationCursor: extraCursors[2] }
      : 'skip',
  );
  const page4 = useQuery(
    api.feed.getLeagueFeed,
    extraCursors[3] !== null
      ? { leagueId, paginationCursor: extraCursors[3] }
      : 'skip',
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
    (lastLoadedPage?.hasMore ?? false) &&
    activePagesCount <= MAX_LEAGUE_FEED_EXTRA_PAGES;

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

  const allEvents = loadedPages.flatMap((p) => p.events);
  const allSessions = Object.assign({}, ...loadedPages.map((p) => p.sessions));

  if (allEvents.length === 0) {
    return (
      <FeedEmptyState
        icon={Gauge}
        message="No activity yet. Scores will appear here once race results are published."
      />
    );
  }

  type FeedEvent = (typeof allEvents)[number];
  type Group =
    | { kind: 'session'; key: string; events: FeedEvent[] }
    | { kind: 'standalone'; event: FeedEvent };

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
