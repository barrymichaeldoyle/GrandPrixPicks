import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { useStickyValue } from '@/hooks/useStickyValue';
import { useQuery } from '@/integrations/convex/query';
import { Gauge } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/Button/Button';
import { FeedItem } from '@/components/FeedItem/FeedItem';
import { SessionGroup } from '@/components/FeedItem/SessionGroup';
import { FeedEmptyState } from '@/components/FeedItem/states';
import { InlineLoader } from '@/components/InlineLoader';

const MAX_LEAGUE_FEED_EXTRA_PAGES = 4;

export function LeagueFeed({ leagueId }: { leagueId: Id<'leagues'> }) {
  // How many pages past the first are open, per league. Each one starts
  // where the page above it ends *now*, as on the dashboard feed: frozen
  // cursors let an event slide into the gap between two pages and vanish.
  const [extraPages, setExtraPages] = useState({ leagueId, count: 0 });
  const extraPageCount =
    extraPages.leagueId === leagueId ? extraPages.count : 0;

  const me = useQuery(api.users.me, {});
  const page0 = useQuery(api.feed.getLeagueFeed, { leagueId });
  const page1 = useStickyValue(
    useQuery(
      api.feed.getLeagueFeed,
      extraPageCount >= 1 && page0?.nextCursor
        ? { leagueId, paginationCursor: page0.nextCursor }
        : 'skip',
    ),
  );
  const page2 = useStickyValue(
    useQuery(
      api.feed.getLeagueFeed,
      extraPageCount >= 2 && page1?.nextCursor
        ? { leagueId, paginationCursor: page1.nextCursor }
        : 'skip',
    ),
  );
  const page3 = useStickyValue(
    useQuery(
      api.feed.getLeagueFeed,
      extraPageCount >= 3 && page2?.nextCursor
        ? { leagueId, paginationCursor: page2.nextCursor }
        : 'skip',
    ),
  );
  const page4 = useStickyValue(
    useQuery(
      api.feed.getLeagueFeed,
      extraPageCount >= 4 && page3?.nextCursor
        ? { leagueId, paginationCursor: page3.nextCursor }
        : 'skip',
    ),
  );

  const allPageData = [page0, page1, page2, page3, page4];
  const activePagesCount = 1 + extraPageCount;
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
    setExtraPages({
      leagueId,
      count: Math.min(MAX_LEAGUE_FEED_EXTRA_PAGES, extraPageCount + 1),
    });
  }

  if (page0 === undefined) {
    return <InlineLoader label="Loading league activity" />;
  }

  // Each event once: a page held at its old cursor while it re-subscribes can
  // briefly share its first event with the end of the page above.
  const allEvents = Array.from(
    new Map(
      loadedPages.flatMap((p) => p.events).map((event) => [event._id, event]),
    ).values(),
  );
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
    <div className="space-y-0 md:space-y-3">
      {groups.map((group) => {
        if (group.kind === 'standalone') {
          return <FeedItem key={group.event._id} event={group.event} />;
        }
        return (
          <SessionGroup
            key={group.key}
            session={allSessions[group.key]}
            events={group.events}
            viewerId={me?._id}
          />
        );
      })}
      {isLoadingMore && (
        <InlineLoader label="Loading more activity" className="py-6" />
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
