import { SeasonLeaderboardLayout } from './board';
import { FollowingGuard, FollowingSeasonContent } from './FollowingContent';
import { LeaderboardContentLoader } from './rows';
import type {
  CombinedLeaderboardEntry,
  GameMode,
  H2HLeaderboardEntry,
  LeaderboardEntry,
  Scope,
} from './types';

export function SeasonContent({
  scope,
  gameMode,
  seasonEntries,
  seasonHasMore,
  isLoadingMore,
  activeTotalCount,
  loadMoreSeason,
  seasonTop5Global,
  seasonH2HGlobal,
  seasonCombinedFollowing,
  seasonTop5Following,
  seasonH2HFollowing,
}: {
  scope: Scope;
  gameMode: GameMode;
  seasonEntries: CombinedLeaderboardEntry[];
  seasonHasMore: boolean;
  isLoadingMore: boolean;
  activeTotalCount: number;
  loadMoreSeason: () => void;
  seasonTop5Global:
    | {
        entries: LeaderboardEntry[];
        totalCount: number;
        hasMore: boolean;
        viewerEntry: LeaderboardEntry | null;
      }
    | undefined;
  seasonH2HGlobal:
    | {
        entries: H2HLeaderboardEntry[];
        totalCount: number;
        hasMore: boolean;
        viewerEntry: H2HLeaderboardEntry | null;
      }
    | undefined;
  seasonCombinedFollowing:
    | {
        entries: CombinedLeaderboardEntry[];
        totalCount: number;
        hasMore: boolean;
        viewerEntry: CombinedLeaderboardEntry | null;
      }
    | undefined;
  seasonTop5Following:
    | {
        entries: LeaderboardEntry[];
        totalCount: number;
        hasMore: boolean;
        viewerEntry: LeaderboardEntry | null;
      }
    | undefined;
  seasonH2HFollowing:
    | {
        entries: H2HLeaderboardEntry[];
        totalCount: number;
        hasMore: boolean;
        viewerEntry: H2HLeaderboardEntry | null;
      }
    | undefined;
}) {
  if (scope === 'following') {
    const data =
      gameMode === 'combined'
        ? seasonCombinedFollowing
        : gameMode === 'top5'
          ? seasonTop5Following
          : seasonH2HFollowing;
    return (
      <FollowingGuard>
        <FollowingSeasonContent data={data} gameMode={gameMode} />
      </FollowingGuard>
    );
  }

  // Global season
  if (gameMode === 'top5') {
    if (seasonTop5Global === undefined) {
      return <LeaderboardContentLoader />;
    }
    return (
      <SeasonLeaderboardLayout
        entries={seasonTop5Global.entries}
        hasMore={seasonTop5Global.hasMore}
        totalCount={seasonTop5Global.totalCount}
        gameMode="top5"
        isLoadingMore={false}
        onLoadMore={() => {}}
      />
    );
  }

  if (gameMode === 'h2h') {
    if (seasonH2HGlobal === undefined) {
      return <LeaderboardContentLoader />;
    }
    return (
      <SeasonLeaderboardLayout
        entries={seasonH2HGlobal.entries as LeaderboardEntry[]}
        hasMore={seasonH2HGlobal.hasMore}
        totalCount={seasonH2HGlobal.totalCount}
        gameMode="h2h"
        isLoadingMore={false}
      />
    );
  }

  // Combined global (default) — supports pagination
  return (
    <SeasonLeaderboardLayout
      entries={seasonEntries}
      hasMore={seasonHasMore}
      totalCount={activeTotalCount}
      gameMode="combined"
      isLoadingMore={isLoadingMore}
      onLoadMore={loadMoreSeason}
    />
  );
}
