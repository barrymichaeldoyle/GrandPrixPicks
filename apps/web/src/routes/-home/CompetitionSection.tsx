import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import { Button, primaryButtonStyles } from '@/components/Button/Button';
import {
  useClerkRuntimeControl,
  useClerkWarmHandlers,
} from '@/integrations/clerk/runtime-control';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { sizedAvatarUrl } from '@/lib/avatar';

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

/**
 * Invented, and labelled as invented in the board header. A new visitor has no
 * league to show, so the alternative to an example is an empty card that argues
 * for nothing.
 */
const MOCK_LEAGUE = {
  name: 'Sunday Strategists',
  memberCount: 8,
  rows: [
    { position: 1, name: 'Dave is P1 again', points: 96 },
    { position: 2, name: 'Undercut Enjoyer', points: 91 },
    { position: 3, name: 'Box Box Barbara', points: 84 },
    { position: 4, name: 'Two Stopper Truther', points: 79 },
    { position: 5, name: 'Yer Man Off The Telly', points: 74 },
  ],
} as const;

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

/**
 * Shared by both boards so the two columns carry the same weight. The example
 * league used to render names with no avatar beside a global board that had
 * them, which made one column look like the product and the other like a
 * wireframe of it.
 */
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
  example = false,
}: {
  title: string;
  detail: string;
  example?: boolean;
}) {
  return (
    <div className="flex min-h-16 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
      <h3 className="flex items-center gap-2 font-semibold text-text">
        {title}
        {/* The only thing separating a made-up league from a live one. It was
            previously said in an aria-label alone, which meant the visitors
            being asked to believe it could not read it. */}
        {example ? (
          <span className="gpp-label rounded-sm border border-border px-1.5 py-0.5 font-medium text-text-muted">
            Example
          </span>
        ) : null}
      </h3>
      <p className="gpp-label text-text-muted">{detail}</p>
    </div>
  );
}

/**
 * Neither board shows a rank delta.
 *
 * On a weekend board the movement it described does not exist: the race is
 * scored once, so there is no previous position within it to have moved from.
 * Carrying the column on the example league alone would leave the two cards
 * with different shapes side by side, which is the fidelity mismatch the
 * avatars were added to fix.
 */
function GlobalBoard({ board }: { board: WeekendBoard | null }) {
  return (
    <article className="flex min-h-full flex-col border border-border bg-surface">
      <BoardHeader
        title={board ? board.raceName : 'Global leaderboard'}
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

function PrivateLeagueBoard() {
  const clerkRuntime = useClerkRuntimeControl();
  const warmHandlers = useClerkWarmHandlers();

  function startLeague() {
    captureAnalyticsEvent('landing_league_cta_clicked', {
      source: 'landing',
    });
    captureAnalyticsEvent('landing_auth_started', {
      source: 'landing',
      intent: 'create_league',
    });
    clerkRuntime.requestSignIn('/leagues/create');
  }

  return (
    <article className="flex min-h-full flex-col border border-border bg-surface">
      <BoardHeader
        title={MOCK_LEAGUE.name}
        detail={`${MOCK_LEAGUE.memberCount} players`}
        example
      />
      <ol aria-label="Example private league standings">
        {MOCK_LEAGUE.rows.map((row) => (
          <li
            key={row.position}
            className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
          >
            <RankCell rank={row.position} leader={row.position === 1} />
            <PlayerAvatar name={row.name} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">
              {row.name}
            </span>
            <PointsCell points={row.points} />
          </li>
        ))}
      </ol>
      <div className="mt-auto flex min-h-16 items-center justify-between gap-4 border-t border-border px-4 py-3">
        <p className="gpp-reading-meta hidden text-text-muted sm:block">
          Create a league and send one link.
        </p>
        <Button
          variant="secondary"
          size="sm"
          rightIcon={ArrowRight}
          loading={clerkRuntime.signInPending}
          onClick={startLeague}
          {...warmHandlers}
        >
          Start a league
        </Button>
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
      <div className="mx-auto w-full max-w-5xl">
        <div className="max-w-3xl">
          <p className="gpp-label text-text-muted">Leaderboards</p>
          {/*
           * Two facts, each said once: the weekend resets, and one save reaches
           * both boards. The heading is the one that answers "have I already
           * missed this season", which is the question the season table used to
           * answer with a 678-point leader.
           *
           * "Scored from zero" and not "points reset": the season total does
           * not reset, it accumulates. What starts at zero is the weekend board.
           */}
          <h2
            id="landing-competition-heading"
            className="mt-2 text-2xl leading-tight font-light tracking-display text-text sm:text-3xl"
          >
            Every weekend is scored from zero.
          </h2>
          <p className="gpp-reading-copy-lg mt-3 text-text-muted">
            One save counts on the global board and in every league you join.
          </p>
        </div>

        <div className="mt-9">
          {/*
           * Desktop only, all of it. The branch describes one score arriving at
           * two boards side by side, and below `md` the boards stack, so there
           * is no pair to point at: what shipped was a 28px accent stub hanging
           * off the label into the top of the first card, with the second card
           * further down connected to nothing. The line above carries the claim
           * in words, which is what a phone had to rely on anyway.
           */}
          <div className="hidden md:block">
            <div className="mx-auto w-fit border border-accent-hairline bg-surface-elevated px-6 py-3 text-center">
              <p className="gpp-label text-accent">Your saved picks</p>
              <p className="mt-1 text-sm text-text-muted">One score</p>
            </div>

            <div className="mx-auto h-7 w-px bg-accent" aria-hidden="true" />
            {/*
             * The branch drops land on the CENTRES of the two boards below,
             * which are not the quarter points of this container. With
             * `md:grid-cols-2` and `gap-6`, each column is `(100% - 24px) / 2`
             * wide, so its centre sits at `25% - 6px` from the nearest edge. A
             * bare `left-1/4` splayed both drops 6px inward, and the line
             * visibly missed the card it was pointing at. Change the gap below
             * and these insets change with it: the offset is always a quarter
             * of the gap.
             */}
            <div className="relative h-7" aria-hidden="true">
              <div className="absolute top-0 right-[calc(25%-6px)] left-[calc(25%-6px)] h-px bg-accent" />
              <div className="absolute top-0 left-[calc(25%-6px)] h-7 w-px bg-accent" />
              <div className="absolute top-0 right-[calc(25%-6px)] h-7 w-px bg-accent" />
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <GlobalBoard board={board} />
            <PrivateLeagueBoard />
          </div>
        </div>

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
    </section>
  );
}
