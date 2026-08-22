import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import { Button } from '@/components/Button/Button';
import {
  useClerkRuntimeControl,
  useClerkWarmHandlers,
} from '@/integrations/clerk/runtime-control';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { sizedAvatarUrl } from '@/lib/avatar';

import { PointsCell, RankDelta } from './TimingTower';

/**
 * A row of the global table, as the home loader projects it from
 * `home.getHomePageData`.
 */
export type TopPlayer = {
  rank: number;
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
  points: number;
  rankDelta: number | null;
};

const MOCK_LEAGUE = {
  name: 'Sunday Strategists',
  memberCount: 8,
  rows: [
    { position: 1, name: 'Dave is P1 again', points: 486, delta: 0 },
    { position: 2, name: 'Undercut Enjoyer', points: 471, delta: 2 },
    { position: 3, name: 'Box Box Barbara', points: 455, delta: -1 },
    { position: 4, name: 'Two Stopper Truther', points: 443, delta: -1 },
    { position: 5, name: 'Yer Man Off The Telly', points: 428, delta: null },
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

function BoardHeader({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex min-h-16 flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
      <h3 className="font-semibold text-text">{title}</h3>
      <p className="gpp-label text-text-muted">{detail}</p>
    </div>
  );
}

function GlobalBoard({
  players,
  season,
}: {
  players: readonly TopPlayer[];
  season: number;
}) {
  const rows = players.slice(0, 5);

  return (
    <article className="flex min-h-full flex-col border border-border bg-surface">
      <BoardHeader title="Global leaderboard" detail={`${season} season`} />
      {rows.length > 0 ? (
        <ol aria-label={`Global leaderboard for the ${season} season`}>
          {rows.map((player) => {
            const name = player.displayName || player.username;
            return (
              <li
                key={player.userId}
                className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
              >
                <RankCell rank={player.rank} leader={player.rank === 1} />
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
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-elevated text-xs font-semibold text-text-muted">
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
      ) : (
        <p className="gpp-reading-copy flex min-h-64 items-center justify-center px-6 text-center text-text-muted">
          The global table appears once the first results are scored.
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
      />
      <ol aria-label="Example private league standings">
        {MOCK_LEAGUE.rows.map((row) => (
          <li
            key={row.position}
            className="flex items-center gap-3 border-b border-border px-4 py-3 last:border-b-0"
          >
            <RankCell rank={row.position} leader={row.position === 1} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium text-text">
              {row.name}
            </span>
            <PointsCell points={row.points} />
            <span className="flex w-10 shrink-0 justify-end">
              <RankDelta delta={row.delta} />
            </span>
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
  players,
  season,
}: {
  players: readonly TopPlayer[];
  season: number;
}) {
  return (
    <section
      aria-labelledby="landing-competition-heading"
      className="border-t border-border px-4 py-14 sm:py-20"
    >
      <div className="mx-auto w-full max-w-5xl">
        <div className="max-w-3xl">
          <p className="gpp-label text-text-muted">Compete your way</p>
          <h2
            id="landing-competition-heading"
            className="mt-2 text-2xl leading-tight font-light tracking-display text-text sm:text-3xl"
          >
            One set of picks. Every table.
          </h2>
          <p className="gpp-reading-copy-lg mt-3 text-text-muted">
            Your saved predictions count towards the global leaderboard and
            every private league you join. Make the call once, then see where it
            puts you.
          </p>
        </div>

        <div className="mt-9">
          <div className="mx-auto w-fit border border-accent-hairline bg-surface-elevated px-6 py-3 text-center">
            <p className="gpp-label text-accent">Your saved picks</p>
            <p className="mt-1 text-sm text-text-muted">One score</p>
          </div>

          <div className="mx-auto h-7 w-px bg-accent" aria-hidden="true" />
          {/*
           * The branch drops land on the CENTRES of the two boards below, which
           * are not the quarter points of this container. With `md:grid-cols-2`
           * and `gap-6`, each column is `(100% - 24px) / 2` wide, so its centre
           * sits at `25% - 6px` from the nearest edge. A bare `left-1/4` splayed
           * both drops 6px inward, and the line visibly missed the card it was
           * pointing at. Change the gap below and these insets change with it:
           * the offset is always a quarter of the gap.
           */}
          <div className="relative hidden h-7 md:block" aria-hidden="true">
            <div className="absolute top-0 right-[calc(25%-6px)] left-[calc(25%-6px)] h-px bg-accent" />
            <div className="absolute top-0 left-[calc(25%-6px)] h-7 w-px bg-accent" />
            <div className="absolute top-0 right-[calc(25%-6px)] h-7 w-px bg-accent" />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <GlobalBoard players={players} season={season} />
            <PrivateLeagueBoard />
          </div>
        </div>
      </div>
    </section>
  );
}
