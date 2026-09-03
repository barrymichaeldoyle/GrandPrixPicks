import { api } from '@convex-generated/api';
import type { FunctionReturnType } from 'convex/server';
import { ArrowRight, Flag } from 'lucide-react';
import { Link } from '@tanstack/react-router';
import { resolveDisplayName } from '@grandprixpicks/shared/displayName';

import { Avatar } from '@/components/Avatar';
import { RaceFlag } from '@/components/RaceFlag';
import { RankDelta } from '@/components/RankDelta';
import { weekendCardShell } from '@/components/WeekendCardSkeleton';
import { getCountryCodeForRace } from '@/lib/raceCountries';

export type RaceRecap = NonNullable<
  FunctionReturnType<typeof api.home.getRaceRecap>
>;

/** The card's routes out, styled as the rail cards' bottom links are. */
const RECAP_LINK_CLASS =
  'gpp-touch-target inline-flex items-center gap-1 text-xs font-semibold ' +
  'text-accent hover:text-accent-hover pointer-coarse:min-h-11';

/**
 * The Grand Prix that just ran, as the dashboard's lead card.
 *
 * For the eight hours after a race starts this sits above the picks card, and
 * the picker for the next round follows it. The order is the whole point: the
 * weekend query moves on the moment a race is scored, so a player who had just
 * watched one used to land on a picker for the following event with their
 * result tucked into a side rail. See `home.loadRaceRecap` for the window.
 *
 * Deliberately not a second leaderboard. It answers three things — what you
 * scored, where that put you, and how the people you follow did — and every
 * route out of it leads somewhere that shows more.
 */
export function RaceRecapCard({
  recap,
  leading = true,
}: {
  recap: RaceRecap;
  /** Whether this is the first card under the header; see `weekendCardShell`. */
  leading?: boolean;
}) {
  const countryCode = getCountryCodeForRace({ slug: recap.race.slug });
  const viewer = recap.viewer;

  return (
    <section
      className={weekendCardShell(leading)}
      aria-labelledby="race-recap-title"
      data-testid="dashboard-race-recap"
    >
      <div className="p-4 sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          {countryCode ? (
            <RaceFlag
              countryCode={countryCode}
              size="lg"
              className="overflow-hidden rounded-sm border border-border"
            />
          ) : (
            <Flag className="h-5 w-5 text-accent" aria-hidden />
          )}
          <div className="min-w-0">
            <p className="gpp-label text-text-muted">
              Round {recap.race.round} · Result
            </p>
            {/* `h2`, not `h1`. The picks card below still holds the page's
                `h1`: this card is a report on the round that has finished,
                and the dashboard's subject is the weekend being played. */}
            <h2
              id="race-recap-title"
              className="mt-1 text-xl font-semibold tracking-tight text-text sm:text-2xl"
            >
              {recap.race.name}
            </h2>
          </div>
        </div>

        {recap.status === 'pending' ? (
          <p className="mt-4 text-sm text-text-muted">Results pending.</p>
        ) : viewer ? (
          <>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
              <p className="font-title text-3xl font-semibold text-accent">
                {viewer.points}
                <span className="ml-1 text-sm font-medium text-text-muted">
                  pts
                </span>
              </p>
              <p className="gpp-mono text-sm font-medium text-text">
                P{viewer.rank}
                <span className="text-text-muted"> of {viewer.fieldSize}</span>
              </p>
            </div>
            {viewer.seasonRank == null ? null : (
              <p className="mt-2 flex items-center gap-2 text-xs text-text-muted">
                <span>Season P{viewer.seasonRank}</span>
                <RankDelta delta={viewer.seasonRankDelta} />
              </p>
            )}
          </>
        ) : (
          <p className="mt-4 text-sm text-text-muted">
            You had no picks for this race.
          </p>
        )}

        {/* One row is the viewer alone, which the block above already covers.
            The table starts earning its space at two. */}
        {recap.friends.length > 1 ? (
          <div className="mt-5 border-t border-border pt-4">
            <h3 className="gpp-label text-text-muted">Players you follow</h3>
            <ul className="mt-2 divide-y divide-border">
              {recap.friends.map((player) => (
                <li
                  key={player.userId}
                  className="flex items-center gap-3 py-2"
                >
                  <span className="gpp-mono w-9 shrink-0 text-xs text-text-muted">
                    P{player.rank}
                  </span>
                  <Avatar
                    size="sm"
                    avatarUrl={player.avatarUrl}
                    username={player.username}
                  />
                  <PlayerName player={player} />
                  <span className="gpp-mono shrink-0 text-sm font-semibold text-text">
                    {player.points}
                    <span className="gpp-label ml-1 font-medium">pts</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Link
            to="/races/$raceSlug"
            params={{ raceSlug: recap.race.slug }}
            search={{ from: 'home' }}
            className={RECAP_LINK_CLASS}
          >
            {/* "Full breakdown" is a promise of scores, and there are none to
                break down until the publish lands. */}
            {recap.status === 'pending' ? 'View race' : 'Full breakdown'}
            <ArrowRight className="h-3 w-3" aria-hidden />
          </Link>
          {recap.status === 'pending' ? null : (
            <Link
              to="/leaderboard"
              search={{
                time: 'weekend',
                raceId: recap.race.id,
                scope: recap.friendCount > 0 ? 'following' : 'global',
              }}
              className={RECAP_LINK_CLASS}
            >
              Weekend leaderboard
              <ArrowRight className="h-3 w-3" aria-hidden />
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * A row's name, as a link to that profile.
 *
 * Not `UserLink`: this one truncates inside a fixed row and marks the viewer's
 * own row, neither of which the feed's version does. The viewer's row is plain
 * text on purpose — the link beside their avatar in the header already goes
 * there, and the point of this row is that it is them.
 */
function PlayerName({ player }: { player: RaceRecap['friends'][number] }) {
  const name = resolveDisplayName(player);

  if (player.isViewer || !player.username) {
    return (
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-text">
        {name}
      </span>
    );
  }

  return (
    <Link
      to="/p/$username"
      params={{ username: player.username }}
      search={{ from: undefined, fromLabel: undefined }}
      className="min-w-0 flex-1 truncate text-sm text-text hover:text-accent"
    >
      {name}
    </Link>
  );
}
