import { useViewerSession } from '@/integrations/clerk/useViewerSession';
import { api } from '@convex-generated/api';
import { createFileRoute, Link, notFound } from '@tanstack/react-router';
import { convexHttp as convex } from '@/integrations/convex/client';
import { ArrowLeft, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '@/components/Button/Button';
import { DevNowPanel } from '@/components/DevNowPanel';
import { RandomizeButton } from '@/components/RandomizeButton';
import { Tooltip } from '@/components/Tooltip';
import {
  getRaceSessionLockAt,
  getRaceSessionStartAt,
} from '@/lib/raceSessions';
import type { SessionType } from '@/lib/sessions';
import { SESSION_LABELS, SESSION_LABELS_SHORT } from '@/lib/sessions';
import { SHOW_DEV_TIME_CONTROLS } from '@/lib/devFlags';
import { withRetry } from '@/lib/retry';
import { encodeShareCardSearch, parseShareCard } from '@/lib/og/shareCard';
import { getRaceLocation } from '@/lib/raceLocations';
import {
  defaultOgImage,
  pageMeta,
  shareCardOgImageUrl,
  siteConfig,
} from '@/lib/site';
import { RaceEventPage } from './-components/RaceEventPage/RaceEventPage';
import { useRaceWeekendData } from './-hooks/useRaceWeekendData';

export const Route = createFileRoute('/races/$raceSlug/')({
  validateSearch: (
    search: Record<string, unknown>,
  ): {
    session?: SessionType;
    from?: 'home';
    // Share-card params (see lib/og/shareCard.ts). Kept as raw strings so the
    // URL stays flat; parsed and validated in the loader.
    share?:
      | 'picks'
      | 'result'
      | 'h2h_picks'
      | 'h2h_result'
      | 'h2h_score'
      | 'score';
    picks?: string;
    winners?: string;
    correct?: string;
    total?: string;
    points?: string;
    final?: string;
    by?: string;
  } => {
    const rawSession = search.session;
    const session =
      rawSession === 'quali' ||
      rawSession === 'sprint_quali' ||
      rawSession === 'sprint' ||
      rawSession === 'race'
        ? rawSession
        : undefined;
    const from = search.from === 'home' ? ('home' as const) : undefined;
    const share =
      search.share === 'picks' ||
      search.share === 'result' ||
      search.share === 'h2h_picks' ||
      search.share === 'h2h_result' ||
      search.share === 'h2h_score' ||
      search.share === 'score'
        ? search.share
        : undefined;
    return {
      session,
      from,
      share,
      picks: typeof search.picks === 'string' ? search.picks : undefined,
      winners: typeof search.winners === 'string' ? search.winners : undefined,
      correct: typeof search.correct === 'string' ? search.correct : undefined,
      total: typeof search.total === 'string' ? search.total : undefined,
      points: typeof search.points === 'string' ? search.points : undefined,
      final: typeof search.final === 'string' ? search.final : undefined,
      by: typeof search.by === 'string' ? search.by : undefined,
    };
  },
  // Only depend on share params (so regular session-tab navigation doesn't
  // re-run the loader). shareSession mirrors `session` for the picks card.
  loaderDeps: ({ search }) =>
    search.share === undefined
      ? {}
      : {
          share: search.share,
          picks: search.picks,
          winners: search.winners,
          correct: search.correct,
          total: search.total,
          points: search.points,
          final: search.final,
          by: search.by,
          shareSession: search.session,
        },
  component: RaceDetailPage,
  loader: async ({ params, deps }) => {
    // Fetch the driver roster alongside the race so a signed-out visitor (and
    // search-engine crawlers, which don't run the client Convex subscriptions)
    // get a real, crawlable grid on the page instead of an empty sign-in gate.
    const [race, nextRace, drivers] = await Promise.all([
      withRetry(() =>
        convex.query(api.races.getRaceBySlug, { slug: params.raceSlug }),
      ),
      withRetry(() => convex.query(api.races.getNextRace)),
      withRetry(() => convex.query(api.drivers.listDrivers)),
    ]);
    if (!race) {
      throw notFound();
    }
    // Published results are public, so fetch them server-side too: a finished
    // race then renders its actual finishing order in the SSR HTML (crawlable,
    // and visible before the client Convex subscriptions boot) rather than an
    // empty table. Upcoming races have no results, so this is a single cheap
    // query for them.
    const availableSessions = await withRetry(() =>
      convex.query(api.results.getAllResultsForRace, { raceId: race._id }),
    );
    const resultEntries = await Promise.all(
      availableSessions.map(
        async (sessionType) =>
          [
            sessionType,
            await withRetry(() =>
              convex.query(api.results.getResultForRace, {
                raceId: race._id,
                sessionType,
              }),
            ),
          ] as const,
      ),
    );
    const initialResults = {
      availableSessions,
      resultsBySession: Object.fromEntries(resultEntries),
    };
    const shareCard =
      'share' in deps
        ? parseShareCard({ ...deps, session: deps.shareSession })
        : null;
    return { race, nextRace, drivers, initialResults, shareCard };
  },
  head: ({ loaderData, params }) => {
    const race = loaderData?.race;
    const shareCard = loaderData?.shareCard ?? null;
    const ogImage = shareCard
      ? shareCardOgImageUrl({
          race: params.raceSlug,
          ...encodeShareCardSearch(shareCard),
        })
      : defaultOgImage;
    const title =
      race &&
      (shareCard?.variant === 'result' ||
        shareCard?.variant === 'h2h_result' ||
        shareCard?.variant === 'h2h_score')
        ? `${SESSION_LABELS[shareCard.session]} ${shareCard.variant.startsWith('h2h_') ? 'H2H ' : ''}Results: ${race.name} | Grand Prix Picks`
        : race
          ? race.status === 'finished'
            ? `${race.name} ${race.season} Results | Grand Prix Picks`
            : `${race.name} ${race.season} Predictions | Grand Prix Picks`
          : 'Race Predictions | Grand Prix Picks';
    const description =
      race && shareCard?.variant === 'result'
        ? `Official ${SESSION_LABELS[shareCard.session].toLowerCase()} top 5 for the ${race.name}.`
        : race &&
            (shareCard?.variant === 'h2h_result' ||
              shareCard?.variant === 'h2h_score')
          ? `${SESSION_LABELS[shareCard.session]} teammate Head-to-Head results for the ${race.name}.`
          : race
            ? race.status === 'finished'
              ? `Full results and top 5 finishers for the ${race.season} ${race.name}. See how F1 predictions scored on Grand Prix Picks.`
              : `Pick your top 5 finishers for the ${race.season} ${race.name}. Earn up to 25 points per session and compete on the season leaderboard.`
            : 'Pick your top 5 finishers for this Grand Prix. Earn up to 25 points per session and compete on the season leaderboard.';
    const scripts: { type: string; children: string }[] = [];
    if (race) {
      const location = getRaceLocation(race.slug);
      scripts.push({
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SportsEvent',
          name: race.name,
          startDate: new Date(race.raceStartAt).toISOString(),
          // Grands Prix run to a 2-hour limit
          endDate: new Date(
            race.raceStartAt + 2 * 60 * 60 * 1000,
          ).toISOString(),
          eventStatus:
            race.status === 'cancelled'
              ? 'https://schema.org/EventCancelled'
              : 'https://schema.org/EventScheduled',
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          description,
          url: `${siteConfig.url}/races/${params.raceSlug}`,
          sport: 'Formula 1',
          ...(location && {
            location: {
              '@type': 'Place',
              name: location.circuit,
              address: {
                '@type': 'PostalAddress',
                addressLocality: location.locality,
                addressCountry: location.country,
              },
            },
          }),
          organizer: {
            '@type': 'Organization',
            name: 'Grand Prix Picks',
            url: siteConfig.url,
          },
        }),
      });
    }
    return {
      ...pageMeta({
        title,
        description,
        path: `/races/${params.raceSlug}`,
        image: ogImage,
      }),
      scripts,
    };
  },
});

function BackToRacesLink() {
  return (
    <Button asChild variant="text" size="sm" leftIcon={ArrowLeft}>
      <Link to="/races">Back to races</Link>
    </Button>
  );
}

function BackToHomeLink() {
  return (
    <Button asChild variant="text" size="sm" leftIcon={ArrowLeft}>
      <Link to="/">Back to home</Link>
    </Button>
  );
}

function LeaderboardLink({ raceId }: { raceId: string }) {
  return (
    <Button asChild variant="text" size="sm" leftIcon={Trophy}>
      <Link
        to="/leaderboard"
        search={{ time: 'weekend', mode: 'combined', raceId }}
      >
        Leaderboard
      </Link>
    </Button>
  );
}

function RaceNotFound() {
  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-4xl p-4">
        <BackToRacesLink />
        <div className="py-16 text-center">
          <h1 className="mb-2 text-2xl font-bold text-text">Race not found</h1>
          <p className="text-text-muted">
            This race doesn't exist or has been removed.
          </p>
        </div>
      </div>
    </div>
  );
}

function RaceDetailPage() {
  const { race, nextRace, drivers, initialResults } = Route.useLoaderData();
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const { from } = search;
  // Auth is resolved on the server (see useViewerSession) so the page renders
  // real content on the first paint — and for crawlers, which never boot Clerk's
  // client SDK — instead of blocking on a spinner. `isSignedIn` never downgrades
  // to signed-out during Clerk's boot transient (which would flash the signed-out
  // preview at a returning user). `isAuthLoaded` is false only while a
  // known-signed-in viewer's session is still confirming, so we wait to load
  // their picks before painting; anonymous visitors never wait.
  const { isSignedIn, confirmedSignedIn } = useViewerSession();
  const isAuthLoaded = confirmedSignedIn || !isSignedIn;

  const {
    now,
    weekendSessions,
    trackTimeZone,
    cardData,
    scores,
    weekendPredictions,
    isViewerPredictionDataLoading,
    hasPredictions,
    hasH2HPredictions,
    hasPublishedResults,
    publishedSessionSet,
    h2hPointsBySession,
    h2hScoresBySession,
    pointsSoFar,
    allEventsScored,
    scoredEventCount,
    isTop5SavedForSession,
    isH2HSavedForSession,
  } = useRaceWeekendData({
    race,
    isAuthLoaded,
    isSignedIn: !!isSignedIn,
    initialResults,
  });

  function getSessionLockAt(session: SessionType): number {
    return race ? getRaceSessionLockAt(race, session) : 0;
  }
  function getSessionStartAt(session: SessionType): number {
    return race ? getRaceSessionStartAt(race, session) : 0;
  }
  const nextOpenSession = weekendSessions.find(
    (session) => now < getSessionLockAt(session),
  );
  const defaultSession: SessionType =
    nextOpenSession ?? weekendSessions[weekendSessions.length - 1];
  const selectedSession: SessionType =
    search.session && weekendSessions.includes(search.session)
      ? search.session
      : defaultSession;
  const [top5EditingSession, setTop5EditingSession] =
    useState<SessionType | null>(null);
  const [h2hEditingSession, setH2hEditingSession] =
    useState<SessionType | null>(null);
  const [top5HasUnsavedChanges, setTop5HasUnsavedChanges] = useState(false);
  const [h2hHasUnsavedChanges, setH2hHasUnsavedChanges] = useState(false);

  function handleSessionTabChange(nextSession: SessionType) {
    if (nextSession === selectedSession) {
      return;
    }

    // No unsaved-changes guard needed here: picks are only edited inside the
    // focus overlay, which covers the tab bar — the overlay's own close
    // confirm handles dirty state before tabs are reachable again.
    setTop5EditingSession(null);
    setH2hEditingSession(null);
    setTop5HasUnsavedChanges(false);
    setH2hHasUnsavedChanges(false);
    void navigate({
      to: '/races/$raceSlug',
      params: { raceSlug: race?.slug ?? '' },
      search: (prev) => ({
        ...prev,
        session: nextSession,
      }),
      replace: true,
    });
  }

  useEffect(() => {
    if (!top5EditingSession) {
      setTop5HasUnsavedChanges(false);
    }
  }, [top5EditingSession]);

  useEffect(() => {
    if (!h2hEditingSession) {
      setH2hHasUnsavedChanges(false);
    }
  }, [h2hEditingSession]);

  const hasSprintWeekend = race?.hasSprint ?? false;

  const predictionSessionOptions = weekendSessions.map((session) => {
    const sessionData = cardData?.sessions[session] ?? null;
    const hasResults = sessionData?.hasResults ?? false;
    const isLocked = sessionData?.isLocked ?? false;
    const sessionPoints =
      (scores?.[session]?.points ?? 0) + h2hPointsBySession[session];
    const sessionPicksComplete =
      isTop5SavedForSession(session) && isH2HSavedForSession(session);
    const secondaryLabel = hasResults
      ? `+${sessionPoints}`
      : isLocked
        ? 'Locked'
        : sessionPicksComplete
          ? '✓ Picked'
          : 'Open';
    const secondaryClassName = hasResults
      ? 'text-accent'
      : isLocked
        ? 'text-warning'
        : 'text-success';

    return {
      value: session,
      label: (
        <span className="flex items-baseline gap-1.5">
          <span className="hidden sm:inline">{SESSION_LABELS[session]}</span>
          {hasSprintWeekend ? (
            <span className="sm:hidden">
              <Tooltip content={SESSION_LABELS[session]}>
                <span>{SESSION_LABELS_SHORT[session]}</span>
              </Tooltip>
            </span>
          ) : (
            <span className="sm:hidden">{SESSION_LABELS[session]}</span>
          )}
          {/* On the selected tab the status colors (success/warning/accent)
              are unreadable against the accent background — fall back to the
              tab's own white text there. */}
          <span
            className={`hidden text-xs leading-none font-semibold sm:inline ${secondaryClassName} [[aria-selected=true]_&]:text-white/85`}
          >
            {secondaryLabel}
          </span>
        </span>
      ),
    };
  });

  if (race === null) {
    return <RaceNotFound />;
  }
  const currentRace = race;

  const isNextRace = Boolean(nextRace && nextRace._id === currentRace._id);
  const isPredictable = currentRace.status === 'upcoming' && isNextRace;

  return (
    <>
      <RaceEventPage
        race={currentRace}
        isNextRace={isNextRace}
        viewer={{ isAuthLoaded, isSignedIn: !!isSignedIn }}
        drivers={drivers}
        initialResults={initialResults}
        isPredictionsLoading={
          (isPredictable && isSignedIn && weekendPredictions === undefined) ||
          isViewerPredictionDataLoading
        }
        isViewerPredictionDataLoading={isViewerPredictionDataLoading}
        weekendStatus={{
          hasPredictions,
          hasH2HPredictions,
          hasPublishedResults,
          allEventsScored,
          pointsSoFar,
          scoredEventCount,
        }}
        schedule={{
          weekendSessions,
          trackTimeZone,
          getStartAt: getSessionStartAt,
          getLockAt: getSessionLockAt,
          isPublished: (session) => publishedSessionSet.has(session),
        }}
        selectedSession={selectedSession}
        onSelectedSessionChange={handleSessionTabChange}
        sessionTabOptions={predictionSessionOptions}
        top5SelectedSessionDone={isTop5SavedForSession(selectedSession)}
        h2hSelectedSessionDone={isH2HSavedForSession(selectedSession)}
        cardData={cardData}
        h2hScoresBySession={h2hScoresBySession}
        top5Editing={{
          session: top5EditingSession,
          onSessionChange: setTop5EditingSession,
          hasUnsavedChanges: top5HasUnsavedChanges,
          onDirtyChange: setTop5HasUnsavedChanges,
        }}
        h2hEditing={{
          session: h2hEditingSession,
          onSessionChange: setH2hEditingSession,
          hasUnsavedChanges: h2hHasUnsavedChanges,
          onDirtyChange: setH2hHasUnsavedChanges,
        }}
        existingTop5PicksBySession={weekendPredictions?.predictions}
        randomizeControl={
          <RandomizeButton
            raceId={race._id}
            hasPredictions={hasPredictions}
            hasH2HPredictions={hasH2HPredictions}
          />
        }
        backLink={from === 'home' ? <BackToHomeLink /> : <BackToRacesLink />}
        leaderboardLink={<LeaderboardLink raceId={race._id} />}
      />
      {SHOW_DEV_TIME_CONTROLS ? (
        <DevNowPanel race={currentRace} now={now} />
      ) : null}
    </>
  );
}
