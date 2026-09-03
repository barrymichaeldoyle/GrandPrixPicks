import { api } from '@convex-generated/api';
import { createFileRoute } from '@tanstack/react-router';
import { lazy, Suspense, useEffect } from 'react';

import { DevNowPanel } from '@/components/DevNowPanel';
import { InlineLoader } from '@/components/InlineLoader';
import { RaceWriteupCallout } from '@/components/race-writeups/RaceWriteupCallout';
import { useAuthCurtainGate } from '@/integrations/clerk/auth-curtain';
import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { SHOW_DEV_TIME_CONTROLS } from '@/lib/devFlags';
import { setHomeCacheHeaders } from '@/lib/homeCacheHeaders';
import { getRaceWriteup } from '@/lib/raceWriteups';
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
import { CompetitionSection } from './-home/CompetitionSection';
import { ScoringSection } from './-home/ScoringSection';
import { SessionClock, SessionClockChip } from './-home/SessionClock';
import { buildSessions, getSessionStatus } from './-home/weekendSchedule';

const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
export const PUBLIC_HOME_TITLE = `Free F1 Prediction Game ${CURRENT_SEASON} | Grand Prix Picks`;
const DASHBOARD_TITLE = 'Dashboard | Grand Prix Picks';
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

/** Matches the home HTML's `s-maxage` and `useNow`'s tick. */
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
    // edge-cached at `s-maxage=60`, so a served response's `now` is already up
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
    const [data, dashboard] = await Promise.all([
      context.queryClient.ensureQueryData(
        routeQuery(api.home.getHomePageData, { now }),
      ),
      typeof document === 'undefined'
        ? fetchDashboardSsrData()
        : Promise.resolve(null),
    ]);

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
      entryListNote: data.entryListNote,
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
      now,
    };
  },
  head: ({ loaderData }) => {
    const meta = pageMeta({
      title: PUBLIC_HOME_TITLE,
      description:
        'Predict the Top 5 in Formula 1 qualifying and races, choose who finishes ahead in each team, and compete on global or private leaderboards. Free to play.',
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

  useEffect(() => {
    document.title = isSignedIn ? DASHBOARD_TITLE : PUBLIC_HOME_TITLE;
  }, [isSignedIn]);

  return isSignedIn ? (
    <Suspense fallback={<DashboardSkeleton />}>
      <AuthenticatedDashboard
        initialDrivers={drivers}
        initialMatchups={h2hMatchups}
        initialDashboard={dashboard}
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
  useAuthCurtainGate(false);

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
    topPlayers,
    drivers,
    h2hMatchups,
    entryListNote,
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
        round={featuredRace.round}
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
            entryListNote={entryListNote}
          />
        ) : null}

        {/* No rule of its own above the callout. The landing sections are
            divided by one, and giving the callout a second put it in a band
            between two lines, which read as a section of its own rather than
            as the tail of the picks it follows. */}
        {nextRace && getRaceWriteup(nextRace.slug) ? (
          <div className="px-4 pb-10 sm:pb-14">
            <div className="mx-auto w-full max-w-5xl">
              <RaceWriteupCallout raceSlug={nextRace.slug} className="mt-0" />
            </div>
          </div>
        ) : null}

        <ScoringSection />

        <CompetitionSection
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
