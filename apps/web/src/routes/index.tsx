import { api } from '@convex-generated/api';
import { createFileRoute, Link } from '@tanstack/react-router';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  Clock,
  Flag,
  Gauge,
  Lock,
  Radio,
  Target,
  Users,
} from 'lucide-react';

import type { SessionType } from '@/lib/sessions';
import { Button } from '@/components/Button/Button';
import { DevNowPanel } from '@/components/DevNowPanel';
import { FaqItem, FaqSection } from '@/components/Faq';
import { Flag as CountryFlag } from '@/components/Flag';
import { useUpcomingPredictionBannerState } from '@/components/UpcomingPredictionBanner/UpcomingPredictionBanner';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import { abbreviateGrandPrix } from '@/lib/display';
import { SHOW_DEV_TIME_CONTROLS } from '@/lib/devFlags';
import { pageMeta } from '@/lib/site';
import { useNow } from '@/lib/testing/now';
import { convexHttp as convex } from '@/integrations/convex/client';

import { fadeUp } from './-home/animations';
import { BigCountdown } from './-home/HeroCountdown';
import { HeroSpeedLines } from './-home/HeroSpeedLines';
import { HowItWorksStrip } from './-home/HowItWorksStrip';
import { LeaderboardTeaser } from './-home/LeaderboardTeaser';
import { PlayWithFriends } from './-home/PlayWithFriends';
import { SeasonStrip } from './-home/SeasonStrip';
import { SocialProof } from './-home/SocialProof';
import {
  buildSessions,
  getSessionStatus,
  groupSessionsByDay,
  SessionRow,
} from './-home/weekendSchedule';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export const Route = createFileRoute('/')({
  component: HomePage,
  loader: async () => {
    const now = Date.now();
    const [nextRace, races, topPlayers] = await Promise.all([
      convex.query(api.races.getNextRace),
      convex.query(api.races.listRaces, {}),
      convex.query(api.leaderboards.getCombinedSeasonLeaderboard, {
        limit: 10,
      }),
    ]);

    const startedRaces = races
      .filter((race) => race.raceStartAt <= now && race.status !== 'cancelled')
      .sort((a, b) => b.raceStartAt - a.raceStartAt);
    const mostRecentStartedRace = startedRaces[0] ?? null;

    // Social proof reflects the most recent race that actually has scored
    // players — not just the most recent started race, which may not be scored
    // yet (mid-weekend) or may be a dev-only scenario race with no entries.
    const scoredCandidates = startedRaces.slice(0, 6);

    const [nextRaceResults, recentRaceResults, candidateLeaderboards] =
      await Promise.all([
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
        Promise.all(
          scoredCandidates.map((race) =>
            convex.query(api.leaderboards.getCombinedRaceLeaderboard, {
              raceId: race._id,
            }),
          ),
        ),
      ]);

    const recentRacePlayerCount =
      candidateLeaderboards.find((lb) => lb.entries.length > 0)?.entries
        .length ?? 0;

    return {
      nextRace,
      mostRecentStartedRace,
      nextRaceResults,
      recentRaceResults,
      recentRacePlayerCount,
      races,
      topPlayers: topPlayers.entries,
      now,
    };
  },
  head: () =>
    pageMeta({
      title: 'Grand Prix Picks - Free F1 Prediction Game for the 2026 Season',
      description:
        'Pick the top 5 every Grand Prix weekend and compete with friends across the season. Free F1 prediction game — qualifying, sprint, and race sessions plus teammate head-to-heads.',
      path: '/',
    }),
});

// "Monaco Grand Prix" → "Monaco"; used for race-specific CTA labels.
function raceShortName(name: string) {
  const short = name
    .replace(/\bGrand Prix\b/gi, '')
    .replace(/\bGP\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return short || name;
}

// --- Main component ---

function HomePage() {
  const {
    nextRace,
    mostRecentStartedRace,
    nextRaceResults,
    recentRaceResults,
    recentRacePlayerCount,
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
  const featuredShortName = featuredRace
    ? raceShortName(featuredRace.name)
    : '';

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
                {/* Brand eyebrow — instantly says what the site is */}
                <p className="home-hero-eyebrow mb-3 inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.22em] text-cyan-300 uppercase sm:mb-4 sm:text-xs">
                  <Flag
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                    strokeWidth={2.5}
                  />
                  Free F1 Prediction Game
                </p>

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
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:mt-7">
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
                          Make {featuredShortName} Picks
                        </Link>
                      </Button>
                      <Button
                        asChild
                        variant="secondary"
                        size="md"
                        leftIcon={Users}
                      >
                        <Link to="/leagues/create">Create a League</Link>
                      </Button>
                    </div>
                  )}
                {!isPredictionBannerVisible &&
                  hasCompleteUpcomingPredictions && (
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-3 sm:mt-7">
                      {/* Returning users mostly come back to tweak their picks —
                          keep a direct route to them even when they're complete. */}
                      {nextRace && (
                        <Button
                          asChild
                          variant="primary"
                          size="md"
                          rightIcon={ArrowRight}
                        >
                          <Link
                            to="/races/$raceSlug"
                            params={{ raceSlug: nextRace.slug }}
                            search={{ from: 'home' }}
                          >
                            Review My Picks
                          </Link>
                        </Button>
                      )}
                      <Button
                        asChild
                        variant="secondary"
                        size="md"
                        leftIcon={Gauge}
                      >
                        <Link to="/feed">View Feed</Link>
                      </Button>
                      <Button
                        asChild
                        variant="secondary"
                        size="md"
                        leftIcon={Users}
                      >
                        <Link to="/leagues/create">Create a League</Link>
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
              <motion.div {...fadeUp} className="mx-auto max-w-3xl text-center">
                <p className="home-hero-eyebrow mb-3 inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.22em] text-cyan-300 uppercase sm:mb-4 sm:text-xs">
                  <Flag
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                    strokeWidth={2.5}
                  />
                  Free F1 Prediction Game
                </p>
                <h1 className="home-hero-title text-3xl font-bold tracking-tight text-white sm:text-5xl">
                  Pick the top 5 every Grand Prix weekend
                </h1>
                <p className="home-hero-copy mx-auto mt-4 max-w-[600px] text-sm leading-6 text-balance text-slate-300 sm:mt-5 sm:text-base">
                  Predict qualifying, sprint, and race finishes, call the
                  teammate head-to-heads, and compete with friends across the
                  season.
                </p>
                <div className="mt-8 flex flex-wrap justify-center gap-3">
                  <Button
                    asChild
                    variant="primary"
                    size="md"
                    rightIcon={ArrowRight}
                  >
                    <Link to="/races">Make Your Picks</Link>
                  </Button>
                  <Button
                    asChild
                    variant="secondary"
                    size="md"
                    leftIcon={Users}
                  >
                    <Link to="/leagues/create">Create a League</Link>
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </section>

        {/* Compact "how it works" — quick orientation near the top */}
        <section className="px-3 pt-1 pb-8 sm:pt-2">
          <div className="mx-auto w-full max-w-3xl">
            <HowItWorksStrip />
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

        {/* Play with friends — push private leagues into the top half */}
        <section className="px-3 pt-2 pb-8 sm:pb-10">
          <div className="mx-auto w-full max-w-3xl">
            <PlayWithFriends />
          </div>
        </section>

        {topPlayers.length > 0 && (
          <section className="px-3 pt-2 pb-10">
            <div className="mx-auto w-full max-w-3xl">
              {recentRacePlayerCount > 0 && (
                <SocialProof
                  playerCount={recentRacePlayerCount}
                  raceSlug={nextRace?.slug ?? featuredRace?.slug ?? null}
                />
              )}
              <LeaderboardTeaser players={topPlayers} />
            </div>
          </section>
        )}

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
