import { Loader2, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';

import { PAGE_SIZE, playerCountFormatter } from './constants';
import {
  CombinedTableRow,
  H2HTableRow,
  LeaderboardRow,
  SmallLeaderboard,
} from './rows';
import type {
  CombinedLeaderboardEntry,
  GameMode,
  H2HLeaderboardEntry,
  LeaderboardEntry,
} from './types';

/**
 * Podium + ranked table shared by every leaderboard view. The season board
 * hides the consolation mini-board while more pages exist and appends its
 * load-more footer.
 */
export function LeaderboardBoard({
  entries,
  gameMode,
  showSmallBoard = true,
  footer,
}: {
  entries: LeaderboardEntry[];
  gameMode: GameMode;
  showSmallBoard?: boolean;
  footer?: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="w-12 px-4 py-3 text-left text-sm font-semibold text-text-muted">
                Rank
              </th>
              <th className="px-4 py-3 text-left text-sm font-semibold text-text-muted">
                Player
              </th>
              {gameMode === 'combined' && (
                <>
                  <th className="hidden px-4 py-3 text-right text-sm font-semibold text-text-muted sm:table-cell">
                    Top 5
                  </th>
                  <th className="hidden px-4 py-3 text-right text-sm font-semibold text-text-muted sm:table-cell">
                    H2H
                  </th>
                </>
              )}
              {gameMode === 'h2h' && (
                <th className="hidden px-4 py-3 text-right text-sm font-semibold text-text-muted sm:table-cell">
                  Accuracy
                </th>
              )}
              <th className="px-4 py-3 text-right text-sm font-semibold text-text-muted">
                Points
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) =>
              gameMode === 'combined' ? (
                <CombinedTableRow
                  key={entry.userId}
                  entry={entry as CombinedLeaderboardEntry}
                />
              ) : gameMode === 'h2h' ? (
                <H2HTableRow
                  key={entry.userId}
                  entry={entry as H2HLeaderboardEntry}
                />
              ) : (
                <LeaderboardRow key={entry.userId} entry={entry} />
              ),
            )}
          </tbody>
        </table>

        {showSmallBoard && entries.length <= 3 && entries.length > 0 && (
          <SmallLeaderboard entries={entries} />
        )}
      </div>

      {footer}
    </div>
  );
}

export function SeasonLeaderboardLayout({
  entries,
  hasMore,
  totalCount,
  gameMode,
  isLoadingMore,
  onLoadMore,
}: {
  entries: LeaderboardEntry[];
  hasMore: boolean;
  totalCount: number;
  gameMode: GameMode;
  isLoadingMore: boolean;
  onLoadMore?: () => void;
}) {
  if (entries.length === 0) {
    return (
      <div
        className="rounded-xl border border-border bg-surface p-8 text-center"
        data-testid="leaderboard-empty"
      >
        <Trophy className="mx-auto mb-4 h-16 w-16 text-text-muted" />
        <h2 className="mb-2 text-xl font-semibold text-text">No scores yet</h2>
        <p className="text-text-muted">
          The leaderboard will populate once race results are published.
        </p>
      </div>
    );
  }

  return (
    <LeaderboardBoard
      entries={entries}
      gameMode={gameMode}
      showSmallBoard={!hasMore}
      footer={
        <div className="flex min-h-[3rem] flex-col items-center justify-center py-4">
          {hasMore && (
            <button
              type="button"
              disabled={isLoadingMore}
              onClick={onLoadMore}
              className="inline-flex min-w-[7.5rem] items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-medium text-text-muted transition-colors hover:bg-surface-muted hover:text-text disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-surface-muted disabled:hover:text-text-muted"
            >
              {isLoadingMore ? (
                <>
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  <span>Loading...</span>
                </>
              ) : (
                'Load more'
              )}
            </button>
          )}
          {!hasMore && entries.length > PAGE_SIZE && (
            <p className="text-sm text-text-muted">
              You've reached the end · {playerCountFormatter.format(totalCount)}{' '}
              players
            </p>
          )}
        </div>
      }
    />
  );
}
