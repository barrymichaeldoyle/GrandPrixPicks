import { api } from '@convex-generated/api';
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense, useEffect, useState } from 'react';

import { InlineLoader } from '@/components/InlineLoader';
import { useAuthCurtainGate } from '@/integrations/clerk/auth-curtain';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { SHOW_DEV_TIME_CONTROLS } from '@/lib/devFlags';
import { setHomeCacheHeaders } from '@/lib/homeCacheHeaders';
import { isConvexServerError, isTransientNetworkError } from '@/lib/retry';
import { routeQuery } from '@/lib/routeQuery';
import {
  CURRENT_SEASON,
  nextRaceOgImageUrl,
  organizationSchema,
  pageMeta,
  siteConfig,
} from '@/lib/site';
import { useNow } from '@/lib/testing/now';

import {
  preloadDashboardForReturningViewer,
  preloadDashboardPage,
} from './-dashboard/preload';
import { fetchDashboardSsrData } from './-dashboard/ssr';
import {
  BrowseRacesCta,
  LandingHero,
  ScrollToPicksCta,
} from './-home/LandingHero';
import { LANDING_PICKS_ANCHOR, LandingPicks } from './-home/LandingPicks';
import { OffSeasonHero } from './-home/OffSeasonHero';
import { CompetitionSection } from './-home/CompetitionSection';
import { ScoringSection } from './-home/ScoringSection';
import { buildSessions, getSessionStatus } from './-home/weekendSchedule';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
export const PUBLIC_HOME_TITLE = `Free F1 Prediction Game ${CURRENT_SEASON} | Grand Prix Picks`;
const DASHBOARD_TITLE = 'Dashboard | Grand Prix Picks';
// Lazy so the prod build drops it: a static import put its chunk in the
// landing page's preloads even though the flag is always off there.
const DevNowPanel = SHOW_DEV_TIME_CONTROLS
  ? lazy(() =>
      import('@/components/DevNowPanel').then((module) => ({
        default: module.DevNowPanel,
      })),
    )
  : null;

const AuthenticatedDashboard = lazy(() =>
  preloadDashboardPage().then((module) => ({
    default: module.DashboardPage,
  })),
);

// Module scope, not an effect: this has to win a race against hydration, and an
// effect runs long after the Suspense boundary has already committed a
// fallback. This module is in the entry chunk, so it executes while the router
// is still booting. See `-dashboard/preload.ts`.
preloadDashboardForReturningViewer();

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
      sameAs: [
        siteConfig.social.x.url,
        siteConfig.social.reddit.url,
        siteConfig.social.instagram.url,
      ],
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
      publisher: { '@id': `${siteConfig.url}/#organization` },
    },
    // The app and the organisation behind it are two entities, and a search
    // engine looks for the second one on the home page. It used to appear only
    // on /about, which is the page least likely to be crawled as the domain's
    // root identity.
    organizationSchema(),
  ],
};

/** Matches the home HTML's edge max-age and `useNow`'s tick. */
const HOME_NOW_BUCKET_MS = 60_000;

export const Route = createFileRoute('/')({
  component: HomePage,
  loader: async ({ context }) => {
    await setHomeCacheHeaders();

    // Rounded down to the minute so the query has a cache key that repeats.
    // With a raw `Date.now()` every navigation back to the home page was a
    // fresh key and so a fresh HTTPS round trip for this whole aggregate.
    //
    // The bucket costs no accuracy that was not already spent: this HTML is
    // edge-cached for 60 seconds, so a served response's `now` is already up
    // to a minute old, and the client re-ticks at the same 60s granularity via
    // `useNow` below. Unlike the other migrated loaders this one deliberately
    // has no component-side observer — home is meant to be one query and a
    // cache header, not a standing subscription — and it does not need one:
    // the key changes every minute, so the entry cannot go stale for longer
    // than that.
    const now =
      Math.floor(Date.now() / HOME_NOW_BUCKET_MS) * HOME_NOW_BUCKET_MS;

    // In parallel, never in sequence. SSR time on this route is almost entirely
    // one round trip to Convex, so a second one alongside costs the difference
    // between them rather than their sum — and it is what lets a signed-in
    // visitor receive a rendered dashboard instead of a screen of skeletons.
    //
    // Server only. On a client navigation the components already hold live
    // subscriptions to exactly this data, so calling the server function there
    // would add an HTTP round trip to re-fetch what the socket has. `document`
    // is the check rather than `import.meta.env.SSR` because this file is also
    // rendered by the test environment.
    const [data, dashboardSsr] = await Promise.all([
      context.queryClient.ensureQueryData({
        ...routeQuery(api.home.getHomePageData, { now }),
        // One extra attempt for a server-side failure, on top of the usual
        // network retries. This query is the whole landing page, an uncaught
        // failure here is an error page, and the one seen in production was
        // Convex's system timeout: a slow moment, not a bug that repeats.
        retry: (failureCount: number, error: Error) =>
          isTransientNetworkError(error)
            ? failureCount < 2
            : failureCount < 1 && isConvexServerError(error),
      }),
      typeof document === 'undefined'
        ? fetchDashboardSsrData()
        : Promise.resolve(null),
    ]);
    const dashboard = dashboardSsr?.data ?? null;

    // Keep the public landing payload focused on the data it actually renders.
    // The backend query is shared with other home states and intentionally
    // returns more than the conversion page needs.
    return {
      nextRace: data.nextRace,
      mostRecentStartedRace: data.mostRecentStartedRace,
      nextRaceResults: data.nextRaceResults,
      recentRaceResults: data.recentRaceResults,
      weekendBoard: data.weekendBoard,
      drivers: data.drivers,
      h2hMatchups: data.h2hMatchups,
      entryListNote: data.entryListNote,
      nextRaceNews: data.nextRaceNews,
      nextRaceWeather: data.nextRaceWeather,
      seasonPodium: data.seasonPodium,
      dashboard,
      /*
       * "The server rendered this viewer's page without their data", which is
       * what raises the sign-in curtain (see `useSsrViewerDataMissing`).
       *
       * It has to be decided here rather than inferred from `dashboard` alone,
       * because `dashboard` is null for two unrelated reasons: the SSR read
       * came up empty (a `__session` token that had expired, which is most cold
       * phone loads), and *every client navigation*, which skips the read
       * entirely. Reading the null on its own put a full-screen loader over an
       * ordinary tap back to the dashboard.
       */
      ssrViewerDataMissing:
        typeof document === 'undefined' && dashboard === null,
      // Why, for a signed-in render: read from the page source when the
      // dashboard keeps arriving as a skeleton. Null on client navigations.
      ssrMissReason: dashboardSsr?.miss ?? null,
      now,
    };
  },
  head: ({ loaderData }) => {
    const meta = pageMeta({
      title: PUBLIC_HOME_TITLE,
      description:
        'Formula 1 race weekend previews and news, plus a free game where you predict the top 5 in qualifying, sprints and the race.',
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
  const { dashboard, drivers, h2hMatchups } = Route.useLoaderData();
  /*
   * The seed belongs to whoever was signed in when the loader ran. A session
   * that ends with no navigation (signed out in another tab) leaves it in the
   * loader data, and the next person to sign in on this tab would see the last
   * player's dashboard until their own queries answered. Once the tab has been
   * signed out, that seed is never used again; a fresh loader run brings a new
   * one. `isSignedIn` holds through Clerk's boot, so this is a real sign-out.
   */
  const [abandonedSeed, setAbandonedSeed] = useState<typeof dashboard>(null);
  // Set during render, React's pattern for state derived from a change, so the
  // stale seed never reaches a commit.
  if (!isSignedIn && dashboard && abandonedSeed !== dashboard) {
    setAbandonedSeed(dashboard);
  }
  const seed = dashboard !== abandonedSeed ? dashboard : null;

  useEffect(() => {
    document.title = isSignedIn ? DASHBOARD_TITLE : PUBLIC_HOME_TITLE;
  }, [isSignedIn]);

  return isSignedIn ? (
    <Suspense fallback={<DashboardSkeleton />}>
      <AuthenticatedDashboard
        initialDrivers={drivers}
        initialMatchups={h2hMatchups}
        initialDashboard={seed}
      />
    </Suspense>
  ) : (
    <PublicLandingPage />
  );
}

/**
 * Stands in for the dashboard between hydration and the lazy chunk resolving.
 *
 * React commits this over the server's markup whether or not the chunk is
 * cached — `React.lazy` suspends at least once on hydration — so this is not a
 * rare path, it is on every signed-in load.
 *
 * It draws the page frame and a spinner, nothing else. Standing in for the
 * dashboard's shape was tried and was worse: placeholder cards at guessed
 * heights resize at every step of the load, so the outlines jump before the
 * content lands. One spinner, then the real page in one move.
 */
function DashboardSkeleton() {
  // Held for the same reason `DashboardPage` holds: during a sign-in handoff
  // the curtain should lift onto the dashboard, not onto its skeleton. Outside
  // a handoff there is no curtain and this is a no-op.
  useAuthCurtainGate(false, 'dashboardChunk');

  return (
    // Frame copied from `AppPageLayout` rather than imported: importing the
    // layout would pull the dashboard's frame onto the landing bundle for no
    // other gain.
    <div className="min-h-full bg-page">
      <div
        className="mx-auto w-full max-w-(--page-max) px-4 py-5 sm:py-7"
        aria-label="Loading dashboard"
        aria-busy="true"
      >
        <InlineLoader label="Loading dashboard" className="py-24 sm:py-28" />
      </div>
    </div>
  );
}

function PublicLandingPage() {
  const {
    nextRace,
    mostRecentStartedRace,
    nextRaceResults,
    recentRaceResults,
    weekendBoard,
    drivers,
    h2hMatchups,
    entryListNote,
    nextRaceNews,
    nextRaceWeather,
    seasonPodium,
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

  return (
    <>
      <div className="bg-page">
        {/* The hero follows the calendar's next open session, so it
            re-labels itself each race week with no manual edit: the race,
            which session locks next, its schedule, forecast and news. */}
        {featuredRace === null ? (
          <OffSeasonHero podium={seasonPodium ?? null} now={now} />
        ) : (
          <LandingHero
            race={featuredRace}
            lockSession={
              nextSession
                ? { label: nextSession.labelFull, startAt: nextSession.startAt }
                : null
            }
            now={now}
            weather={featuredRace === nextRace ? nextRaceWeather : null}
            news={featuredRace === nextRace ? nextRaceNews : null}
            cta={
              nextRace && nextSession ? (
                <ScrollToPicksCta targetId={LANDING_PICKS_ANCHOR} />
              ) : (
                <BrowseRacesCta />
              )
            }
          />
        )}

        {nextRace && nextSession ? (
          <LandingPicks
            raceId={nextRace._id}
            raceName={nextRace.name}
            raceSlug={nextRace.slug}
            season={nextRace.season}
            sessionLabel={nextSession.label}
            initialDrivers={drivers}
            initialMatchups={h2hMatchups}
            entryListNote={entryListNote}
          />
        ) : null}

        <ScoringSection />

        <CompetitionSection
          board={weekendBoard}
          picksAnchorId={nextRace && nextSession ? LANDING_PICKS_ANCHOR : null}
        />
      </div>

      {DevNowPanel ? (
        <Suspense fallback={null}>
          <DevNowPanel race={featuredRace ?? null} now={now} />
        </Suspense>
      ) : null}
    </>
  );
}
