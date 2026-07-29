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

/**
 * Podium colours are flat data colours, in the manner of team colours: the
 * metal ramp and inset bevel these used to carry were box-shadows, which this
 * system does not have. Rank still reads instantly; it just stops pretending
 * to be a physical medal.
 */
const PODIUM_RANK_CLASSES: Record<1 | 2 | 3, string> = {
  1: 'bg-podium-gold text-page',
  2: 'bg-podium-silver text-page',
  3: 'bg-podium-bronze text-page',
};

export function LeaderboardTeaser({
  players,
}: {
  players: readonly TopPlayer[];
}) {
  const previewPlayers = players.slice(0, 5);

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="gpp-label flex items-center gap-1.5">
          <Crown
            className="h-3.5 w-3.5 text-accent"
            aria-hidden="true"
            strokeWidth={2.25}
          />
          Top Players
        </h2>
        <Link
          to="/leaderboard"
          className="text-xs font-medium text-accent hover:text-accent-hover"
        >
          Full leaderboard →
        </Link>
      </div>
      <ol className="divide-y divide-border/60">
        {previewPlayers.map((p) => {
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
                  className={`gpp-mono flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${podiumRank}`}
                >
                  {p.rank}
                </span>
              ) : (
                <span className="gpp-mono flex h-7 w-7 shrink-0 items-center justify-center text-xs font-semibold text-text-muted">
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
                  <span className="text-xs text-text-muted">
                    {p.raceCount} {p.raceCount === 1 ? 'race' : 'races'}
                  </span>
                )}
              </span>
              <span className="gpp-mono shrink-0 text-sm font-semibold text-accent">
                {p.points.toLocaleString()}
                <span className="ml-1 text-xs font-medium tracking-label text-text-muted uppercase">
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
