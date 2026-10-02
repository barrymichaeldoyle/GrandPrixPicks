import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import { primaryButtonStyles } from '@/components/Button/Button';
import { Flag } from '@/components/Flag';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { sizedAvatarUrl } from '@/lib/avatar';
import { getCountryCodeForRace } from '@/lib/raceCountries';

import { PointsCell } from './TimingTower';

/**
 * One race weekend's global board, as the home loader projects it from
 * `home.getHomePageData`.
 *
 * A weekend rather than the season, because the season board told a visitor
 * arriving at round 13 that the leader was 678 points ahead over 12 races —
 * the size of the gap, not the terms of entry. There is no `displayName` here
 * on purpose: public boards are named by the handle the player chose for this
 * site (see `toPublicEntry` in the backend).
 */
export type WeekendBoard = {
  raceName: string;
  raceSlug: string;
  round: number;
  /** Everyone who scored, not just the five rendered. */
  playerCount: number;
  players: readonly {
    rank: number;
    userId: string;
    username: string;
    avatarUrl?: string;
    points: number;
  }[];
};

function RankCell({
  rank,
  leader = false,
}: {
  rank: number;
  leader?: boolean;
}) {
  return (
    <span
      className={`gpp-mono inline-flex h-7 w-9 shrink-0 items-center justify-center rounded-sm border text-xs font-semibold ${
        leader
          ? 'border-accent bg-accent text-text-on-accent'
          : 'border-border text-text-muted'
      }`}
    >
      {rank}
    </span>
  );
}

function PlayerAvatar({ name, url }: { name: string; url?: string }) {
  if (url) {
    return (
      <img
        src={sizedAvatarUrl(url, 28)}
        alt=""
        width={28}
        height={28}
        className="h-7 w-7 shrink-0 rounded-full object-cover"
        loading="lazy"
        decoding="async"
      />
    );
  }

  return (
    <span
      aria-hidden="true"
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-xs font-semibold text-text-muted"
    >
      {(name || '?').slice(0, 1).toUpperCase()}
    </span>
  );
}

function BoardHeader({
  title,
  detail,
  countryCode,
}: {
  title: string;
  detail: string;
  countryCode?: string | null;
}) {
  return (
    <div className="flex min-h-16 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
      <h3 className="flex items-center gap-2 font-semibold text-text">
        {countryCode ? <Flag code={countryCode} size="sm" /> : null}
        {title}
      </h3>
      <p className="gpp-label text-text-muted">{detail}</p>
    </div>
  );
}

/**
 * No rank delta: the race is scored once, so there is no previous position
 * within it to have moved from.
 */
function GlobalBoard({ board }: { board: WeekendBoard | null }) {
  // Derived from the slug rather than carried on the board: the projection in
  // `home.getHomePageData` has no country on it, and every other flag on the
  // page reads the same map.
  const countryCode = board
    ? getCountryCodeForRace({ slug: board.raceSlug })
    : null;

  return (
    <article className="flex min-h-full flex-col border border-border bg-surface">
      <BoardHeader
        title={board ? board.raceName : 'Global leaderboard'}
        countryCode={countryCode}
        detail={
          board
            ? `${board.playerCount} ${board.playerCount === 1 ? 'player' : 'players'}`
            : 'Global'
        }
      />
      {board ? (
        <ol aria-label={`Global leaderboard for the ${board.raceName}`}>
          {board.players.map((player) => (
            <li
              key={player.userId}
              className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
            >
              <RankCell rank={player.rank} leader={player.rank === 1} />
              <PlayerAvatar name={player.username} url={player.avatarUrl} />
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">
                {player.username}
              </span>
              <PointsCell points={player.points} />
            </li>
          ))}
        </ol>
      ) : (
        <p className="gpp-reading-copy flex min-h-64 items-center justify-center px-6 text-center text-text-muted">
          Weekend standings appear once the first session is scored.
        </p>
      )}
      <div className="mt-auto flex min-h-16 items-center justify-end border-t border-border px-4 py-3">
        <Link
          to="/leaderboard"
          className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:text-accent-hover"
          onClick={() =>
            captureAnalyticsEvent('landing_global_leaderboard_clicked', {
              source: 'landing_competition',
            })
          }
        >
          Full leaderboard
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>
    </article>
  );
}

export function CompetitionSection({
  board,
  picksAnchorId,
}: {
  board: WeekendBoard | null;
  /**
   * The picker further up the page. Null between seasons, when there is no
   * open session to send anyone back to.
   */
  picksAnchorId: string | null;
}) {
  return (
    <section
      aria-labelledby="landing-competition-heading"
      className="border-t border-border px-4 py-14 sm:py-20"
    >
      <div className="mx-auto grid w-full max-w-5xl gap-8 md:grid-cols-2 md:gap-12">
        <div>
          {/*
           * Two facts, each said once: the weekend resets, and one save reaches
           * both boards. The heading is the one that answers "have I already
           * missed this season", which is the question the season table used to
           * answer with a 678-point leader.
           *
           * "Scored from zero" and not "points reset": the season total does
           * not reset, it accumulates. What starts at zero is the weekend board.
           *
           * The board stands alone. It shared the row with an invented league
           * ("Dave is P1 again") joined to it by a branch diagram; its "Start a
           * league" button had one click in 90 days, and growth is individual
           * players, not league invites. The sentence below still says leagues
           * exist.
           */}
          <h2
            id="landing-competition-heading"
            className="text-2xl leading-tight font-light tracking-display text-text sm:text-3xl"
          >
            Every weekend is scored from zero.
          </h2>
          <p className="gpp-reading-copy-lg mt-3 text-text-muted">
            One save counts on the global board and in every league you join.
          </p>
          {/*
           * The action this section argues for. Everything above it describes
           * what a saved pick does, and until now the only things a reader could
           * click were a link off the page and an invitation to create a league,
           * which is a heavier commitment than the one being sold. The wording
           * matches the hero exactly so the page asks for one thing by one name.
           */}
          {picksAnchorId ? (
            <div className="mt-10 flex flex-wrap items-center gap-x-4 gap-y-3">
              <a
                href={`#${picksAnchorId}`}
                className={primaryButtonStyles('md')}
                onClick={() =>
                  captureAnalyticsEvent('landing_hero_cta_clicked', {
                    placement: 'competition',
                  })
                }
              >
                Make your picks
                <ArrowRight size={20} aria-hidden="true" />
              </a>
              <p className="text-sm text-text-muted">
                Free to play. No account needed until you save.
              </p>
            </div>
          ) : null}
        </div>

        <GlobalBoard board={board} />
      </div>
    </section>
  );
}
