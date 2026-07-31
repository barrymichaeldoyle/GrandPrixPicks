import { Link } from '@tanstack/react-router';

import { Flag } from '@/components/Flag';
import { sizedAvatarUrl } from '@/lib/avatar';
import { getCountryCodeForRace } from '@/lib/raceCountries';

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
  caption,
  season,
}: {
  players: readonly TopPlayer[];
  caption: CaptionProps | null;
  season: number;
}) {
  const rows = players.slice(0, 5);
  if (rows.length === 0) {
    return null;
  }

  return (
    <section
      aria-labelledby="global-leaderboard-heading"
      className="border-t border-border px-4 py-10 sm:py-12"
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

        <div className="mt-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          {caption ? <StripCaption {...caption} /> : <span />}
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

type CaptionProps = {
  pickCount: number;
  raceShortName: string;
  raceSlug: string;
  /** "Saturday, 14:00 CEST", already in the circuit's timezone. */
  lockTime: string | null;
};

/**
 * "12,431 picks in for Spa. Locks Saturday, 14:00 CEST."
 *
 * The pick count is only shown once it is a number worth quoting. A landing
 * page that says "3 picks in" is doing the opposite of social proof.
 */
const MIN_QUOTABLE_PICK_COUNT = 25;

function StripCaption({
  pickCount,
  raceShortName,
  raceSlug,
  lockTime,
}: CaptionProps) {
  const countryCode = getCountryCodeForRace({ slug: raceSlug });
  const showCount = pickCount >= MIN_QUOTABLE_PICK_COUNT;

  if (!showCount && !lockTime) {
    return <span />;
  }

  return (
    <p className="gpp-reading-meta flex items-center gap-2 text-text-muted">
      {countryCode ? <Flag code={countryCode} size="xs" /> : null}
      <span>
        {showCount ? (
          <>
            <span className="gpp-mono text-text">
              {pickCount.toLocaleString()}
            </span>{' '}
            picks in for {raceShortName}.{' '}
          </>
        ) : null}
        {lockTime ? `Locks ${lockTime}.` : null}
      </span>
    </p>
  );
}
