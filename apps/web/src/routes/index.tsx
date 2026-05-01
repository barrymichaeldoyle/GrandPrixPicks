import { api } from '@convex-generated/api';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ConvexHttpClient } from 'convex/browser';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Flag,
  Gauge,
  Lock,
  Radio,
  Swords,
  Target,
  Trophy,
  Users,
} from 'lucide-react';

import type { SessionType } from '../lib/sessions';
import { Button } from '../components/Button/Button';
import { DevNowPanel } from '../components/DevNowPanel';
import { FaqItem, FaqSection } from '../components/Faq';
import { useUpcomingPredictionBannerState } from '../components/UpcomingPredictionBanner/UpcomingPredictionBanner';
import { getCountryCodeForRace, RaceFlag } from '../components/RaceCard';
import { formatTime } from '../lib/date';
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
    const [nextRace, races] = await Promise.all([
      convex.query(api.races.getNextRace),
      convex.query(api.races.listRaces, {}),
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

interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getCountdownParts(target: number, now: number): CountdownParts | null {
  const diff = target - now;
  if (diff <= 0) {
    return null;
  }
  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

function TimeUnit({ value, label }: { value: number; label: string }) {
  const [tens, ones] = String(value).padStart(2, '0').split('') as [
    string,
    string,
  ];
  return (
    <div className="flex min-w-0 flex-col items-center gap-1.5 sm:gap-2">
      <div className="flex">
        <span className="font-title inline-block w-[1ch] text-center text-[2.625rem] leading-none font-bold text-text sm:text-7xl">
          {tens}
        </span>
        <span className="font-title inline-block w-[1ch] text-center text-[2.625rem] leading-none font-bold text-text sm:text-7xl">
          {ones}
        </span>
      </div>
      <span className="text-[9px] font-semibold tracking-[0.22em] text-text-muted uppercase sm:text-[10px] sm:tracking-widest">
        {label}
      </span>
    </div>
  );
}

function CountdownSeparator() {
  return (
    <span className="mb-4 self-center text-xl font-light text-border-strong sm:mb-6 sm:text-4xl">
      :
    </span>
  );
}

function BigCountdown({ targetAt, now }: { targetAt: number; now: number }) {
  const parts = getCountdownParts(targetAt, now);

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

// --- Main component ---

function HomePage() {
  const {
    nextRace,
    mostRecentStartedRace,
    nextRaceResults,
    recentRaceResults,
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

  return (
    <>
      <div className="bg-page">
        {/* Hero — open layout, no card container */}
        <section className="home-hero relative isolate overflow-hidden px-3 pt-10 pb-10">
          <div className="mx-auto w-full max-w-5xl">
            {/* App identity */}
            <motion.div
              className="mx-auto max-w-3xl text-center"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex justify-center">
                <h1 className="home-hero-title inline-flex items-center gap-3 text-3xl font-bold tracking-tight text-white sm:text-5xl">
                  <Flag
                    className="home-hero-mark h-[0.92em] w-[0.92em] shrink-0 text-cyan-300"
                    aria-hidden="true"
                    strokeWidth={2.25}
                  />
                  <span>Grand Prix Picks</span>
                </h1>
              </div>

              <p className="home-hero-copy text-muted mx-auto mt-4 max-w-[600px] text-sm leading-6 text-balance sm:mt-5 sm:text-base">
                Predict every F1 qualifying, sprint, and race session,
                <br />
                then compete on the season leaderboard.
              </p>
            </motion.div>

            {/* Featured race — countdown + identity, open on the page */}
            {featuredRace && (
              <motion.div
                className="mx-auto mt-12 flex max-w-4xl flex-col items-center text-center"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.12,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {!isPredictionBannerVisible &&
                  !hasCompleteUpcomingPredictions &&
                  (nextSession || !showCurrentWeekend) && (
                    <div className="mb-6">
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
                    <div className="mb-6">
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

                {/* Race identity */}
                <div className="flex items-center justify-center gap-3">
                  {countryCode && (
                    <RaceFlag
                      countryCode={countryCode}
                      size="lg"
                      className="home-hero-race-flag rounded-md border border-white/18"
                    />
                  )}
                  <h2 className="home-hero-race-title text-3xl font-bold text-white sm:text-4xl">
                    <span className="sm:hidden">
                      {abbreviateGrandPrix(featuredRace.name)}
                    </span>
                    <span className="hidden sm:inline">
                      {featuredRace.name}
                    </span>
                  </h2>
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
                  <span className="home-hero-neutral-badge inline-flex items-center rounded-full border border-white/12 bg-white/6 px-2 py-0.5 text-xs font-medium text-slate-300">
                    Round {featuredRace.round}
                  </span>
                  {featuredRace.hasSprint && (
                    <span className="home-hero-sprint-badge inline-flex items-center rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 text-xs font-semibold text-cyan-200">
                      Sprint weekend
                    </span>
                  )}
                  {showCurrentWeekend && anyInProgress && !allFinished && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2 py-0.5 text-xs font-semibold text-cyan-200">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300" />
                      Live
                    </span>
                  )}
                  {showCurrentWeekend && allFinished && (
                    <span className="inline-flex items-center rounded-full border border-emerald-300/22 bg-emerald-300/10 px-2 py-0.5 text-xs font-semibold text-emerald-200">
                      Complete
                    </span>
                  )}
                </div>

                {/* Countdown */}
                {nextSession && (
                  <>
                    <div className="mt-10" suppressHydrationWarning>
                      <BigCountdown targetAt={nextSession.startAt} now={now} />
                    </div>
                    <p
                      className="home-hero-countdown-copy mt-4 text-base text-slate-300"
                      suppressHydrationWarning
                    >
                      until{' '}
                      <span className="home-hero-countdown-label font-bold text-white">
                        {nextSession.label}
                      </span>
                    </p>
                  </>
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

            {/* No race at all */}
            {!featuredRace && (
              <motion.div
                {...fadeUp}
                className="mt-8 flex flex-wrap justify-center gap-3"
              >
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
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-16 font-bold text-accent">5 points</span>
                <span className="text-text-muted">Exact position match</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-16 font-bold text-accent">3 points</span>
                <span className="text-text-muted">
                  One place away, including P5 picked and P6 actual
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-16 font-bold text-accent">1 point</span>
                <span className="text-text-muted">
                  Driver finishes in the actual top 5, but is off by 2+
                  positions
                </span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-16 font-bold text-text-muted">0 points</span>
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

      {import.meta.env.DEV ? (
        <DevNowPanel race={featuredRace ?? null} now={now} />
      ) : null}
    </>
  );
}
