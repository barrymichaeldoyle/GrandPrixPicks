import { Link } from '@tanstack/react-router';
import { InlineLoader } from '@/components/InlineLoader';

import { formatAccuracy } from './constants';
import type {
  CombinedLeaderboardEntry,
  H2HLeaderboardEntry,
  LeaderboardEntry,
} from './types';
import { podiumClasses } from '@/lib/podium';

function RankMarker({ rank, isViewer }: { rank: number; isViewer?: boolean }) {
  const podiumClass = podiumClasses(rank);

  if (podiumClass) {
    return (
      <span
        className={`inline-flex h-7 min-w-7 items-center justify-center rounded-full border px-1.5 text-xs font-bold tabular-nums ${podiumClass}`}
      >
        {rank}
      </span>
    );
  }

  return (
    <span
      className={
        isViewer ? 'font-medium text-accent' : 'font-medium text-text-muted'
      }
    >
      {rank}
    </span>
  );
}

export function CombinedTableRow({
  entry,
}: {
  entry: CombinedLeaderboardEntry;
}) {
  return (
    <tr
      className={`border-b border-border transition-colors last:border-0 ${
        entry.isViewer
          ? 'bg-accent-muted hover:bg-accent-muted'
          : 'hover:bg-surface-muted'
      }`}
    >
      <td className="px-4 py-3">
        <RankMarker rank={entry.rank} isViewer={entry.isViewer} />
      </td>
      <td className="px-4 py-3">
        <Link
          to="/p/$username"
          params={{ username: entry.username }}
          search={{ from: undefined, fromLabel: undefined }}
          className="flex items-center gap-2 font-medium text-text"
        >
          <span className="font-semibold text-accent">
            {entry.displayName ?? entry.username}
          </span>
          {entry.isViewer && (
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
              YOU
            </span>
          )}
        </Link>
      </td>
      <td className="hidden px-4 py-3 text-right sm:table-cell">
        <span className="text-sm text-text-muted">{entry.top5Points}</span>
      </td>
      <td className="hidden px-4 py-3 text-right sm:table-cell">
        <span className="text-sm text-text-muted">{entry.h2hPoints}</span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-bold text-text">{entry.points}</span>
      </td>
    </tr>
  );
}

export function H2HTableRow({ entry }: { entry: H2HLeaderboardEntry }) {
  return (
    <tr
      className={`border-b border-border transition-colors last:border-0 ${
        entry.isViewer
          ? 'bg-accent-muted hover:bg-accent-muted'
          : 'hover:bg-surface-muted'
      }`}
    >
      <td className="px-4 py-3">
        <RankMarker rank={entry.rank} isViewer={entry.isViewer} />
      </td>
      <td className="px-4 py-3">
        <Link
          to="/p/$username"
          params={{ username: entry.username }}
          search={{ from: undefined, fromLabel: undefined }}
          className="flex items-center gap-2 font-medium text-text"
        >
          <span className="font-semibold text-accent">
            {entry.displayName ?? entry.username}
          </span>
          {entry.isViewer && (
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
              YOU
            </span>
          )}
        </Link>
      </td>
      <td className="hidden px-4 py-3 text-right sm:table-cell">
        <span className="text-sm text-text-muted">
          {formatAccuracy(entry.correctPicks, entry.totalPicks)}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <span className="font-bold text-text">{entry.points}</span>
      </td>
    </tr>
  );
}

export function LeaderboardRow({ entry }: { entry: LeaderboardEntry }) {
  return (
    <tr
      className={`border-b border-border transition-colors last:border-0 ${
        entry.isViewer
          ? 'bg-accent-muted hover:bg-accent-muted'
          : 'hover:bg-surface-muted'
      }`}
      data-testid="leaderboard-entry"
    >
      <td className="px-4 py-3" data-testid="position">
        <RankMarker rank={entry.rank} isViewer={entry.isViewer} />
      </td>
      <td className="px-4 py-3" data-testid="username">
        <Link
          to="/p/$username"
          params={{ username: entry.username }}
          search={{ from: undefined, fromLabel: undefined }}
          className="flex items-center gap-2 font-medium text-text"
        >
          <span className="font-semibold text-accent">
            {entry.displayName ?? entry.username}
          </span>
          {entry.isViewer && (
            <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
              YOU
            </span>
          )}
        </Link>
      </td>
      <td className="px-4 py-3 text-right" data-testid="points">
        <span className="font-bold text-text">{entry.points}</span>
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
          className={`flex cursor-pointer items-center justify-between border-b border-border py-2 transition-colors last:border-0 hover:opacity-90 ${
            entry.isViewer ? 'rounded-lg bg-accent-muted px-2' : ''
          }`}
        >
          <div className="flex items-center gap-3">
            <span
              className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                entry.isViewer
                  ? 'bg-accent text-white'
                  : 'bg-surface-muted text-text-muted'
              }`}
            >
              {entry.rank}
            </span>
            <span className="flex items-center gap-2 font-medium text-text">
              <span className="font-semibold text-accent">
                {entry.displayName ?? entry.username}
              </span>
              {entry.isViewer && (
                <span className="rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                  YOU
                </span>
              )}
            </span>
          </div>
          <div className="text-right">
            <div className="font-bold text-accent">{entry.points} pts</div>
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
