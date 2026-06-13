import { Link } from '@tanstack/react-router';
import { Medal, Trophy } from 'lucide-react';

import { InlineLoader } from '@/components/InlineLoader';

import type {
  CombinedLeaderboardEntry,
  H2HLeaderboardEntry,
  LeaderboardEntry,
} from './types';

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
        <span
          className={`font-medium ${entry.isViewer ? 'text-accent' : 'text-text-muted'}`}
        >
          {entry.rank}
        </span>
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
        <span
          className={`font-medium ${entry.isViewer ? 'text-accent' : 'text-text-muted'}`}
        >
          {entry.rank}
        </span>
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
          {entry.correctPicks}/{entry.totalPicks}
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
        <span
          className={`font-medium ${entry.isViewer ? 'text-accent' : 'text-text-muted'}`}
        >
          {entry.rank}
        </span>
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

export function PodiumCard({
  entry,
  place,
  className = '',
}: {
  entry: LeaderboardEntry;
  place: 1 | 2 | 3;
  className?: string;
}) {
  const podiumRank: 1 | 2 | 3 =
    entry.rank === 1 || entry.rank === 2 || entry.rank === 3
      ? entry.rank
      : place;
  const marginTop =
    podiumRank === 1 ? '' : podiumRank === 2 ? 'sm:mt-8' : 'sm:mt-12';
  const isFirst = podiumRank === 1;

  const borderStyle = entry.isViewer
    ? 'border-accent ring-2 ring-accent bg-surface'
    : isFirst
      ? 'border-warning/30 bg-surface'
      : 'border-border bg-surface';

  const Icon = isFirst ? Trophy : Medal;
  const glowColor = isFirst
    ? '#eab308'
    : podiumRank === 2
      ? '#C0C0C0'
      : '#cd7f32';
  const iconColor = isFirst
    ? 'text-warning'
    : podiumRank === 2
      ? 'text-[#C0C0C0]'
      : 'text-[#cd7f32]';
  const bgColor = isFirst
    ? 'bg-warning/20'
    : podiumRank === 2
      ? 'bg-[#C0C0C0]/20'
      : 'bg-[#cd7f32]/20';
  const badgeRing = isFirst
    ? 'ring-1 ring-warning/50'
    : podiumRank === 2
      ? 'ring-1 ring-[#C0C0C0]/50'
      : 'ring-1 ring-[#cd7f32]/50';
  const textColor = isFirst
    ? 'text-warning'
    : podiumRank === 2
      ? 'text-[#C0C0C0]'
      : 'text-[#cd7f32]';
  const placeLabels = { 1: '1st', 2: '2nd', 3: '3rd' };

  return (
    <Link
      to="/p/$username"
      params={{ username: entry.username }}
      search={{ from: undefined, fromLabel: undefined }}
      className={`${className} ${marginTop} relative block cursor-pointer rounded-xl border p-3 transition-[box-shadow,transform] hover:-translate-y-0.5 hover:shadow-lg sm:p-4 ${borderStyle}`}
    >
      {/* Desktop: YOU badge top-right */}
      {entry.isViewer && (
        <span className="absolute top-2 right-2 hidden rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white sm:inline">
          YOU
        </span>
      )}

      {/* Mobile: horizontal layout */}
      <div className="flex items-center gap-3 sm:hidden">
        <div className="flex shrink-0 items-center gap-2">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-full ${bgColor} ${badgeRing}`}
            style={{ filter: `drop-shadow(0 0 10px ${glowColor}cc)` }}
          >
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
          <div
            className={`text-base font-bold ${textColor}`}
            style={{ textShadow: `0 0 12px ${glowColor}99` }}
          >
            {placeLabels[podiumRank]}
          </div>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1 text-right">
          <div className="flex items-center justify-end gap-1.5">
            {entry.isViewer && (
              <span className="shrink-0 rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
                YOU
              </span>
            )}
            <span className="truncate text-sm font-semibold text-accent">
              {entry.displayName ?? entry.username}
            </span>
          </div>
          <div className="text-sm font-bold text-text">
            {entry.points} points
          </div>
        </div>
      </div>

      {/* Desktop: vertical centered layout */}
      <div className="hidden sm:block">
        <div
          className={`mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full ${bgColor} ${badgeRing}`}
          style={{ filter: `drop-shadow(0 0 10px ${glowColor}cc)` }}
        >
          <Icon className={`h-6 w-6 ${iconColor}`} />
        </div>
        <div
          className={`text-center text-xl font-bold ${textColor}`}
          style={{ textShadow: `0 0 12px ${glowColor}99` }}
        >
          {placeLabels[podiumRank]}
        </div>
        <div className="mt-1 truncate text-center text-sm font-semibold text-accent">
          {entry.displayName ?? entry.username}
        </div>
        <div className="text-center text-sm font-bold text-text">
          {entry.points} points
        </div>
      </div>
    </Link>
  );
}
