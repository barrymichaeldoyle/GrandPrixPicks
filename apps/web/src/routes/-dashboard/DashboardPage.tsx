import { api } from '@convex-generated/api';
import type { FunctionReturnType } from 'convex/server';
import { useQuery } from 'convex/react';
import {
  ArrowRight,
  Check,
  Clock3,
  Flag,
  Gauge,
  Lock,
  Trophy,
  Users,
} from 'lucide-react';
import { Link } from '@tanstack/react-router';

import { Button } from '@/components/Button/Button';
import { FeedContent } from '@/routes/feed/index';
import { NoticeCard } from '@/components/NoticeCard';
import { PageHeader } from '@/components/PageHeader';
import { Pill } from '@/components/Pill';
import { RaceFlag } from '@/components/RaceFlag';
import { formatLockCountdown } from '@grandprixpicks/shared/picks';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import { SESSION_LABELS } from '@/lib/sessions';
import { useNow } from '@/lib/testing/now';

import {
  getDashboardWeekendAction,
  type DashboardSessionState,
} from './dashboardState';

type CurrentWeekend = FunctionReturnType<typeof api.races.getCurrentWeekend>;

export function DashboardPage() {
  const currentWeekend = useQuery(api.races.getCurrentWeekend, {});
  const me = useQuery(api.users.me, {});
  const history = useQuery(
    api.predictions.getUserPredictionHistory,
    me ? { userId: me._id } : 'skip',
  );
  const seasonLeaderboard = useQuery(
    api.leaderboards.getCombinedSeasonLeaderboard,
    { limit: 3 },
  );
  const leagues = useQuery(api.leagues.getMyLeagues);
  const latestScoredWeekend = history?.find((weekend) => weekend.hasScores);
  const latestRaceLeaderboard = useQuery(
    api.leaderboards.getCombinedRaceLeaderboard,
    latestScoredWeekend ? { raceId: latestScoredWeekend.raceId } : 'skip',
  );

  const firstName = (me?.displayName ?? me?.username)?.trim().split(/\s+/)[0];

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto w-full max-w-6xl px-4 py-7 sm:py-9">
        <PageHeader
          eyebrow="Dashboard"
          title={firstName ? `Welcome back, ${firstName}` : 'Your race weekend'}
          subtitle="Make the next call, check your latest result, and see what your leagues are doing."
          className="mb-7"
        />

        <WeekendHero weekend={currentWeekend} />

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
          <div className="min-w-0">
            <LatestResultCard
              weekend={latestScoredWeekend}
              leaderboard={latestRaceLeaderboard}
              loading={history === undefined}
            />
          </div>

          <aside className="space-y-4 lg:sticky lg:top-[calc(var(--nav-height)+1.5rem)] lg:col-start-2 lg:row-span-2 lg:row-start-1">
            <SeasonStandingCard leaderboard={seasonLeaderboard} />
            <DashboardLeaguesCard leagues={leagues} />
          </aside>

          <section
            className="min-w-0 lg:col-start-1 lg:row-start-2"
            aria-labelledby="dashboard-activity-heading"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Gauge className="h-4 w-4 text-accent" aria-hidden />
                <h2
                  id="dashboard-activity-heading"
                  className="text-sm font-semibold tracking-label text-text uppercase"
                >
                  Activity
                </h2>
              </div>
              <Link
                to="/feed"
                className="text-xs font-semibold text-accent hover:text-accent-hover"
              >
                Open full feed
              </Link>
            </div>
            <FeedContent />
          </section>
        </div>
      </div>
    </div>
  );
}

function WeekendHero({ weekend }: { weekend: CurrentWeekend | undefined }) {
  const now = useNow(1_000, weekend?.serverNow);

  if (weekend === undefined) {
    return <WeekendHeroSkeleton />;
  }

  if (weekend === null) {
    return (
      <NoticeCard
        level="section"
        icon={Flag}
        title="No race weekend is open yet"
        description="The next prediction window will appear here as soon as the upcoming weekend is available."
        action={
          <Button asChild size="sm" variant="secondary">
            <Link to="/races">View race calendar</Link>
          </Button>
        }
      />
    );
  }

  const action = getDashboardWeekendAction(weekend.sessions);
  const actionSession = action
    ? weekend.sessions.find(
        (session) => session.sessionType === action.sessionType,
      )
    : null;
  const countryCode = getCountryCodeForRace(weekend.race);
  const completeCount = weekend.sessions.filter(
    (session) => session.hasTop5 && session.hasH2H,
  ).length;
  const openCount = weekend.sessions.filter(
    (session) => session.canCreate || session.canEdit,
  ).length;
  const heading =
    action?.kind === 'make_top5'
      ? 'Your picks need you'
      : action?.kind === 'finish_h2h'
        ? 'One more call to make'
        : action?.kind === 'review'
          ? 'Your picks are in'
          : action?.kind === 'results'
            ? 'The results are coming in'
            : 'Picks are locked';
  const summary =
    action?.kind === 'make_top5'
      ? `Start with ${SESSION_LABELS[action.sessionType]} and your first save will fill every session that is still open.`
      : action?.kind === 'finish_h2h'
        ? `Your Top 5 is saved. Finish the ${SESSION_LABELS[action.sessionType]} teammate battles.`
        : action?.kind === 'review'
          ? `${completeCount} of ${weekend.sessions.length} sessions have complete Top 5 and H2H picks. You can still make changes.`
          : action?.kind === 'results'
            ? `Open ${SESSION_LABELS[action.sessionType]} to see your picks against the official result.`
            : 'Your selections are read-only while the weekend plays out.';

  return (
    <section
      className="gpp-stripe overflow-hidden rounded-lg border border-border bg-surface"
      aria-labelledby="dashboard-weekend-title"
      data-testid="dashboard-weekend-hero"
    >
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.7fr)]">
        <div className="p-5 sm:p-7">
          <div className="flex flex-wrap items-center gap-3">
            {countryCode ? (
              <RaceFlag
                countryCode={countryCode}
                size="lg"
                className="overflow-hidden rounded-sm border border-border"
              />
            ) : null}
            <div className="min-w-0">
              <p className="gpp-label text-accent">
                Round {weekend.race.round}
                {weekend.race.hasSprint ? ' · Sprint weekend' : ''}
              </p>
              <h2
                id="dashboard-weekend-title"
                className="mt-1 text-2xl font-semibold tracking-tight text-text sm:text-3xl"
              >
                {weekend.race.name}
              </h2>
            </div>
          </div>

          <div className="mt-6">
            <p className="text-xl font-normal text-text">{heading}</p>
            <p className="gpp-reading-copy mt-2 max-w-2xl text-text-muted">
              {summary}
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            {action ? (
              <Button asChild rightIcon={ArrowRight}>
                <Link
                  to="/races/$raceSlug"
                  params={{ raceSlug: weekend.race.slug }}
                  search={{ session: action.sessionType, from: 'home' }}
                >
                  {action.label}
                </Link>
              </Button>
            ) : null}
            {actionSession?.lockAt &&
            (actionSession.canCreate || actionSession.canEdit) ? (
              <span
                className="gpp-mono inline-flex items-center gap-1.5 text-sm text-text-muted"
                suppressHydrationWarning
              >
                <Clock3 className="h-4 w-4 text-accent" aria-hidden />
                {SESSION_LABELS[actionSession.sessionType]} locks in{' '}
                <strong className="font-medium text-text">
                  {formatLockCountdown(actionSession.lockAt - now)}
                </strong>
              </span>
            ) : null}
          </div>
        </div>

        <div className="border-t border-border bg-surface-elevated/35 p-4 sm:p-5 lg:border-t-0 lg:border-l">
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="gpp-label">Weekend status</p>
            <Pill tone={openCount > 0 ? 'success' : 'warning'} size="sm">
              {openCount > 0 ? `${openCount} open` : 'Locked'}
            </Pill>
          </div>
          <div className="divide-y divide-border">
            {weekend.sessions.map((session) => (
              <SessionStatusRow key={session.sessionType} session={session} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function SessionStatusRow({ session }: { session: DashboardSessionState }) {
  const status = session.hasResult
    ? 'Results in'
    : session.hasTop5 && session.hasH2H
      ? 'Ready'
      : session.isLocked
        ? 'Locked'
        : session.hasTop5
          ? 'H2H left'
          : 'Open';
  const Icon = session.hasResult
    ? Trophy
    : session.hasTop5 && session.hasH2H
      ? Check
      : session.isLocked
        ? Lock
        : Clock3;
  const tone =
    session.hasResult || (session.hasTop5 && session.hasH2H)
      ? 'text-success'
      : session.isLocked
        ? 'text-warning'
        : 'text-accent';

  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-sm font-medium text-text">
        {SESSION_LABELS[session.sessionType]}
      </span>
      <span
        className={`inline-flex items-center gap-1.5 text-xs font-semibold tracking-label uppercase ${tone}`}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden />
        {status}
      </span>
    </div>
  );
}

function LatestResultCard({
  weekend,
  leaderboard,
  loading,
}: {
  weekend:
    | FunctionReturnType<
        typeof api.predictions.getUserPredictionHistory
      >[number]
    | undefined;
  leaderboard:
    | FunctionReturnType<typeof api.leaderboards.getCombinedRaceLeaderboard>
    | undefined;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div
        className="rounded-lg border border-border bg-surface p-5"
        aria-label="Loading latest result"
        aria-busy="true"
      >
        <div className="h-3 w-24 animate-pulse rounded bg-surface-muted" />
        <div className="mt-3 h-5 w-48 animate-pulse rounded bg-surface-muted" />
        <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded-sm bg-surface-muted"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!weekend) {
    return (
      <NoticeCard
        level="section"
        icon={Trophy}
        title="Your first result will land here"
        description="Once a session is scored, this becomes the quick view of your points and weekend position."
      />
    );
  }

  const viewerEntry =
    leaderboard?.status === 'visible'
      ? leaderboard.entries.find((entry) => entry.isViewer)
      : null;
  const totalPoints = viewerEntry?.points ?? weekend.totalPoints;
  const rank = viewerEntry?.rank ?? weekend.top5Rank;
  const fieldSize =
    leaderboard?.status === 'visible'
      ? leaderboard.entries.length
      : weekend.top5FieldSize;

  return (
    <section
      className="overflow-hidden rounded-lg border border-border bg-surface"
      aria-labelledby="latest-result-heading"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
        <div>
          <p className="gpp-label">Latest result</p>
          <h2
            id="latest-result-heading"
            className="mt-1 font-semibold text-text"
          >
            {weekend.raceName}
          </h2>
        </div>
        <Button asChild variant="text" size="sm" rightIcon={ArrowRight}>
          <Link
            to="/races/$raceSlug"
            params={{ raceSlug: weekend.raceSlug }}
            search={{ from: 'home' }}
          >
            Full breakdown
          </Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
        <ResultStat value={totalPoints} label="Combined points" accent />
        <ResultStat
          value={rank != null ? `P${rank}` : '—'}
          label={fieldSize > 0 ? `of ${fieldSize} players` : 'Weekend rank'}
        />
        <ResultStat
          value={viewerEntry?.top5Points ?? weekend.totalPoints}
          label="Top 5"
        />
        <ResultStat value={viewerEntry?.h2hPoints ?? '—'} label="H2H" />
      </div>
    </section>
  );
}

function ResultStat({
  value,
  label,
  accent = false,
}: {
  value: number | string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-surface-elevated px-3 py-4 text-center">
      <p
        className={`font-title text-2xl font-semibold ${accent ? 'text-accent' : 'text-text'}`}
      >
        {value}
      </p>
      <p className="mt-1 text-[10px] font-semibold tracking-label text-text-muted uppercase">
        {label}
      </p>
    </div>
  );
}

function SeasonStandingCard({
  leaderboard,
}: {
  leaderboard:
    | FunctionReturnType<typeof api.leaderboards.getCombinedSeasonLeaderboard>
    | undefined;
}) {
  if (leaderboard === undefined) {
    return (
      <div className="h-32 animate-pulse rounded-lg border border-border bg-surface" />
    );
  }

  const entry = leaderboard.viewerEntry;
  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-accent" aria-hidden />
        <h2 className="gpp-label text-text-muted">Season standing</h2>
      </div>
      {entry ? (
        <>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div>
              <p className="font-title text-3xl font-semibold text-accent">
                P{entry.rank}
              </p>
              <p className="mt-1 text-xs text-text-muted">
                of {leaderboard.totalCount} players
              </p>
            </div>
            <p className="gpp-mono text-sm font-medium text-text">
              {entry.points} pts
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-sm bg-border text-center">
            <div className="bg-surface-elevated px-2 py-2">
              <p className="gpp-mono text-sm text-text">{entry.top5Points}</p>
              <p className="text-[9px] tracking-label text-text-muted uppercase">
                Top 5
              </p>
            </div>
            <div className="bg-surface-elevated px-2 py-2">
              <p className="gpp-mono text-sm text-text">{entry.h2hPoints}</p>
              <p className="text-[9px] tracking-label text-text-muted uppercase">
                H2H
              </p>
            </div>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-text-muted">
          Your rank appears after your first scored session.
        </p>
      )}
      <Link
        to="/leaderboard"
        className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover"
      >
        View leaderboard
        <ArrowRight className="h-3 w-3" aria-hidden />
      </Link>
    </div>
  );
}

function DashboardLeaguesCard({
  leagues,
}: {
  leagues: FunctionReturnType<typeof api.leagues.getMyLeagues> | undefined;
}) {
  if (leagues === undefined) {
    return (
      <div className="h-36 animate-pulse rounded-lg border border-border bg-surface" />
    );
  }

  const visibleLeagues = leagues
    .filter((league): league is NonNullable<typeof league> => league != null)
    .slice(0, 3);

  return (
    <div className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-accent" aria-hidden />
          <h2 className="gpp-label text-text-muted">Your leagues</h2>
        </div>
        <Link
          to="/leagues"
          className="text-xs font-semibold text-accent hover:text-accent-hover"
        >
          See all
        </Link>
      </div>

      {visibleLeagues.length > 0 ? (
        <ul className="mt-3 divide-y divide-border">
          {visibleLeagues.map((league) => (
            <li key={league._id}>
              <Link
                to="/leagues/$slug"
                params={{ slug: league.slug }}
                className="flex items-center justify-between gap-2 py-2.5 text-sm hover:text-accent"
              >
                <span className="truncate font-medium text-text">
                  {league.name}
                </span>
                <span className="gpp-mono shrink-0 text-xs text-text-muted">
                  {league.memberCount}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-text-muted">
          Start a league for your group chat and use the same picks in every
          competition.
        </p>
      )}

      {visibleLeagues.length === 0 ? (
        <Button asChild variant="secondary" size="sm" className="mt-4 w-full">
          <Link to="/leagues">Find or create a league</Link>
        </Button>
      ) : null}
    </div>
  );
}

function WeekendHeroSkeleton() {
  return (
    <div
      className="grid overflow-hidden rounded-lg border border-border bg-surface lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.7fr)]"
      aria-label="Loading current race weekend"
      aria-busy="true"
    >
      <div className="p-5 sm:p-7">
        <div className="h-4 w-24 animate-pulse rounded bg-surface-muted" />
        <div className="mt-3 h-8 w-64 max-w-full animate-pulse rounded bg-surface-muted" />
        <div className="mt-8 h-6 w-48 animate-pulse rounded bg-surface-muted" />
        <div className="mt-3 h-4 w-full max-w-lg animate-pulse rounded bg-surface-muted" />
        <div className="mt-6 h-11 w-36 animate-pulse rounded bg-surface-muted" />
      </div>
      <div className="border-t border-border bg-surface-elevated/35 p-5 lg:border-t-0 lg:border-l">
        <div className="h-4 w-32 animate-pulse rounded bg-surface-muted" />
        <div className="mt-4 space-y-3">
          <div className="h-9 animate-pulse rounded bg-surface-muted" />
          <div className="h-9 animate-pulse rounded bg-surface-muted" />
        </div>
      </div>
    </div>
  );
}
