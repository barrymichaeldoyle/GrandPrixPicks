import { api } from '@convex-generated/api';
import { createFileRoute, Link } from '@tanstack/react-router';
import {
  ArrowRight,
  Clock,
  Flag,
  Gauge,
  Lock,
  Target,
  Users,
} from 'lucide-react';

import { Button } from '@/components/Button/Button';
import { DevNowPanel } from '@/components/DevNowPanel';
import { FaqItem, FaqSection } from '@/components/Faq';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { formatLockCountdown } from '@grandprixpicks/shared/picks';
import { SESSION_LABELS_FULL } from '@/lib/sessions';
import { SHOW_DEV_TIME_CONTROLS } from '@/lib/devFlags';
import { setHomeCacheHeaders } from '@/lib/homeCacheHeaders';
import { withRetry } from '@/lib/retry';
import { pageMeta, siteConfig } from '@/lib/site';
import { useNow } from '@/lib/testing/now';
import { convexHttp as convex } from '@/integrations/convex/client';

import { ExamplePicksCard } from './-home/ExamplePicksCard';
import { LeaderboardTeaser } from './-home/LeaderboardTeaser';
import { PlayWithFriends } from './-home/PlayWithFriends';
import { ScoringExplainer } from './-home/ScoringExplainer';
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

/**
 * Free-tier league limits, from FREE_LIMITS in apps/backend/convex/leagues.ts.
 * Landing copy is a public promise, so these are the real numbers rather than
 * round ones: 5 private leagues created, 5 joined, 5000 members a league.
 */
const LEAGUE_FACTS = [
  { label: 'Leagues you can create', value: '5' },
  { label: 'Leagues you can join', value: '5' },
  { label: 'Cost', value: 'Free' },
] as const;

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

  const featuredShortName = featuredRace
    ? raceShortName(featuredRace.name)
    : '';

  const allFinished =
    sessions.length > 0 &&
    sessions.every(
      (s) => getSessionStatus(s, publishedSessions, now) === 'finished',
    );

  const featuredRaceCta =
    showCurrentWeekend && !nextSession
      ? allFinished
        ? 'View results'
        : 'Follow live weekend'
      : isSignedIn
        ? 'Open my picks'
        : 'Start picking';

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
                  {/* The reassurance that makes the CTA safe to click sits
                      ABOVE it now, at readable size. As 10px fine print below
                      the button it answered the objection after the ask, in
                      the quietest voice on the page. */}
                  {!isSignedIn && (
                    <p className="mt-6 text-sm leading-6 text-text-muted">
                      Free to play · No account needed to start · Fan-made, no
                      real-money betting
                    </p>
                  )}
                  <div className="mt-5 flex flex-wrap justify-center gap-3 lg:justify-start">
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
                  {/* The countdown moves here from the old next-up card: still
                      present, but no longer a 40px mono block competing with
                      the thing that explains the game. */}
                  {nextSession && (
                    <p className="mt-5 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-text-muted lg:justify-start">
                      <span className="gpp-label">
                        {featuredShortName} GP · {nextSession.label} locks in
                      </span>
                      <span
                        className="gpp-mono text-text"
                        suppressHydrationWarning
                      >
                        {formatLockCountdown(nextSession.startAt - now)}
                      </span>
                    </p>
                  )}
                </div>

                {/* The worked example, promoted out of section two.
                    Previously the eye landed on a scheduling widget with two
                    links leading away from the picker, and the only thing that
                    explains the game sat two screens below the primary CTA. */}
                <ExamplePicksCard />
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
                    <Link to="/races">Start picking</Link>
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

        {/* What the points actually are. Replaces both the worked example
            (now in the hero) and the three-step strip that restated it. */}
        {!isSignedIn && (
          <ScoringExplainer
            raceSlug={nextRace?.slug ?? featuredRace?.slug ?? null}
          />
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
            <div className="mx-auto grid w-full max-w-5xl gap-4 lg:grid-cols-2 lg:items-start">
              {!isSignedIn && (
                <div className="rounded-lg border border-border bg-surface p-4 sm:p-6">
                  <p className="gpp-label flex items-center gap-2">
                    <Users className="h-3.5 w-3.5" aria-hidden="true" />
                    Private leagues
                  </p>
                  <h2 className="mt-3 text-xl leading-snug font-normal tracking-tight text-text">
                    Run the season against your group
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-text-muted">
                    Create a league, share one link, and compare picks after
                    every session.
                  </p>
                  <dl className="mt-5 border-t border-border">
                    {LEAGUE_FACTS.map((fact) => (
                      <div
                        key={fact.label}
                        className="flex items-baseline justify-between gap-4 border-b border-border py-2.5"
                      >
                        <dt className="text-sm text-text-muted">
                          {fact.label}
                        </dt>
                        <dd className="gpp-mono text-sm text-text">
                          {fact.value}
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <Button
                    asChild
                    variant="secondary"
                    size="sm"
                    className="mt-5"
                    leftIcon={Users}
                  >
                    <Link to="/leagues">Explore leagues</Link>
                  </Button>
                </div>
              )}
              <div className="rounded-lg border border-border bg-surface p-4 sm:p-6">
                {recentRacePlayerCount > 0 && (
                  <SocialProof
                    playerCount={recentRacePlayerCount}
                    raceSlug={nextRace?.slug ?? featuredRace?.slug ?? null}
                  />
                )}
                <LeaderboardTeaser players={topPlayers} />
                {!isSignedIn && (
                  // Without this, a table of strangers on 300+ points reads as
                  // "you are 300 behind" to someone arriving at round 12.
                  <p className="mt-4 border-t border-border pt-4 text-sm leading-6 text-text-muted">
                    Join at any round. Your total starts from your first
                    session, and every weekend from here is worth the same to
                    you as it is to them.
                  </p>
                )}
              </div>
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
                    {isSignedIn ? 'Open my picks' : 'Start picking'}
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
