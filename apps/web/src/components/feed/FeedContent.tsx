import { api } from '@convex-generated/api';
import type { FunctionReturnType } from 'convex/server';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@/integrations/convex/query';
import { Gauge, Trophy } from 'lucide-react';
import { Fragment, type ReactNode, useState } from 'react';

import { Avatar } from '@/components/Avatar';
import { Button } from '@/components/Button/Button';
import { FeedItem } from '@/components/FeedItem/FeedItem';
import { NewsGroup } from '@/components/FeedItem/NewsGroup';
import { groupFeedEvents } from './groupFeedEvents';
import { SessionGroup } from '@/components/FeedItem/SessionGroup';
import { FeedEmptyState } from '@/components/FeedItem/states';
import { InlineLoader } from '@/components/InlineLoader';
import { FollowButton } from '@/components/FollowButton';

type FeedPage = NonNullable<
  FunctionReturnType<typeof api.feed.getPersonalizedFeed>
>;

/**
 * The activity stream. Lived at `/feed` until that page was removed for
 * duplicating the dashboard's Activity section; it is a component rather than a
 * route now, and the dashboard is its only host.
 */
// Pre-allocate up to 5 pages of feed (5 x 40 = 200 events max)
const MAX_EXTRA_PAGES = 4;

export function FeedContent({
  initialPage,
  showLoader = true,
  interleaved = null,
}: {
  /**
   * The top of the feed as the server read it, so the section renders with rows
   * instead of a spinner. A truncated slice of the real first page (see
   * `home.getDashboardPageData`), replaced by the live query as soon as it
   * answers. Absent whenever the server could not read as the viewer.
   */
  initialPage?: FeedPage | null;
  /**
   * False while something above this section is already showing a spinner, on
   * a page that hosts both. The stream then waits silently instead of adding a
   * second one: it is below the fold, it has no seed in exactly the loads where
   * the block above has none either, and both answers come off the same socket,
   * so by the time the spinner above lifts the rows are normally already here.
   */
  showLoader?: boolean;
  /**
   * A block to render inside the stream rather than after it, directly under
   * one session's group.
   *
   * The dashboard's picks card during the results-first window. The card
   * belongs immediately under the race that just ran, and "under the race
   * result" is a position in this stream, not a position on the page.
   *
   * Rendered exactly once. If the named group is not in the loaded pages, the
   * card leads this stream rather than sitting under Load more.
   */
  interleaved?: {
    /** From `sessionGroupKey`, so the format is not spelled out twice. */
    afterSessionKey: string;
    node: ReactNode;
  } | null;
} = {}) {
  const [extraCursors, setExtraCursors] = useState<(string | null)[]>(
    Array(MAX_EXTRA_PAGES).fill(null),
  );

  // `!== undefined` rather than `??`: null is this query's real answer for a
  // signed-out viewer, and only "has not answered yet" should fall back.
  const livePage0 = useQuery(api.feed.getPersonalizedFeed, {});
  const page0 = livePage0 !== undefined ? livePage0 : initialPage;
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
  const me = useQuery(api.users.me, {});
  const followedIds = useQuery(api.follows.getViewerFollowedIds, {});
  const myLeagues = useQuery(api.leagues.getMyLeagues);
  const suggestedLeagueMembers = useQuery(
    api.follows.getSuggestedLeagueMembersToFollow,
    { limit: 3 },
  );
  const topPlayersForFollow = useQuery(
    api.leaderboards.getCombinedSeasonLeaderboard,
    { limit: 6 },
  );

  const allPageData = [page0, page1, page2, page3, page4];
  const activePagesCount = 1 + extraCursors.filter((c) => c !== null).length;
  const activePages = allPageData.slice(0, activePagesCount);
  const isLoadingMore =
    activePagesCount > 1 && activePages.some((p) => p === undefined);

  // `undefined` is Convex still loading; `null` is "no viewer" — the feed is
  // viewer-scoped, so a signed-out client gets null on every page.
  const loadedPages = activePages.filter(
    (p): p is NonNullable<typeof p> => p !== undefined && p !== null,
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

  /**
   * Every return below goes through this, so the interleaved block reaches the
   * page on the empty and loading paths too — never twice, and never not at
   * all. The group branch passes `placed` once it has already rendered it.
   *
   * When the named group is missing, the card leads the stream rather than
   * sitting under Load more: that button is "there is more of this list",
   * not "the picker for the next round belongs down here".
   */
  function withInterleaved(body: ReactNode, placed = false) {
    if (!interleaved || placed) {
      return body;
    }
    return (
      <>
        {interleaved.node}
        {body}
      </>
    );
  }

  if (page0 === undefined) {
    // One spinner, not four row skeletons. The rows that land here vary in
    // height and content, so the skeletons never stood in for anything in
    // particular: they just made the section flicker on every reload.
    return withInterleaved(
      showLoader ? <InlineLoader label="Loading activity" /> : null,
    );
  }

  // Keep the merged feed chronological even while reactive pages refresh, and
  // avoid briefly rendering the boundary event twice across adjacent pages.
  const mergedEvents = Array.from(
    new Map(
      loadedPages.flatMap((p) => p.events).map((event) => [event._id, event]),
    ).values(),
  ).sort((a, b) => b.createdAt - a.createdAt);
  const allSessions = Object.assign({}, ...loadedPages.map((p) => p.sessions));

  if (mergedEvents.length === 0) {
    if (
      followedIds === undefined ||
      myLeagues === undefined ||
      suggestedLeagueMembers === undefined
    ) {
      return withInterleaved(
        <FeedEmptyState
          icon={Gauge}
          title="Setting up your feed"
          message="Finding players and leagues to show here."
        />,
      );
    }

    const hasLeagues = (myLeagues?.length ?? 0) > 0;
    const hasSuggestions = (suggestedLeagueMembers?.length ?? 0) > 0;
    const followsNobody = (followedIds?.length ?? 0) === 0;

    if (hasSuggestions && suggestedLeagueMembers) {
      return withInterleaved(
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
        </FeedEmptyState>,
      );
    }

    if (followsNobody) {
      const topToFollow = (topPlayersForFollow?.entries ?? [])
        .filter((p) => !p.isViewer)
        .slice(0, 5);
      return withInterleaved(
        <FeedEmptyState
          icon={Gauge}
          title={
            hasLeagues
              ? 'You are not following anyone yet'
              : 'Find players to follow'
          }
          message={
            hasLeagues
              ? 'Follow players to see their scores and activity here.'
              : 'Follow players to see their picks and results here.'
          }
        >
          {topToFollow.length > 0 && (
            <div className="space-y-2 text-left">
              <p className="text-xs font-medium text-text-muted">
                Top players this season
              </p>
              {topToFollow.map((p) => (
                <div
                  key={p.userId}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface-muted/35 px-3 py-2"
                >
                  <Link
                    to="/p/$username"
                    params={{ username: p.username }}
                    search={{ from: undefined, fromLabel: undefined }}
                    className="shrink-0"
                  >
                    <Avatar
                      avatarUrl={p.avatarUrl}
                      username={p.username}
                      size="sm"
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <Link
                      to="/p/$username"
                      params={{ username: p.username }}
                      search={{ from: undefined, fromLabel: undefined }}
                      className="truncate text-sm font-semibold text-text hover:text-accent"
                    >
                      {p.username}
                    </Link>
                    <p className="truncate text-xs text-text-muted">
                      Rank #{p.rank} · {p.points.toLocaleString()} pts
                    </p>
                  </div>
                  <FollowButton followeeId={p.userId} />
                </div>
              ))}
            </div>
          )}
          <div className="mt-3 flex justify-center">
            <Button asChild variant="secondary" size="md" leftIcon={Trophy}>
              <Link to="/leaderboard">See full leaderboard</Link>
            </Button>
          </div>
        </FeedEmptyState>,
      );
    }

    return withInterleaved(
      <FeedEmptyState
        icon={Gauge}
        title="No recent activity yet"
        message="The players and leagues in your feed have not posted any new scores yet."
      />,
    );
  }

  // Practice already has a home: PracticeHighlights, above this stream.
  // The feed card is a different component (race-named heading, a padded
  // list, "View full results") and stacking it under the highlights card
  // was the same FP1 classification twice, in two vibes.
  const allEvents = mergedEvents.filter(
    (event) => event.type !== 'practice_published',
  );
  const groups = groupFeedEvents(allEvents);

  // Only when the group is actually here. Otherwise the card leads this
  // stream: under Load more was a position nobody opening the page for
  // their next pick would look.
  const slotAfter =
    interleaved &&
    groups.some(
      (group) =>
        group.kind === 'session' && group.key === interleaved.afterSessionKey,
    )
      ? interleaved.afterSessionKey
      : null;

  return withInterleaved(
    <div className="space-y-0 md:space-y-4">
      {interleaved && slotAfter === null ? interleaved.node : null}
      {groups.map((group) => {
        if (group.kind === 'standalone') {
          return <FeedItem key={group.event._id} event={group.event} />;
        }
        if (group.kind === 'news') {
          return <NewsGroup key={group.events[0]!._id} events={group.events} />;
        }
        const session = allSessions[group.key];
        return (
          <Fragment key={group.key}>
            <SessionGroup
              session={session}
              events={group.events}
              viewerId={me?._id}
            />
            {group.key === slotAfter ? interleaved?.node : null}
          </Fragment>
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
    </div>,
    true,
  );
}
