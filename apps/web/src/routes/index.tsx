import { api } from '@convex-generated/api';
import { createFileRoute, Link } from '@tanstack/react-router';
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

import { Button } from '@/components/Button/Button';
import { DevNowPanel } from '@/components/DevNowPanel';
import { FaqItem, FaqSection } from '@/components/Faq';
import { Flag as CountryFlag } from '@/components/Flag';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import { SESSION_LABELS_FULL } from '@/lib/sessions';
import { SHOW_DEV_TIME_CONTROLS } from '@/lib/devFlags';
import { setHomeCacheHeaders } from '@/lib/homeCacheHeaders';
import { withRetry } from '@/lib/retry';
import { pageMeta, siteConfig } from '@/lib/site';
import { useNow } from '@/lib/testing/now';
import { convexHttp as convex } from '@/integrations/convex/client';

import { BigCountdown } from './-home/HeroCountdown';
import { GameplayPreview } from './-home/GameplayPreview';
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

const homeStructuredData = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      '@id': `${siteConfig.url}/#app`,
      name: siteConfig.title,
      description: siteConfig.description,
      url: siteConfig.url,
      applicationCategory: 'GameApplication',
      applicationSubCategory: 'Formula 1 prediction game',
      operatingSystem: 'Any',
      browserRequirements: 'Requires a modern web browser',
      isAccessibleForFree: true,
      sameAs: [siteConfig.social.x.url],
      author: {
        '@type': 'Person',
        name: siteConfig.author.name,
        url: siteConfig.author.url,
      },
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
        description: 'Free core predictions and leaderboards',
      },
    },
    {
      '@type': 'FAQPage',
      '@id': `${siteConfig.url}/#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is Grand Prix Picks free?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes. Core predictions and leaderboards are free. An optional Season Pass expands league access.',
          },
        },
        {
          '@type': 'Question',
          name: 'Do I need an account to make picks?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'No account is needed to start building your picks. You sign in when you are ready to save them and compete.',
          },
        },
        {
          '@type': 'Question',
          name: 'How does scoring work?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Pick the top five for each session. An exact position earns 5 points, one place away earns 3, and a driver in the actual top five but two or more places away earns 1.',
          },
        },
        {
          '@type': 'Question',
          name: 'What are teammate head-to-head predictions?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Choose which driver from each teammate pairing will finish ahead. Every correct matchup earns one point per session.',
          },
        },
        {
          '@type': 'Question',
          name: 'When do predictions lock?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Each session locks at its scheduled start time. Qualifying, sprint qualifying, the sprint, and the race each have their own deadline.',
          },
        },
        {
          '@type': 'Question',
          name: 'How are F1 penalties handled in scoring?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Every session is scored on the official FIA classification. Grid penalties do not change the qualifying classification, so qualifying picks are unaffected by them. Post-race penalties and disqualifications do change the official race classification, so those sessions are republished and everyone is rescored.',
          },
        },
      ],
    },
  ],
};

export const Route = createFileRoute('/')({
  component: HomePage,
  loader: async () => {
    await setHomeCacheHeaders();

    // A flaky mobile connection (or a request dropped by a fast navigation)
    // makes a Convex query reject with a transient network error; left
    // unhandled it would swap the whole home page for the error boundary. Retry
    // so a momentary blip self-heals — genuine outages still throw. Everything
    // the page needs comes back in one round trip; issuing the underlying
    // queries individually from the SSR worker dominated time to first byte.
    const {
      nextRace,
      races,
      mostRecentStartedRace,
      nextRaceResults,
      recentRaceResults,
      recentRacePlayerCount,
      topPlayers,
      recentAmendment,
    } = await withRetry(() => convex.query(api.home.getHomePageData));

    return {
      nextRace,
      mostRecentStartedRace,
      nextRaceResults,
      recentRaceResults,
      recentRacePlayerCount,
      races,
      topPlayers,
      recentAmendment,
      now: Date.now(),
    };
  },
  head: () => {
    const meta = pageMeta({
      title: 'Free F1 Prediction Game 2026 | Grand Prix Picks',
      description:
        'Pick the top 5 finishers each Grand Prix weekend and compete with friends. Free F1 prediction game with qualifying, sprint, race, and head-to-head picks.',
      path: '/',
    });
    return {
      ...meta,
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify(homeStructuredData),
        },
      ],
    };
  },
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
    recentAmendment,
    now: serverNow,
  } = Route.useLoaderData();
  const now = useNow(1_000, serverNow);
  // SSR-resolved so the hero CTA renders the right signed-in/out variant on the
  // first paint (no "Make Picks" → "Review" flash). Whether the viewer has
  // already picked can't be resolved at SSR (it needs an authed read), so the
  // signed-in CTA uses one pick-state-agnostic label. See useViewerSession.
  const { isSignedIn } = useViewerSession();

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
  const featuredRaceCta =
    showCurrentWeekend && !nextSession
      ? allFinished
        ? 'View results'
        : 'Follow live weekend'
      : isSignedIn
        ? `My ${featuredShortName} Picks`
        : `Make ${featuredShortName} Picks`;

  return (
    <>
      <div className="bg-page">
        {/* Hero — open layout, no card container */}
        <section className="relative isolate px-3 pt-6 pb-8 sm:pt-12 sm:pb-10">
          <div className="relative mx-auto w-full max-w-5xl">
            {featuredRace && (
              <div className="grid items-center gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:gap-12">
                <div className="max-w-xl text-center lg:text-left">
                  <p className="gpp-label mb-4 inline-flex items-center gap-1.5 text-accent">
                    <Flag
                      className="h-3.5 w-3.5 shrink-0"
                      aria-hidden="true"
                      strokeWidth={2.5}
                    />
                    Free to play · 2026 season
                  </p>
                  <h1 className="text-4xl leading-tight font-light tracking-display text-text sm:text-5xl lg:text-[3.5rem]">
                    The F1 prediction game for every race weekend
                  </h1>
                  <p className="mx-auto mt-5 max-w-[620px] text-base leading-7 text-text-muted lg:mx-0 lg:max-w-[540px]">
                    Pick the top five, call the teammate battles, and compete
                    with friends across qualifying, sprints, and races.
                  </p>
                  <ul
                    className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-text-muted lg:justify-start"
                    aria-label="Game features"
                  >
                    <li className="inline-flex items-center gap-1.5">
                      <Target
                        className="h-4 w-4 text-accent"
                        aria-hidden="true"
                      />
                      Top 5 picks
                    </li>
                    <li className="inline-flex items-center gap-1.5">
                      <Gauge
                        className="h-4 w-4 text-accent"
                        aria-hidden="true"
                      />
                      Head-to-heads
                    </li>
                    <li className="inline-flex items-center gap-1.5">
                      <Users
                        className="h-4 w-4 text-accent"
                        aria-hidden="true"
                      />
                      Private leagues
                    </li>
                  </ul>
                  <div className="mt-7 flex flex-wrap justify-center gap-3 lg:justify-start">
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
                        {featuredRaceCta}
                      </Link>
                    </Button>
                    <Button
                      asChild
                      variant="secondary"
                      size="md"
                      leftIcon={Users}
                    >
                      {isSignedIn ? (
                        <Link to="/leagues/create">Create a League</Link>
                      ) : (
                        <Link to="/leagues">Explore Leagues</Link>
                      )}
                    </Button>
                    {isSignedIn && (
                      <Button asChild variant="text" size="md" leftIcon={Gauge}>
                        <Link to="/feed">View Feed</Link>
                      </Button>
                    )}
                  </div>
                  {!isSignedIn && (
                    <p className="mt-4 text-xs text-text-muted">
                      No account needed to start · Fan-made · No real-money
                      betting
                    </p>
                  )}
                </div>

                {/* The red-to-accent gradient rail that used to sit on this
                    edge is now the signature stripe on the container itself. */}
                <div className="gpp-stripe relative overflow-hidden rounded-lg border border-border bg-surface p-4 pl-6 sm:p-6 sm:pl-8">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="gpp-label text-xs">
                        {showCurrentWeekend ? 'This weekend' : 'Next up'}
                      </p>
                      <div className="mt-2 flex min-w-0 items-center gap-3">
                        {countryCode && (
                          <CountryFlag
                            code={countryCode}
                            size="full"
                            className="h-8 shrink-0 sm:h-10"
                          />
                        )}
                        <h2 className="min-w-0 text-xl leading-tight font-semibold text-text sm:text-2xl">
                          {featuredRace.name}
                        </h2>
                      </div>
                    </div>
                    {showCurrentWeekend && anyInProgress && !allFinished && (
                      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-xs font-semibold tracking-label text-accent uppercase">
                        <span
                          className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent"
                          aria-hidden="true"
                        />
                        Live
                      </span>
                    )}
                    {showCurrentWeekend && allFinished && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs font-semibold text-success uppercase">
                        <CheckCircle2
                          className="h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                        Complete
                      </span>
                    )}
                  </div>

                  <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-semibold tracking-label text-text-muted uppercase">
                    <span>
                      Round {featuredRace.round}
                      {totalRounds > 0 ? ` / ${totalRounds}` : ''}
                    </span>
                    {featuredRace.hasSprint && (
                      <>
                        <span aria-hidden="true" className="text-border-strong">
                          ·
                        </span>
                        <span className="text-accent">Sprint weekend</span>
                      </>
                    )}
                  </p>

                  {nextSession && (
                    <div className="mt-6 border-t border-border/70 pt-5">
                      <p className="mb-3 text-center text-xs font-semibold tracking-label text-text-muted uppercase">
                        {nextSession.label} starts in
                      </p>
                      <BigCountdown
                        targetAt={nextSession.startAt}
                        now={now}
                        compact
                      />
                    </div>
                  )}

                  {!nextSession && showCurrentWeekend && (
                    <div className="mt-6 flex items-center gap-3 border-t border-border/70 pt-5">
                      {allFinished ? (
                        <CheckCircle2
                          className="h-8 w-8 shrink-0 text-success"
                          aria-hidden="true"
                        />
                      ) : (
                        <Radio
                          className="h-8 w-8 shrink-0 animate-pulse text-accent"
                          aria-hidden="true"
                        />
                      )}
                      <div>
                        <p className="font-semibold text-text">
                          {allFinished
                            ? 'Race weekend complete'
                            : 'Race weekend in progress'}
                        </p>
                        <p className="mt-0.5 text-sm text-text-muted">
                          {allFinished
                            ? 'Results are published and the standings are updated.'
                            : 'Sessions are underway. Results are coming soon.'}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="mt-5 flex items-center justify-between gap-3 border-t border-border/70 pt-4">
                    <Link
                      to="/races/$raceSlug"
                      params={{ raceSlug: featuredRace.slug }}
                      search={{ from: 'home' }}
                      className="inline-flex min-h-7 items-center gap-1 text-sm font-semibold text-accent hover:text-accent-hover focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
                    >
                      {allFinished ? 'View results' : 'Open race'}
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </Link>
                    <Link
                      to="/races"
                      className="inline-flex min-h-7 items-center text-sm font-medium text-text-muted hover:text-text focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:outline-none"
                    >
                      Full calendar
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* No race at all — fall back to brand-led hero */}
            {!featuredRace && (
              <div className="reveal-up mx-auto max-w-3xl text-center">
                <p className="gpp-label mb-3 inline-flex items-center gap-1.5 text-accent sm:mb-4">
                  <Flag
                    className="h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                    strokeWidth={2.5}
                  />
                  Free F1 Prediction Game
                </p>
                <h1 className="text-3xl font-light tracking-display text-text sm:text-5xl">
                  Pick the top 5 every Grand Prix weekend
                </h1>
                <p className="mx-auto mt-4 max-w-[600px] text-sm leading-6 text-balance text-text-muted sm:mt-5 sm:text-base">
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
                    {isSignedIn ? (
                      <Link to="/leagues/create">Create a League</Link>
                    ) : (
                      <Link to="/leagues">Explore Leagues</Link>
                    )}
                  </Button>
                </div>
                {!isSignedIn && (
                  <p className="mt-4 text-xs text-text-muted">
                    No account needed to start · Fan-made · No real-money
                    betting
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {recentAmendment && (
          <section className="px-3 pt-1 pb-6">
            <div className="mx-auto w-full max-w-3xl">
              <div className="flex flex-col gap-2 rounded-sm border border-warning/30 bg-warning/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text">
                    {SESSION_LABELS_FULL[recentAmendment.sessionType]} results
                    for the {recentAmendment.raceName} were amended
                  </p>
                  <p className="mt-0.5 text-xs leading-5 text-text-muted">
                    {recentAmendment.amendmentNote} Scores have been
                    recalculated for everyone.
                  </p>
                </div>
                <div className="flex shrink-0 gap-3 text-xs font-medium">
                  <Link
                    to="/races/$raceSlug"
                    params={{ raceSlug: recentAmendment.raceSlug }}
                    className="text-accent hover:underline"
                  >
                    See the result
                  </Link>
                  <Link
                    to="/results-policy"
                    className="text-accent hover:underline"
                  >
                    Why results change
                  </Link>
                </div>
              </div>
            </div>
          </section>
        )}

        {!isSignedIn && (
          <GameplayPreview
            raceSlug={nextRace?.slug ?? featuredRace?.slug ?? null}
          />
        )}

        {/* Compact "how it works" — quick orientation near the top */}
        {!isSignedIn && (
          <section className="px-3 pt-1 pb-8 sm:pt-2">
            <div className="mx-auto w-full max-w-3xl">
              <HowItWorksStrip />
            </div>
          </section>
        )}

        {!isSignedIn && (
          <section className="px-3 pt-2 pb-8 sm:pb-10">
            <div className="mx-auto w-full max-w-3xl">
              <PlayWithFriends isSignedIn={false} />
            </div>
          </section>
        )}

        {/* Session timetable — grouped by day */}
        {sessions.length > 0 && featuredRace && (
          <section className="px-3 pt-1 pb-10 sm:pt-2">
            <div className="mx-auto w-full max-w-3xl py-5 sm:py-6">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="gpp-label">Weekend Schedule</h2>
                <div className="flex items-center gap-3">
                  <span
                    className="gpp-mono text-xs text-text-muted/80"
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

              {/* Capped width so the eye doesn't have to track a session name
                  across the full column to reach its time on desktop. */}
              <div className="space-y-4 sm:max-w-lg">
                {groupSessionsByDay(sessions).map(
                  ({ dayKey, dayLabel, sessions: daySessions }) => (
                    <div key={dayKey}>
                      <p
                        className="mb-1 text-xs font-semibold text-text-muted/80"
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
            <div className="mx-auto w-full max-w-5xl py-5">
              <SeasonStrip
                races={races}
                currentRaceId={featuredRace?._id ?? null}
                season={featuredRace?.season ?? null}
                now={now}
              />
            </div>
          </section>
        )}

        {isSignedIn && (
          <section className="px-3 pt-2 pb-8 sm:pb-10">
            <div className="mx-auto w-full max-w-3xl">
              <PlayWithFriends isSignedIn />
            </div>
          </section>
        )}

        {topPlayers.length > 0 && (
          <section className="px-3 pt-2 pb-10">
            <div className="mx-auto w-full max-w-3xl rounded-lg border border-border bg-surface p-4 sm:p-6">
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
          <FaqItem icon={Flag} question="Is Grand Prix Picks free?" defaultOpen>
            <p className="text-text-muted">
              Yes. Core predictions and the season leaderboard are free. An
              optional Season Pass expands how many private leagues you can
              create and public leagues you can join.
            </p>
          </FaqItem>

          <FaqItem icon={Users} question="Do I need an account to make picks?">
            <p className="text-text-muted">
              No account is needed to start. Build your top-five prediction
              first, then sign in when you&apos;re ready to save it and compete
              on the leaderboard.
            </p>
          </FaqItem>

          <FaqItem icon={Target} question="How does scoring work?">
            <p className="mb-3 text-text-muted">
              The same points system applies to qualifying, sprint qualifying
              (on sprint weekends), the sprint, and the race. You pick the top 5
              for each session; points are awarded by how close your picks are
              to the actual result:
            </p>
            <ul className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-sm">
              <li className="contents">
                <span className="font-semibold whitespace-nowrap text-accent">
                  5 pts
                </span>
                <span className="text-text-muted">Exact position match</span>
              </li>
              <li className="contents">
                <span className="font-semibold whitespace-nowrap text-accent">
                  3 pts
                </span>
                <span className="text-text-muted">
                  One place away, including P5 picked and P6 actual
                </span>
              </li>
              <li className="contents">
                <span className="font-semibold whitespace-nowrap text-accent">
                  1 pt
                </span>
                <span className="text-text-muted">
                  Driver finishes in the actual top 5, but is off by 2+
                  positions
                </span>
              </li>
              <li className="contents">
                <span className="font-semibold whitespace-nowrap text-text-muted">
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
              scores, so sprint weekends can earn you more points.
            </p>
            <p className="mt-3 text-sm text-text-muted">
              Head-to-Head scoring is separate: each correct teammate matchup
              earns 1 point per session.
            </p>
          </FaqItem>

          <FaqItem
            icon={Gauge}
            question="What are teammate head-to-head predictions?"
          >
            <p className="text-text-muted">
              Pick which driver from each teammate pairing will finish ahead.
              Every correct matchup earns one point per session, separate from
              your top-five score.
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

        <section className="px-3 pt-2 pb-14 sm:pb-16">
          <div className="mx-auto w-full max-w-3xl overflow-hidden rounded-md border border-border bg-surface px-5 py-8 text-center sm:px-8 sm:py-10">
            <p className="gpp-label text-xs">
              Your next prediction starts here
            </p>
            <h2 className="font-title mx-auto mt-3 max-w-2xl text-2xl font-semibold text-text sm:text-3xl">
              Ready to put your race-weekend knowledge on the grid?
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-text-muted sm:text-base">
              {isSignedIn
                ? 'Review the next race, lock in your picks, and keep climbing the season leaderboard.'
                : "Start your picks without an account. Sign in only when you're ready to save and join the leaderboard."}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="md" rightIcon={ArrowRight}>
                {featuredRace ? (
                  <Link
                    to="/races/$raceSlug"
                    params={{ raceSlug: featuredRace.slug }}
                    search={{ from: 'home' }}
                  >
                    {isSignedIn ? 'Open my picks' : 'Make your free picks'}
                  </Link>
                ) : (
                  <Link to="/races">Explore races</Link>
                )}
              </Button>
              <Button asChild variant="secondary" size="md" leftIcon={Users}>
                <Link to="/leagues">Explore leagues</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>

      {SHOW_DEV_TIME_CONTROLS ? (
        <DevNowPanel race={featuredRace ?? null} now={now} />
      ) : null}
    </>
  );
}
