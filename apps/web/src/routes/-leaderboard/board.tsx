import { Loader2, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';

import { PAGE_SIZE, playerCountFormatter } from './constants';
import { LeaderboardRow } from './rows';
import type { LeaderboardEntry } from './types';
import { NoticeCard } from '@/components/NoticeCard';

/**
 * Ranked table shared by every leaderboard view. The season board appends its
 * load-more footer.
 */
export function LeaderboardBoard({
  entries,
  footer,
}: {
  entries: LeaderboardEntry[];
  footer?: ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border border-border bg-surface">
        <table className="w-full table-fixed">
          <thead>
            <tr className="border-b border-border">
              <th className="w-14 py-2.5 pr-2 pl-4 text-left text-xs font-medium text-text-muted">
                Rank
              </th>
              <th className="py-2.5 pr-2 text-left text-xs font-medium text-text-muted">
                Player
              </th>
              <th className="w-20 py-2.5 pr-4 pl-2 text-right text-xs font-medium text-text-muted">
                Points
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <LeaderboardRow key={entry.userId} entry={entry} />
            ))}
          </tbody>
        </table>
      </div>

      {footer}
    </div>
  );
}

export function SeasonLeaderboardLayout({
  entries,
  hasMore,
  totalCount,
  isLoadingMore,
  onLoadMore,
}: {
  entries: LeaderboardEntry[];
  hasMore: boolean;
  totalCount: number;
  isLoadingMore: boolean;
  onLoadMore?: () => void;
}) {
  if (entries.length === 0) {
    return (
      <NoticeCard
        data-testid="leaderboard-empty"
        icon={Trophy}
        title="No scores yet"
        description="The leaderboard will populate once race results are published."
      />
    );
  }

  // Nothing to load and nothing worth saying about the end of a single page:
  // no footer, rather than an empty band under the table.
  const showFooter = hasMore || entries.length > PAGE_SIZE;

  return (
    <LeaderboardBoard
      entries={entries}
      footer={
        showFooter && (
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
                You've reached the end ·{' '}
                {playerCountFormatter.format(totalCount)} players
              </p>
            )}
          </div>
        )
      }
    />
  );
}
