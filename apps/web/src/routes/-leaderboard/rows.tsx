import { Link } from '@tanstack/react-router';
import { InlineLoader } from '@/components/InlineLoader';

import type { LeaderboardEntry } from './types';
import { podiumClasses } from '@/lib/podium';

function RankMarker({ rank, isViewer }: { rank: number; isViewer?: boolean }) {
  const podiumClass = podiumClasses(rank);

  if (podiumClass) {
    return (
      <span
        className={`gpp-mono inline-flex h-6 min-w-6 items-center justify-center rounded-sm border px-1.5 text-xs ${podiumClass}`}
      >
        {rank}
      </span>
    );
  }

  return (
    <span
      className={`gpp-mono text-sm ${isViewer ? 'text-accent' : 'text-text-muted'}`}
    >
      {rank}
    </span>
  );
}

export function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <tr
      className={`border-b border-border transition-colors last:border-0 ${
        entry.isViewer ? 'bg-surface-elevated' : 'hover:bg-surface-elevated'
      }`}
      data-testid="leaderboard-entry"
    >
      <td
        className={`px-4 py-3 ${entry.isViewer ? 'gpp-stripe pl-5' : ''}`}
        data-testid="position"
      >
        <RankMarker rank={entry.rank} isViewer={entry.isViewer} />
      </td>
      <td className="px-4 py-3" data-testid="username">
        <Link
          to="/p/$username"
          params={{ username: entry.username }}
          search={{ from: undefined, fromLabel: undefined }}
          className="flex items-center gap-2 font-medium text-text"
        >
          {/* Present on league and friends boards, absent on the global one:
              the public queries strip it (see `toPublicEntry`). This single
              expression is what renders that rule, so the fallback is the
              feature, not defensive coding. */}
          <span className="font-medium text-text">
            {entry.displayName ?? entry.username}
          </span>
          {entry.isViewer && (
            <span className="gpp-label rounded-sm bg-accent px-1.5 py-0.5 font-semibold text-text-on-accent">
              YOU
            </span>
          )}
        </Link>
      </td>
      <td className="px-4 py-3 text-right" data-testid="points">
        <span className="gpp-mono font-medium text-text">{entry.points}</span>
      </td>
    </tr>
  );
}

export function LeaderboardContentLoader() {
  return (
    <div className="py-15.25">
      <InlineLoader />
    </div>
  );
}

export function SmallLeaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className="p-4">
      {entries.map((entry) => (
        <Link
          key={entry.userId}
          to="/p/$username"
          params={{ username: entry.username }}
          search={{ from: undefined, fromLabel: undefined }}
          // Opacity is never used to signal hover; a surface step is.
          className={`flex cursor-pointer items-center justify-between border-b border-border py-2 transition-colors last:border-0 hover:bg-surface-elevated ${
            entry.isViewer
              ? 'gpp-stripe rounded-sm bg-surface-elevated px-2 pl-3'
              : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`gpp-mono flex h-7 w-7 items-center justify-center rounded-sm text-sm ${
                entry.isViewer
                  ? 'bg-accent text-text-on-accent'
                  : 'bg-surface-elevated text-text-muted'
              }`}
            >
              {entry.rank}
            </span>
            <span className="flex items-center gap-2 font-medium text-text">
              <span className="font-medium text-text">
                {entry.displayName ?? entry.username}
              </span>
              {entry.isViewer && (
                <span className="gpp-label rounded-sm bg-accent px-1.5 py-0.5 font-semibold text-text-on-accent">
                  YOU
                </span>
              )}
            </span>
          </div>
          <div className="text-right">
            <div className="gpp-mono font-medium text-text">
              {entry.points} pts
            </div>
            {entry.raceCount !== undefined && (
              <div className="text-xs text-text-muted">
                {entry.raceCount} race{entry.raceCount !== 1 ? 's' : ''}
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
