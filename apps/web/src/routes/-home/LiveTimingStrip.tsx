import { Link } from '@tanstack/react-router';

import { sizedAvatarUrl } from '@/lib/avatar';

import { PointsCell, PositionBox, RankDelta } from './TimingTower';

export type TopPlayer = {
  rank: number;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  points: number;
  rankDelta: number | null;
};

/**
 * The top of the global table as a timing tower. No section heading: five rows
 * of real names and real points say what the section is for, and a headline
 * above them would only repeat it.
 */
export function LiveTimingStrip({
  players,
  season,
}: {
  players: readonly TopPlayer[];
  season: number;
}) {
  const rows = players.slice(0, 5);
  if (rows.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="global-leaderboard-heading"
      // Social proof should read as a quick timing strip, not another full
      // narrative section competing with the picker and leagues pitch.
      className="border-t border-border px-4 py-8 sm:py-10"
    >
      <div className="mx-auto w-full max-w-5xl">
        <h2
          id="global-leaderboard-heading"
          className="gpp-label mb-3 text-text-muted"
        >
          Global leaderboard · {season}
        </h2>
        <ol className="border-t border-border">
          {rows.map((player) => {
            const name = player.displayName || player.username;
            return (
              <li
                key={player.userId}
                className="flex items-center gap-3 border-b border-border py-2.5 sm:gap-4"
              >
                <PositionBox
                  position={player.rank}
                  leader={player.rank === 1}
                />

                {player.avatarUrl ? (
                  <img
                    src={sizedAvatarUrl(player.avatarUrl, 28)}
                    alt=""
                    width={28}
                    height={28}
                    className="h-7 w-7 shrink-0 rounded-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-semibold text-text-muted">
                    {(name || '?').slice(0, 1).toUpperCase()}
                  </span>
                )}

                <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">
                  {name}
                </span>

                <PointsCell points={player.points} />

                <span className="flex w-10 shrink-0 justify-end">
                  <RankDelta delta={player.rankDelta} />
                </span>
              </li>
            );
          })}
        </ol>

        <div className="mt-3 flex justify-end">
          <Link
            to="/leaderboard"
            className="gpp-reading-meta shrink-0 font-medium text-accent hover:text-accent-hover"
          >
            Full leaderboard →
          </Link>
        </div>
      </div>
    </section>
  );
}
