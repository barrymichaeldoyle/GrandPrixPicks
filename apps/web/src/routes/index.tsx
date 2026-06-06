import { api } from '@convex-generated/api';
import { getCountdownParts } from '@grandprixpicks/shared/dates';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ConvexHttpClient } from 'convex/browser';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Crown,
  Flag,
  Gauge,
  Lock,
  Radio,
  Swords,
  Target,
  Trophy,
  Users,
} from 'lucide-react';

import type { Doc } from '@convex-generated/dataModel';
import type { SessionType } from '../lib/sessions';
import { Button } from '../components/Button/Button';
import { DevNowPanel } from '../components/DevNowPanel';
import { FaqItem, FaqSection } from '../components/Faq';
import { Flag as CountryFlag } from '../components/Flag';
import { useUpcomingPredictionBannerState } from '../components/UpcomingPredictionBanner/UpcomingPredictionBanner';
import { getCountryCodeForRace } from '../components/RaceCard';
import { useUserDateFormat } from '../lib/useUserDateFormat';
import { SHOW_DEV_TIME_CONTROLS } from '../lib/devFlags';
import { canonicalMeta, defaultOgImage } from '../lib/site';
import { useNow } from '../lib/testing/now';

const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL);

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

const fadeUp = {
  initial: { opacity: 0, y: 8 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const },
};

export const Route = createFileRoute('/')({
  component: HomePage,
  loader: async () => {
    const now = Date.now();
    const [nextRace, races, topPlayers] = await Promise.all([
      convex.query(api.races.getNextRace),
      convex.query(api.races.listRaces, {}),
      convex.query(api.leaderboards.getCombinedSeasonLeaderboard, { limit: 10 }),
    ]);

    const mostRecentStartedRace =
      races
        .filter(
          (race) => race.raceStartAt <= now && race.status !== 'cancelled',
        )
        .sort((a, b) => b.raceStartAt - a.raceStartAt)[0] ?? null;

    const [nextRaceResults, recentRaceResults] = await Promise.all([
      nextRace
        ? convex.query(api.results.getAllResultsForRace, {
            raceId: nextRace._id,
          })
        : Promise.resolve([] as SessionType[]),
      mostRecentStartedRace
        ? convex.query(api.results.getAllResultsForRace, {
            raceId: mostRecentStartedRace._id,
          })
        : Promise.resolve([] as SessionType[]),
    ]);

    return {
      nextRace,
      mostRecentStartedRace,
      nextRaceResults,
      recentRaceResults,
      races,
      topPlayers: topPlayers.entries,
      now,
    };
  },
  head: () => {
    const title =
      'Grand Prix Picks - Free F1 Prediction Game for the 2026 Season';
    const description =
      'Predict the top 5 finishers for every qualifying, sprint, and race session. Call teammate head-to-heads and compete with friends on the season leaderboard.';
    const canonical = canonicalMeta('/');
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:image', content: defaultOgImage },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: defaultOgImage },
        ...canonical.meta,
      ],
      links: [...canonical.links],
    };
  },
});

// --- Countdown ---

function TimeUnit({ value, label }: { value: number; label: string }) {
  const [tens, ones] = String(value).padStart(2, '0').split('') as [
    string,
    string,
  ];
  return (
    <div className="flex min-w-0 flex-col items-center gap-2 sm:gap-2.5">
      <div className="home-countdown-group flex gap-1 sm:gap-1.5">
        <span className="home-countdown-digit font-title flex h-[3.5rem] w-[2.5rem] items-center justify-center rounded-md text-[2.5rem] leading-none font-bold text-text sm:h-[5.25rem] sm:w-[3.75rem] sm:rounded-lg sm:text-[4rem]">
          {tens}
        </span>
        <span className="home-countdown-digit font-title flex h-[3.5rem] w-[2.5rem] items-center justify-center rounded-md text-[2.5rem] leading-none font-bold text-text sm:h-[5.25rem] sm:w-[3.75rem] sm:rounded-lg sm:text-[4rem]">
          {ones}
        </span>
      </div>
      <span className="text-[10px] font-semibold tracking-[0.22em] text-text-muted uppercase sm:text-[11px] sm:tracking-widest">
        {label}
      </span>
    </div>
  );
}

function CountdownSeparator() {
  return (
    <span className="home-countdown-sep mb-5 flex flex-col items-center justify-center gap-1.5 self-center sm:mb-7 sm:gap-2">
      <span className="block h-1 w-1 rounded-full bg-accent sm:h-1.5 sm:w-1.5" />
      <span className="block h-1 w-1 rounded-full bg-accent sm:h-1.5 sm:w-1.5" />
    </span>
  );
}

function BigCountdown({ targetAt, now }: { targetAt: number; now: number }) {
  const parts = getCountdownParts(targetAt - now);

  if (!parts) {
    return (
      <p className="text-lg font-semibold text-accent" suppressHydrationWarning>
        Starting now
      </p>
    );
  }

  const { days, hours, minutes, seconds } = parts;

  return (
    <div
      className="flex items-start justify-center gap-2 sm:gap-5"
      suppressHydrationWarning
    >
      {days > 0 && (
        <>
          <TimeUnit value={days} label="days" />
          <CountdownSeparator />
        </>
      )}
      <TimeUnit value={hours} label="hrs" />
      <CountdownSeparator />
      <TimeUnit value={minutes} label="min" />
      <CountdownSeparator />
      <TimeUnit value={seconds} label="sec" />
    </div>
  );
}

// --- Session timetable ---

type SessionEntry = {
  type: SessionType;
  label: string;
  startAt: number;
};

function buildSessions(race: {
  hasSprint?: boolean;
  sprintQualiStartAt?: number;
  sprintStartAt?: number;
  qualiStartAt?: number;
  raceStartAt: number;
}): SessionEntry[] {
  const sessions: SessionEntry[] = [];
  if (race.hasSprint && race.sprintQualiStartAt) {
    sessions.push({
      type: 'sprint_quali',
      label: 'Sprint Qualifying',
      startAt: race.sprintQualiStartAt,
    });
  }
  if (race.hasSprint && race.sprintStartAt) {
    sessions.push({
      type: 'sprint',
      label: 'Sprint',
      startAt: race.sprintStartAt,
    });
  }
  if (race.qualiStartAt) {
    sessions.push({
      type: 'quali',
      label: 'Qualifying',
      startAt: race.qualiStartAt,
    });
  }
  sessions.push({ type: 'race', label: 'Race', startAt: race.raceStartAt });
  return sessions;
}

type SessionStatus = 'finished' | 'in_progress' | 'upcoming';

function getSessionStatus(
  session: SessionEntry,
  publishedSessions: SessionType[],
  now: number,
): SessionStatus {
  if (publishedSessions.includes(session.type)) {
    return 'finished';
  }
  if (session.startAt <= now) {
    return 'in_progress';
  }
  return 'upcoming';
}

function groupSessionsByDay(
  sessions: SessionEntry[],
): Array<{ dayKey: string; dayLabel: string; sessions: SessionEntry[] }> {
  const groups = new Map<
    string,
    { dayLabel: string; sessions: SessionEntry[] }
  >();
  for (const session of sessions) {
    const d = new Date(session.startAt);
    const dayKey = d.toDateString();
    const dayLabel = d.toLocaleDateString(undefined, {
      weekday: 'long',
      day: 'numeric',
      month: 'short',
    });
    if (!groups.has(dayKey)) {
      groups.set(dayKey, { dayLabel, sessions: [] });
    }
    groups.get(dayKey)!.sessions.push(session);
  }
  return Array.from(groups.entries()).map(([dayKey, data]) => ({
    dayKey,
    ...data,
  }));
}

function SessionRow({
  session,
  status,
  isNext,
}: {
  session: SessionEntry;
  status: SessionStatus;
  isNext: boolean;
}) {
  const { formatTime } = useUserDateFormat();
  return (
    <div
      className={`flex items-center gap-3 py-2.5 ${
        isNext
          ? '-ml-3 border-l-2 border-accent pl-3'
          : 'border-l-2 border-transparent'
      }`}
    >
      <span className="w-4 shrink-0">
        {status === 'finished' && (
          <CheckCircle2
            className="h-4 w-4 text-success"
            aria-label="Finished"
          />
        )}
        {status === 'in_progress' && (
          <Radio
            className="h-4 w-4 animate-pulse text-accent"
            aria-label="In progress"
          />
        )}
        {status === 'upcoming' && (
          <Clock
            className={`h-4 w-4 ${isNext ? 'text-accent' : 'text-text-muted/35'}`}
            aria-label="Upcoming"
          />
        )}
      </span>

      <span
        className={`flex-1 text-sm font-medium ${
          status === 'finished' ? 'text-text-muted' : 'text-text'
        }`}
      >
        <span className="flex items-center gap-2">
          <span>{session.label}</span>
          {status === 'in_progress' && (
            <span className="inline-flex animate-pulse items-center rounded-full border border-cyan-400/45 bg-cyan-400/18 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-accent uppercase shadow-[0_0_0_1px_rgba(34,211,238,0.08)]">
              Live
            </span>
          )}
        </span>
      </span>

      <span
        className={`shrink-0 text-sm tabular-nums ${
          status === 'finished'
            ? 'text-text-muted/45'
            : status === 'in_progress' || isNext
              ? 'font-semibold text-accent'
              : 'text-text-muted'
        }`}
        suppressHydrationWarning
      >
        {status === 'in_progress' ? 'LIVE' : formatTime(session.startAt)}
      </span>
    </div>
  );
}

function abbreviateGrandPrix(name: string) {
  return name.replace(/\bGrand Prix\b/g, 'GP');
}

// --- Decorative hero background ---

function HeroSpeedLines() {
  return (
    <svg
      aria-hidden="true"
      className="home-hero-lines pointer-events-none absolute inset-0 h-full w-full"
      viewBox="0 0 1200 600"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="hero-line-fade" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="rgba(34,211,238,0)" />
          <stop offset="45%" stopColor="rgba(34,211,238,0.55)" />
          <stop offset="100%" stopColor="rgba(34,211,238,0)" />
        </linearGradient>
        <linearGradient id="hero-line-fade-2" x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="rgba(20,184,166,0)" />
          <stop offset="50%" stopColor="rgba(20,184,166,0.42)" />
          <stop offset="100%" stopColor="rgba(20,184,166,0)" />
        </linearGradient>
      </defs>
      <g transform="rotate(-8 600 300)">
        <line
          x1="-100"
          x2="1300"
          y1="120"
          y2="120"
          stroke="url(#hero-line-fade)"
          strokeWidth="1"
        />
        <line
          x1="-100"
          x2="1300"
          y1="200"
          y2="200"
          stroke="url(#hero-line-fade-2)"
          strokeWidth="1"
        />
        <line
          x1="-100"
          x2="1300"
          y1="430"
          y2="430"
          stroke="url(#hero-line-fade-2)"
          strokeWidth="1"
        />
        <line
          x1="-100"
          x2="1300"
          y1="510"
          y2="510"
          stroke="url(#hero-line-fade)"
          strokeWidth="1"
        />
      </g>
    </svg>
  );
}

// --- Season progress strip ---

type SeasonRace = Doc<'races'>;

// ISO 3166-1 alpha-2 → broadcast-style 3-letter race abbreviation.
// Falls back to upper-cased alpha-2 if unmapped.
const COUNTRY_CODE_3: Record<string, string> = {
  au: 'AUS',
  cn: 'CHN',
  jp: 'JPN',
  bh: 'BHR',
  sa: 'KSA',
  us: 'USA',
  ca: 'CAN',
  mc: 'MON',
  es: 'ESP',
  at: 'AUT',
  gb: 'GBR',
  be: 'BEL',
  hu: 'HUN',
  nl: 'NED',
  it: 'ITA',
  sg: 'SGP',
  mx: 'MEX',
  br: 'BRA',
  qa: 'QAT',
  ae: 'UAE',
  pt: 'POR',
  az: 'AZE',
};

function countryAbbr(code: string | null): string {
  if (!code) {
    return '—';
  }
  return COUNTRY_CODE_3[code.toLowerCase()] ?? code.toUpperCase();
}

function SeasonStrip({
  races,
  currentRaceId,
  season,
  now,
}: {
  races: ReadonlyArray<SeasonRace>;
  currentRaceId: SeasonRace['_id'] | null;
  season: number | null;
  now: number;
}) {
  const sorted = races
    .filter(
      (r) =>
        r.round > 0 &&
        r.status !== 'cancelled' &&
        (season == null || r.season === season),
    )
    .sort((a, b) => a.round - b.round);
  const currentIndex = currentRaceId
    ? sorted.findIndex((r) => r._id === currentRaceId)
    : -1;

  return (
    <div>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-xs font-semibold tracking-widest text-text-muted uppercase">
          2026 Season
        </p>
        <Link
          to="/races"
          className="text-xs font-medium text-accent hover:text-accent-hover"
        >
          All races →
        </Link>
      </div>
      <div className="-mx-3 overflow-x-auto px-3 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <ol className="flex min-w-max items-center gap-1.5 sm:gap-2">
          {sorted.map((race, i) => {
            const isCurrent = race._id === currentRaceId;
            const isPast =
              !isCurrent &&
              race.raceStartAt < now &&
              race.status !== 'cancelled';
            const code = getCountryCodeForRace(race);
            const label = `Round ${race.round}: ${race.name}`;
            return (
              <li
                key={race._id}
                className="flex flex-col items-center"
                aria-current={isCurrent ? 'step' : undefined}
              >
                <Link
                  to="/races/$raceSlug"
                  params={{ raceSlug: race.slug }}
                  search={{ from: 'home' }}
                  aria-label={label}
                  title={label}
                  className={`group home-season-step relative flex h-10 w-10 items-center justify-center rounded-full border transition sm:h-11 sm:w-11 ${
                    isCurrent
                      ? 'home-season-step-current border-accent shadow-[0_0_0_3px_rgba(34,211,238,0.18)]'
                      : isPast
                        ? 'home-season-step-past border-border/60 hover:opacity-90'
                        : 'border-border/60 hover:border-border-strong'
                  }`}
                >
                  {code ? (
                    <CountryFlag
                      code={code}
                      size="md"
                      className="overflow-hidden rounded-sm"
                    />
                  ) : (
                    <span className="text-[10px] font-semibold text-text-muted">
                      {race.round}
                    </span>
                  )}
                  {isCurrent && (
                    <span
                      className="absolute -top-1 -right-1 h-2.5 w-2.5 animate-pulse rounded-full bg-accent shadow-[0_0_0_2px_var(--page)]"
                      aria-hidden="true"
                    />
                  )}
                </Link>
                <span
                  className={`mt-1 text-[10px] font-semibold tracking-wide ${
                    isCurrent
                      ? 'text-accent'
                      : isPast
                        ? 'text-text-muted/55'
                        : 'text-text-muted'
                  }`}
                >
                  {countryAbbr(code)}
                </span>
                {i < sorted.length - 1 && (
                  <span className="sr-only" aria-hidden="true">
                    ·
                  </span>
                )}
              </li>
            );
          })}
        </ol>
      </div>
      {currentIndex >= 0 && (
        <p className="mt-1 text-center text-[11px] text-text-muted sm:text-left">
          Round {sorted[currentIndex]!.round} of {sorted.length} ·{' '}
          {sorted.length - currentIndex - (sorted[currentIndex]!.status === 'finished' ? 0 : 1)}{' '}
          races remaining
        </p>
      )}
    </div>
  );
}

// --- Leaderboard teaser ---

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

function LeaderboardTeaser({
  players,
}: {
  players: ReadonlyArray<TopPlayer>;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-muted">
            <Crown
              className="h-4 w-4 text-accent"
              aria-hidden="true"
              strokeWidth={2.25}
            />
          </span>
          <h2 className="text-sm font-semibold tracking-wide text-text uppercase">
            Top Players
          </h2>
        </div>
        <Link
          to="/leaderboard"
          className="text-xs font-medium text-accent hover:text-accent-hover"
        >
          Full leaderboard →
        </Link>
      </div>
      <ol className="divide-y divide-border/35">
        {players.map((p) => {
          const name = p.displayName || p.username;
          const initial = (name || '?').slice(0, 1).toUpperCase();
          const podiumRank =
            p.rank === 1 || p.rank === 2 || p.rank === 3
              ? PODIUM_RANK_CLASSES[p.rank as 1 | 2 | 3]
              : null;
          return (
            <li
              key={p.userId}
              className="flex items-center gap-3 py-2.5"
            >
              {podiumRank ? (
                <span
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums ${podiumRank}`}
                >
                  {p.rank}
                </span>
              ) : (
                <span className="flex h-7 w-7 shrink-0 items-center justify-center text-xs font-semibold tabular-nums text-text-muted">
                  {p.rank}
                </span>
              )}
              {p.avatarUrl ? (
                <img
                  src={p.avatarUrl}
                  alt=""
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
                    {p.raceCount}{' '}
                    {p.raceCount === 1 ? 'race' : 'races'}
                  </span>
                )}
              </span>
              <span className="shrink-0 text-sm font-bold tabular-nums text-accent">
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

// --- Main component ---

function HomePage() {
  const {
    nextRace,
    mostRecentStartedRace,
    nextRaceResults,
    recentRaceResults,
    races,
    topPlayers,
  } = Route.useLoaderData();
  const now = useNow();
  const {
    isVisible: isPredictionBannerVisible,
    hasCompleteUpcomingPredictions,
  } = useUpcomingPredictionBannerState();

  const showCurrentWeekend =
    mostRecentStartedRace != null &&
    mostRecentStartedRace.raceStartAt > now - TWELVE_HOURS_MS;

  const featuredRace = showCurrentWeekend ? mostRecentStartedRace : nextRace;
  const publishedSessions = showCurrentWeekend
    ? recentRaceResults
    : nextRaceResults;

  const sessions = featuredRace ? buildSessions(featuredRace) : [];

  const nextSession =
    !showCurrentWeekend && featuredRace
      ? (sessions.find(
          (s) => getSessionStatus(s, publishedSessions, now) === 'upcoming',
        ) ?? null)
      : null;

  const countryCode = featuredRace ? getCountryCodeForRace(featuredRace) : null;

  const allFinished =
    sessions.length > 0 &&
    sessions.every(
      (s) => getSessionStatus(s, publishedSessions, now) === 'finished',
    );

  const anyInProgress = sessions.some(
    (s) => getSessionStatus(s, publishedSessions, now) === 'in_progress',
  );

  const totalRounds = featuredRace
    ? races.filter(
        (r) =>
          r.season === featuredRace.season &&
          r.round > 0 &&
          r.status !== 'cancelled',
      ).length
    : 0;

  return (
    <>
      <div className="bg-page">
        {/* Hero — open layout, no card container */}
        <section className="home-hero relative isolate overflow-hidden px-3 pt-6 pb-8 sm:pt-12 sm:pb-10">
          <HeroSpeedLines />
          <div className="relative mx-auto w-full max-w-5xl">
            {/* Featured race becomes the visual hero (better SEO + identity) */}
            {featuredRace && (
              <motion.div
                className="mx-auto flex max-w-4xl flex-col items-center text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                {/* Race identity — flag + name, larger and integrated */}
                <div className="flex items-center gap-3 sm:gap-5">
                  {countryCode && (
                    <span className="home-hero-race-flag inline-flex h-[34px] shrink-0 overflow-hidden rounded-sm border border-white/20 sm:h-[54px] sm:rounded-md">
                      <CountryFlag code={countryCode} size="full" />
                    </span>
                  )}
                  <h1 className="home-hero-race-title text-3xl font-bold tracking-tight text-white sm:text-5xl">
                    <span className="sm:hidden">
                      {abbreviateGrandPrix(featuredRace.name)}
                    </span>
                    <span className="hidden sm:inline">
                      {featuredRace.name}
                    </span>
                  </h1>
                </div>

                {/* Inline meta — no chips, no borders */}
                <p className="home-hero-meta mt-2.5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] font-semibold tracking-[0.16em] text-text-muted uppercase sm:text-xs">
                  <span>
                    Round {featuredRace.round}
                    {totalRounds > 0 ? ` / ${totalRounds}` : ''}
                  </span>
                  {featuredRace.hasSprint && (
                    <>
                      <span aria-hidden="true" className="text-border-strong">
                        ·
                      </span>
                      <span className="text-accent">Sprint Weekend</span>
                    </>
                  )}
                  {showCurrentWeekend && anyInProgress && !allFinished && (
                    <>
                      <span aria-hidden="true" className="text-border-strong">
                        ·
                      </span>
                      <span className="inline-flex items-center gap-1 text-accent">
                        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
                        Live
                      </span>
                    </>
                  )}
                  {showCurrentWeekend && allFinished && (
                    <>
                      <span aria-hidden="true" className="text-border-strong">
                        ·
                      </span>
                      <span className="text-success">Complete</span>
                    </>
                  )}
                </p>

                {/* Countdown */}
                {nextSession && (
                  <>
                    <div className="mt-6 sm:mt-10" suppressHydrationWarning>
                      <BigCountdown targetAt={nextSession.startAt} now={now} />
                    </div>
                    <p
                      className="home-hero-countdown-copy mt-4 text-sm text-slate-300 sm:mt-5 sm:text-base"
                      suppressHydrationWarning
                    >
                      until{' '}
                      <span className="home-hero-countdown-label font-bold text-white">
                        {nextSession.label}
                      </span>
                    </p>
                  </>
                )}

                {/* Primary action — moved below countdown */}
                {!isPredictionBannerVisible &&
                  !hasCompleteUpcomingPredictions &&
                  (nextSession || !showCurrentWeekend) && (
                    <div className="mt-5 sm:mt-7">
                      <Button
                        asChild
                        variant="primary"
                        size="md"
                        rightIcon={ArrowRight}
                      >
                        <Link
                          to="/races/$raceSlug"
                          params={{ raceSlug: featuredRace.slug }}
                          search={{ from: 'home' }}
                        >
                          Make predictions
                        </Link>
                      </Button>
                    </div>
                  )}
                {!isPredictionBannerVisible &&
                  hasCompleteUpcomingPredictions && (
                    <div className="mt-5 sm:mt-7">
                      <Button
                        asChild
                        variant="secondary"
                        size="md"
                        leftIcon={Gauge}
                      >
                        <Link to="/feed">View Feed</Link>
                      </Button>
                    </div>
                  )}

                {/* In-progress / complete state (no countdown) */}
                {!nextSession && showCurrentWeekend && (
                  <div className="mt-8 flex flex-col items-center gap-3">
                    {allFinished ? (
                      <>
                        <CheckCircle2 className="h-9 w-9 text-success" />
                        <p className="home-hero-state-title text-base font-semibold text-white">
                          Race weekend complete
                        </p>
                        <p className="home-hero-state-copy text-sm text-slate-300">
                          Results published — check the standings!
                        </p>
                        <div className="mt-1 flex gap-2">
                          <Button
                            asChild
                            variant="primary"
                            size="sm"
                            rightIcon={ArrowRight}
                          >
                            <Link
                              to="/races/$raceSlug"
                              params={{ raceSlug: featuredRace.slug }}
                              search={{ from: 'home' }}
                            >
                              View results
                            </Link>
                          </Button>
                          <Button asChild variant="secondary" size="sm">
                            <Link to="/leaderboard">Leaderboard</Link>
                          </Button>
                        </div>
                      </>
                    ) : (
                      <>
                        <Radio className="h-9 w-9 animate-pulse text-accent" />
                        <p className="home-hero-state-title text-base font-semibold text-white">
                          Race weekend in progress
                        </p>
                        <p className="home-hero-state-copy text-sm text-slate-300">
                          Sessions underway — results coming soon.
                        </p>
                      </>
                    )}
                  </div>
                )}

                {/* Edge case: next race but all sessions somehow started */}
                {!nextSession && !showCurrentWeekend && (
                  <div className="mt-8">
                    <Button
                      asChild
                      variant="primary"
                      size="sm"
                      rightIcon={ArrowRight}
                    >
                      <Link
                        to="/races/$raceSlug"
                        params={{ raceSlug: featuredRace.slug }}
                        search={{ from: 'home' }}
                      >
                        View race
                      </Link>
                    </Button>
                  </div>
                )}
              </motion.div>
            )}

            {/* No race at all — fall back to brand-led hero */}
            {!featuredRace && (
              <motion.div
                {...fadeUp}
                className="mx-auto max-w-3xl text-center"
              >
                <h1 className="home-hero-title inline-flex items-center gap-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">
                  <Flag
                    className="home-hero-mark h-[0.92em] w-[0.92em] shrink-0 text-cyan-300"
                    aria-hidden="true"
                    strokeWidth={2.25}
                  />
                  <span>Grand Prix Picks</span>
                </h1>
                <p className="home-hero-copy mx-auto mt-4 max-w-[600px] text-sm leading-6 text-balance text-slate-300 sm:mt-5 sm:text-base">
                  Predict every F1 qualifying, sprint, and race session,
                  <br />
                  then compete on the season leaderboard.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Button
                    asChild
                    variant="primary"
                    size="md"
                    rightIcon={ArrowRight}
                  >
                    <Link to="/races">View race calendar</Link>
                  </Button>
                  <Button asChild variant="secondary" size="md">
                    <Link to="/leaderboard">See leaderboard</Link>
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* Session timetable — grouped by day */}
        {sessions.length > 0 && featuredRace && (
          <section className="px-3 pt-1 pb-10 sm:pt-2">
            <div className="mx-auto w-full max-w-3xl">
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs font-semibold tracking-widest text-text-muted uppercase">
                  Weekend Schedule
                </p>
                <div className="flex items-center gap-3">
                  <span
                    className="text-xs text-text-muted/55 tabular-nums"
                    suppressHydrationWarning
                  >
                    {
                      Intl.DateTimeFormat(undefined, { timeZoneName: 'short' })
                        .formatToParts(now)
                        .find((p) => p.type === 'timeZoneName')?.value
                    }
                  </span>
                  <Link
                    to="/races/$raceSlug"
                    params={{ raceSlug: featuredRace.slug }}
                    search={{ from: 'home' }}
                    className="text-xs font-medium text-accent hover:text-accent-hover"
                  >
                    Open race →
                  </Link>
                </div>
              </div>

              <div className="space-y-4">
                {groupSessionsByDay(sessions).map(
                  ({ dayKey, dayLabel, sessions: daySessions }) => (
                    <div key={dayKey}>
                      <p
                        className="mb-1 text-xs font-semibold text-text-muted/60"
                        suppressHydrationWarning
                      >
                        {dayLabel}
                      </p>
                      <div className="divide-y divide-border/60">
                        {daySessions.map((session) => {
                          const status = getSessionStatus(
                            session,
                            publishedSessions,
                            now,
                          );
                          return (
                            <SessionRow
                              key={session.type}
                              session={session}
                              status={status}
                              isNext={
                                !showCurrentWeekend &&
                                session.type === nextSession?.type
                              }
                            />
                          );
                        })}
                      </div>
                    </div>
                  ),
                )}
              </div>
            </div>
          </section>
        )}

        {/* Season progress + leaderboard teaser */}
        {races.length > 0 && (
          <section className="px-3 pt-2 pb-8 sm:pb-10">
            <div className="mx-auto w-full max-w-5xl">
              <SeasonStrip
                races={races}
                currentRaceId={featuredRace?._id ?? null}
                season={featuredRace?.season ?? null}
                now={now}
              />
            </div>
          </section>
        )}

        {topPlayers.length > 0 && (
          <section className="px-3 pt-2 pb-10">
            <div className="mx-auto w-full max-w-3xl">
              <LeaderboardTeaser players={topPlayers} />
            </div>
          </section>
        )}

        {/* How It Works */}
        <section className="mx-auto max-w-5xl border-t border-border/40 px-6 pt-12 pb-12">
          <h2 className="mb-8 text-center text-2xl font-bold text-text">
            How It Works
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <motion.div
              {...fadeUp}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent-muted">
                <Flag className="h-6 w-6 text-accent" aria-hidden="true" />
              </div>
              <h3 className="mb-1 text-lg font-semibold text-text">
                Pick Your Top 5
              </h3>
              <p className="text-sm text-text-muted">
                Before each session — qualifying, sprint, and race — drag and
                drop to rank the 5 drivers you think will finish on top.
              </p>
            </motion.div>

            <motion.div
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.06 }}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent-muted">
                <Swords className="h-6 w-6 text-accent" aria-hidden="true" />
              </div>
              <h3 className="mb-1 text-lg font-semibold text-text">
                Call the Head-to-Heads
              </h3>
              <p className="text-sm text-text-muted">
                For every teammate pairing on the grid, predict which driver
                will finish ahead. Earn bonus points for each correct call.
              </p>
            </motion.div>

            <motion.div
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.1 }}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent-muted">
                <Trophy className="h-6 w-6 text-accent" aria-hidden="true" />
              </div>
              <h3 className="mb-1 text-lg font-semibold text-text">
                Earn Points Every Session
              </h3>
              <p className="text-sm text-text-muted">
                Exact position earns 5 pts, one place away earns 3, any other
                top-5 hit earns 1. Head-to-head points stack on top. Sprint
                weekends have more sessions, so more to play for.
              </p>
            </motion.div>

            <motion.div
              {...fadeUp}
              transition={{ ...fadeUp.transition, delay: 0.16 }}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-accent-muted">
                <Users className="h-6 w-6 text-accent" aria-hidden="true" />
              </div>
              <h3 className="mb-1 text-lg font-semibold text-text">
                Compete and Follow Friends
              </h3>
              <p className="text-sm text-text-muted">
                Climb the season leaderboard, follow other players, and compare
                prediction histories on public profile pages.
              </p>
            </motion.div>
          </div>
        </section>

        <FaqSection title="Frequently Asked Questions">
          <FaqItem icon={Target} question="How does scoring work?">
            <p className="mb-3 text-text-muted">
              The same points system applies to qualifying, sprint qualifying
              (on sprint weekends), the sprint, and the race. You pick the top 5
              for each session; points are awarded by how close your picks are
              to the actual result:
            </p>
            <ul className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
              <li className="contents">
                <span className="font-bold whitespace-nowrap text-accent">
                  5 pts
                </span>
                <span className="text-text-muted">Exact position match</span>
              </li>
              <li className="contents">
                <span className="font-bold whitespace-nowrap text-accent">
                  3 pts
                </span>
                <span className="text-text-muted">
                  One place away, including P5 picked and P6 actual
                </span>
              </li>
              <li className="contents">
                <span className="font-bold whitespace-nowrap text-accent">
                  1 pt
                </span>
                <span className="text-text-muted">
                  Driver finishes in the actual top 5, but is off by 2+
                  positions
                </span>
              </li>
              <li className="contents">
                <span className="font-bold whitespace-nowrap text-text-muted">
                  0 pts
                </span>
                <span className="text-text-muted">
                  Driver finishes outside the top 5
                </span>
              </li>
            </ul>
            <p className="mt-3 text-sm text-text-muted">
              Each session scores up to 25 points (all 5 correct). Your weekend
              total is the sum of quali, sprint (if applicable), and race
              scores—so sprint weekends can earn you more points.
            </p>
            <p className="mt-3 text-sm text-text-muted">
              Head-to-Head scoring is separate: each correct teammate matchup
              earns 1 point per session.
            </p>
          </FaqItem>

          <FaqItem icon={Lock} question="When do predictions lock?">
            <p className="text-text-muted">
              Each session locks at its scheduled start time. Qualifying, sprint
              qualifying (on sprint weekends), the sprint, and the race each
              have their own deadline. Once a session is locked, you can't
              change those picks, so get them in before the cutoff.
            </p>
          </FaqItem>

          <FaqItem icon={Clock} question="When can I make predictions?">
            <p className="text-text-muted">
              You predict for the current weekend only. For each session (quali,
              sprint quali, sprint, race), you can submit or edit picks until
              that session's scheduled start time. Future weekends open once the
              current one is done.
            </p>
          </FaqItem>
        </FaqSection>
      </div>

      {SHOW_DEV_TIME_CONTROLS ? (
        <DevNowPanel race={featuredRace ?? null} now={now} />
      ) : null}
    </>
  );
}
