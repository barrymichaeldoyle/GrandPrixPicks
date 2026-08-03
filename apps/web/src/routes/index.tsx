import { api } from '@convex-generated/api';
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense, useEffect } from 'react';

import { DevNowPanel } from '@/components/DevNowPanel';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { convexHttp as convex } from '@/integrations/convex/client';
import { SHOW_DEV_TIME_CONTROLS } from '@/lib/devFlags';
import { abbreviateGrandPrix } from '@/lib/display';
import { setHomeCacheHeaders } from '@/lib/homeCacheHeaders';
import { withRetry } from '@/lib/retry';
import {
  CURRENT_SEASON,
  nextRaceOgImageUrl,
  pageMeta,
  siteConfig,
} from '@/lib/site';
import { useNow } from '@/lib/testing/now';

import {
  BrowseRacesCta,
  LandingHero,
  ScrollToPicksCta,
} from './-home/LandingHero';
import { LANDING_PICKS_ANCHOR, LandingPicks } from './-home/LandingPicks';
import { LandingStickyBar } from './-home/LandingStickyBar';
import { LeaguesSection } from './-home/LeaguesSection';
import { LiveTimingStrip } from './-home/LiveTimingStrip';
import { SessionClock, SessionClockChip } from './-home/SessionClock';
import { buildSessions, getSessionStatus } from './-home/weekendSchedule';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
export const PUBLIC_HOME_TITLE = `Free F1 Prediction Game ${CURRENT_SEASON} | Grand Prix Picks`;
const DASHBOARD_TITLE = 'Dashboard | Grand Prix Picks';
const AuthenticatedDashboard = lazy(() =>
  import('./-dashboard/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
);

/**
 * The FAQPage entry that used to sit alongside this was dropped with the
 * visible FAQ section: structured data has to have a rendered counterpart on
 * the page, and answers that exist only in a script tag are the exact thing
 * Search Console flags.
 */
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
      sameAs: [siteConfig.social.x.url, siteConfig.social.reddit.url],
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
  ],
};

export const Route = createFileRoute('/')({
  component: HomePage,
  loader: async () => {
    await setHomeCacheHeaders();

    const now = Date.now();
    const data = await withRetry(() =>
      convex.query(api.home.getHomePageData, { now }),
    );

    // Keep the public landing payload focused on the data it actually renders.
    // The backend query is shared with other home states and intentionally
    // returns more than the conversion page needs.
    return {
      nextRace: data.nextRace,
      mostRecentStartedRace: data.mostRecentStartedRace,
      nextRaceResults: data.nextRaceResults,
      recentRaceResults: data.recentRaceResults,
      topPlayers: data.topPlayers,
      drivers: data.drivers,
      h2hMatchups: data.h2hMatchups,
      now,
    };
  },
  head: ({ loaderData }) => {
    const meta = pageMeta({
      title: PUBLIC_HOME_TITLE,
      description:
        'Predict the top 5 in Formula 1 qualifying and races, call team-mate battles, and compete on global or private leaderboards. Free to play.',
      path: '/',
      // The bare domain is what gets pasted into group chats, so this card is
      // the first thing most visitors ever see of the product. Naming the
      // upcoming Grand Prix and its lock time turns it from an advert into an
      // invitation with a deadline.
      image: nextRaceOgImageUrl(loaderData?.nextRace?.slug),
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

function HomePage() {
  const { isSignedIn } = useViewerSession();

  useEffect(() => {
    document.title = isSignedIn ? DASHBOARD_TITLE : PUBLIC_HOME_TITLE;
  }, [isSignedIn]);

  return isSignedIn ? (
    <Suspense fallback={<DashboardSkeleton />}>
      <AuthenticatedDashboard />
    </Suspense>
  ) : (
    <PublicLandingPage />
  );
}

function DashboardSkeleton() {
  return (
    <div
      className="mx-auto min-h-[70vh] w-full max-w-6xl px-4 py-9"
      aria-label="Loading dashboard"
      aria-busy="true"
    >
      <div className="h-3 w-24 animate-pulse rounded bg-surface-muted" />
      <div className="mt-4 h-10 w-80 max-w-full animate-pulse rounded bg-surface-muted" />
      <div className="mt-5 h-4 w-full max-w-xl animate-pulse rounded bg-surface-muted" />
      <div className="mt-10 h-64 animate-pulse rounded-lg border border-border bg-surface" />
    </div>
  );
}

function PublicLandingPage() {
  const {
    nextRace,
    mostRecentStartedRace,
    nextRaceResults,
    recentRaceResults,
    topPlayers,
    drivers,
    h2hMatchups,
    now: serverNow,
  } = Route.useLoaderData();
  // The visible clocks only show whole minutes. Updating the entire landing
  // tree once a second needlessly re-rendered the picker, leaderboard and
  // footer; the backend still enforces the exact lock instant.
  const now = useNow(60_000, serverNow);

  const recentRaceIsStillCurrent =
    mostRecentStartedRace != null &&
    mostRecentStartedRace.raceStartAt > now - TWELVE_HOURS_MS;
  const featuredRace =
    nextRace ?? (recentRaceIsStillCurrent ? mostRecentStartedRace : null);
  const publishedSessions = nextRace ? nextRaceResults : recentRaceResults;
  const sessions = featuredRace ? buildSessions(featuredRace) : [];
  const nextSession =
    sessions.find(
      (session) =>
        getSessionStatus(session, publishedSessions, now) === 'upcoming',
    ) ?? null;

  // Everything on this page is driven off the calendar's next open session, so
  // it re-labels itself each race week with no manual edit: the clock reads
  // "Next deadline · Qualifying picks" or "· Race picks" depending on what is
  // actually next, and the flag follows the round. The desktop clock takes the
  // full session label because that column is where "Sprint Quali" is least
  // likely to be understood; the mobile chip and the picker keep the compact
  // one so a single line can hold race + session + lock fact.
  //
  // Desktop clock and mobile chip share the same deadline inputs — the two
  // disagreeing about when picks lock would be a hard bug to spot.
  const clock =
    featuredRace && nextSession ? (
      <SessionClock
        raceName={featuredRace.name}
        raceSlug={featuredRace.slug}
        sessionLabel={nextSession.labelFull}
        msRemaining={nextSession.startAt - now}
        lockAt={nextSession.startAt}
      />
    ) : null;
  const clockCompact =
    featuredRace && nextSession ? (
      <SessionClockChip
        raceName={featuredRace.name}
        raceSlug={featuredRace.slug}
        sessionLabel={nextSession.label}
        msRemaining={nextSession.startAt - now}
        lockAt={nextSession.startAt}
      />
    ) : null;

  return (
    <>
      <div className="bg-page">
        {nextRace && nextSession ? (
          <LandingStickyBar
            raceName={abbreviateGrandPrix(nextRace.name)}
            raceSlug={nextRace.slug}
            msRemaining={nextSession.startAt - now}
            targetId={LANDING_PICKS_ANCHOR}
          />
        ) : null}

        <LandingHero
          clock={clock}
          clockCompact={clockCompact}
          cta={
            nextRace && nextSession ? (
              <ScrollToPicksCta targetId={LANDING_PICKS_ANCHOR} />
            ) : (
              <BrowseRacesCta />
            )
          }
        />

        {nextRace && nextSession ? (
          <LandingPicks
            raceId={nextRace._id}
            raceName={nextRace.name}
            raceSlug={nextRace.slug}
            season={nextRace.season}
            sessionLabel={nextSession.label}
            initialDrivers={drivers}
            initialMatchups={h2hMatchups}
          />
        ) : null}

        <LeaguesSection />

        <LiveTimingStrip
          players={topPlayers}
          season={featuredRace?.season ?? CURRENT_SEASON}
        />
      </div>

      {SHOW_DEV_TIME_CONTROLS ? (
        <DevNowPanel race={featuredRace ?? null} now={now} />
      ) : null}
    </>
  );
}
