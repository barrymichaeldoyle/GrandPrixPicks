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

// Gold / silver / bronze treatment keyed by place. `accent` is the raw metal
// hex used for glows + pedestal gradients (kept inline because they're dynamic
// alpha-composited values Tailwind can't express).
const PODIUM_METAL = {
  1: {
    icon: Trophy,
    label: '1st',
    accent: '#eab308',
    iconColor: 'text-warning',
    badgeBg: 'bg-warning/20',
    badgeRing: 'ring-1 ring-warning/50',
    textColor: 'text-warning',
  },
  2: {
    icon: Medal,
    label: '2nd',
    accent: '#C0C0C0',
    iconColor: 'text-[#C0C0C0]',
    badgeBg: 'bg-[#C0C0C0]/20',
    badgeRing: 'ring-1 ring-[#C0C0C0]/50',
    textColor: 'text-[#C0C0C0]',
  },
  3: {
    icon: Medal,
    label: '3rd',
    accent: '#cd7f32',
    iconColor: 'text-[#cd7f32]',
    badgeBg: 'bg-[#cd7f32]/20',
    badgeRing: 'ring-1 ring-[#cd7f32]/50',
    textColor: 'text-[#cd7f32]',
  },
} as const;

// Pedestal step height by awarded rank (sm+ only). Driven by rank — not column
// position — so tied players share the same height: a three-way tie gives a
// flat-topped podium, and a 1·2·2 finish gives one tall step plus two equal
// shorter ones.
const PEDESTAL_HEIGHT = {
  1: 'sm:h-20',
  2: 'sm:h-12',
  3: 'sm:h-7',
} as const;

export function PodiumCard({
  entry,
  place,
  className = '',
}: {
  entry: LeaderboardEntry;
  place: 1 | 2 | 3;
  className?: string;
}) {
  // Medal + label reflect the awarded rank (so genuine ties both read "1st");
  // the pedestal beneath reflects the physical column so the podium silhouette
  // is stable regardless of ties.
  const podiumRank: 1 | 2 | 3 =
    entry.rank === 1 || entry.rank === 2 || entry.rank === 3
      ? entry.rank
      : place;
  const isFirst = podiumRank === 1;
  const medal = PODIUM_METAL[podiumRank];
  const Icon = medal.icon;

  const cardStyle = entry.isViewer
    ? 'border-accent ring-2 ring-accent'
    : isFirst
      ? 'border-warning/35'
      : 'border-border';

  return (
    <Link
      to="/p/$username"
      params={{ username: entry.username }}
      search={{ from: undefined, fromLabel: undefined }}
      className={`${className} group block cursor-pointer`}
    >
      {/* Card — floats above the pedestal */}
      <div
        className={`relative overflow-hidden rounded-xl border bg-surface p-3 transition-shadow group-hover:shadow-lg sm:p-4 ${cardStyle}`}
      >
        {isFirst && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-warning/10 to-transparent"
          />
        )}

        {/* Desktop: YOU badge top-right */}
        {entry.isViewer && (
          <span className="absolute top-2 right-2 z-10 hidden rounded-full bg-accent px-1.5 py-0.5 text-[10px] font-bold text-white sm:inline">
            YOU
          </span>
        )}

        {/* Mobile: horizontal layout */}
        <div className="relative flex items-center gap-3 sm:hidden">
          <div className="flex shrink-0 items-center gap-2">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full ${medal.badgeBg} ${medal.badgeRing}`}
              style={{ filter: `drop-shadow(0 0 10px ${medal.accent}cc)` }}
            >
              <Icon className={`h-6 w-6 ${medal.iconColor}`} />
            </div>
            <div
              className={`text-base font-bold ${medal.textColor}`}
              style={{ textShadow: `0 0 12px ${medal.accent}99` }}
            >
              {medal.label}
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
        <div className="relative hidden sm:block">
          <div
            className={`mx-auto mb-2 flex items-center justify-center rounded-full ${medal.badgeBg} ${medal.badgeRing} ${
              isFirst ? 'h-14 w-14' : 'h-12 w-12'
            }`}
            style={{ filter: `drop-shadow(0 0 10px ${medal.accent}cc)` }}
          >
            <Icon
              className={`${medal.iconColor} ${isFirst ? 'h-7 w-7' : 'h-6 w-6'}`}
            />
          </div>
          <div
            className={`text-center font-bold ${medal.textColor} ${
              isFirst ? 'text-2xl' : 'text-xl'
            }`}
            style={{ textShadow: `0 0 12px ${medal.accent}99` }}
          >
            {medal.label}
          </div>
          <div className="mt-1 truncate text-center text-sm font-semibold text-accent">
            {entry.displayName ?? entry.username}
          </div>
          <div className="text-center text-sm font-bold text-text">
            {entry.points} points
          </div>
        </div>
      </div>

      {/* Pedestal step (sm+ only). Both colour and height follow the awarded
          rank, so tied players stand on identical pedestals (same metal, same
          height) — the grid aligns these to the bottom to form the podium. */}
      <div
        aria-hidden="true"
        className={`mt-1.5 hidden w-full overflow-hidden rounded-t-sm sm:block ${PEDESTAL_HEIGHT[podiumRank]}`}
        style={{
          backgroundImage: `linear-gradient(180deg, ${medal.accent}40 0%, ${medal.accent}1a 45%, ${medal.accent}0a 100%)`,
        }}
      >
        <div
          className="h-px w-full"
          style={{ backgroundColor: `${medal.accent}cc` }}
        />
      </div>
    </Link>
  );
}
