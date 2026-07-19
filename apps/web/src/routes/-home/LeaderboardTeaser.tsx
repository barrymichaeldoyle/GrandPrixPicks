import { Link } from '@tanstack/react-router';
import { Crown } from 'lucide-react';

import { sizedAvatarUrl } from '@/lib/avatar';

type TopPlayer = {
  rank: number;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  points: number;
  raceCount: number;
};

const PODIUM_RANK_CLASSES: Record<1 | 2 | 3, string> = {
  1: 'home-podium-rank-1 bg-gradient-to-br from-amber-300 to-amber-500 text-amber-950',
  2: 'home-podium-rank-2 bg-gradient-to-br from-slate-200 to-slate-400 text-slate-900',
  3: 'home-podium-rank-3 bg-gradient-to-br from-orange-300 to-orange-600 text-orange-950',
};

export function LeaderboardTeaser({
  players,
}: {
  players: ReadonlyArray<TopPlayer>;
}) {
  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold tracking-widest text-text-muted uppercase">
          <Crown
            className="h-3.5 w-3.5 text-accent"
            aria-hidden="true"
            strokeWidth={2.25}
          />
          Top Players
        </p>
        <Link
          to="/leaderboard"
          className="text-xs font-medium text-accent hover:text-accent-hover"
        >
          Full leaderboard →
        </Link>
      </div>
      <ol className="divide-y divide-border/60">
        {players.map((p) => {
          const name = p.displayName || p.username;
          const initial = (name || '?').slice(0, 1).toUpperCase();
          const podiumRank =
            p.rank === 1 || p.rank === 2 || p.rank === 3
              ? PODIUM_RANK_CLASSES[p.rank as 1 | 2 | 3]
              : null;
          return (
            <li key={p.userId} className="flex items-center gap-3 py-2.5">
              {podiumRank ? (
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${podiumRank}`}
                >
                  {p.rank}
                </span>
              ) : (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center text-xs font-semibold text-text-muted tabular-nums">
                  {p.rank}
                </span>
              )}
              {p.avatarUrl ? (
                <img
                  src={sizedAvatarUrl(p.avatarUrl, 32)}
                  alt=""
                  width={32}
                  height={32}
                  className="h-8 w-8 shrink-0 rounded-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              ) : (
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-xs font-semibold text-text-muted">
                  {initial}
                </span>
              )}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-text">
                  {name}
                </span>
                {p.raceCount > 0 && (
                  <span className="text-[11px] text-text-muted">
                    {p.raceCount} {p.raceCount === 1 ? 'race' : 'races'}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-sm font-bold text-accent tabular-nums">
                {p.points.toLocaleString()}
                <span className="ml-1 text-[10px] font-medium tracking-wider text-text-muted uppercase">
                  pts
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
