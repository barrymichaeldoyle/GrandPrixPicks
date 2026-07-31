import { SeasonLeaderboardLayout } from './board';
import { FollowingGuard, FollowingSeasonContent } from './FollowingContent';
import type { LeaderboardEntry, Scope } from './types';

export function SeasonContent({
  scope,
  seasonEntries,
  seasonHasMore,
  isLoadingMore,
  activeTotalCount,
  loadMoreSeason,
  seasonCombinedFollowing,
}: {
  scope: Scope;
  seasonEntries: LeaderboardEntry[];
  seasonHasMore: boolean;
  isLoadingMore: boolean;
  activeTotalCount: number;
  loadMoreSeason: () => void;
  seasonCombinedFollowing:
    | {
        entries: LeaderboardEntry[];
        totalCount: number;
        hasMore: boolean;
        viewerEntry: LeaderboardEntry | null;
      }
    | undefined;
}) {
  if (scope === 'following') {
    return (
      <FollowingGuard>
        <FollowingSeasonContent data={seasonCombinedFollowing} />
      </FollowingGuard>
    );
  }

  return (
    <SeasonLeaderboardLayout
      entries={seasonEntries}
      hasMore={seasonHasMore}
      totalCount={activeTotalCount}
      isLoadingMore={isLoadingMore}
      onLoadMore={loadMoreSeason}
    />
  );
}
