import { useAuth } from '@clerk/react';
import { api } from '@convex-generated/api';
import { getRaceTimeZoneFromSlug } from '@grandprixpicks/shared/raceTimezones';
import { createFileRoute, Link, redirect } from '@tanstack/react-router';
import { ConvexHttpClient } from 'convex/browser';
import { useQuery } from 'convex/react';
import { ArrowLeft, CircleX, Pencil, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Badge } from '../../components/Badge';
import { Button } from '../../components/Button';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { PredictionForm } from '../../components/PredictionForm';
import { RaceEventPageLayout } from '../../components/RaceEventPageLayout';
import { fromRaceDetail, RaceScoreCard } from '../../components/RaceScoreCard';
import { RandomizeButton } from '../../components/RandomizeButton';
import { Tooltip } from '../../components/Tooltip';
import type { SessionType } from '../../lib/sessions';
import {
  getSessionsForWeekend,
  SESSION_LABELS,
  SESSION_LABELS_SHORT,
} from '../../lib/sessions';
import { canonicalMeta, defaultOgImage, siteConfig } from '../../lib/site';
import { H2HResultsSection, H2HSection } from './-race-detail-content';

const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL);

export const Route = createFileRoute('/races/$raceSlug')({
  validateSearch: (
    search: Record<string, unknown>,
  ): { session?: SessionType } => {
    const rawSession = search.session;
    const session =
      rawSession === 'quali' ||
      rawSession === 'sprint_quali' ||
      rawSession === 'sprint' ||
      rawSession === 'race'
        ? rawSession
        : undefined;
    return { session };
  },
  component: RaceDetailPage,
  loader: async ({ params, location }) => {
    const [race, nextRace] = await Promise.all([
      convex.query(api.races.getRaceBySlugOrLegacyRef, {
        ref: params.raceSlug,
      }),
      convex.query(api.races.getNextRace),
    ]);
    if (race && race.slug !== params.raceSlug) {
      throw redirect({
        to: '/races/$raceSlug',
        params: { raceSlug: race.slug },
        search: location.search,
      });
    }
    return { race, nextRace };
  },
  head: ({ loaderData, params }) => {
    const race = loaderData?.race;
    const ogImage = defaultOgImage;
    const title = race
      ? `${race.name} Predictions | Grand Prix Picks`
      : 'Race Predictions | Grand Prix Picks';
    const description = race
      ? `Pick your top 5 finishers for the ${race.name}. Earn up to 25 points per session and compete on the season leaderboard.`
      : 'Pick your top 5 finishers for this Grand Prix. Earn up to 25 points per session and compete on the season leaderboard.';
    const canonical = canonicalMeta(`/races/${params.raceSlug}`);
    const scripts: Array<{ type: string; children: string }> = [];
    if (race) {
      scripts.push({
        type: 'application/ld+json',
        children: JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'SportsEvent',
          name: race.name,
          startDate: new Date(race.raceStartAt).toISOString(),
          eventStatus: 'https://schema.org/EventScheduled',
          eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
          description,
          url: `${siteConfig.url}/races/${params.raceSlug}`,
          sport: 'Formula 1',
          organizer: {
            '@type': 'Organization',
            name: 'Grand Prix Picks',
            url: siteConfig.url,
          },
        }),
      });
    }
    return {
      meta: [
        { title },
        { name: 'description', content: description },
        { property: 'og:title', content: title },
        { property: 'og:description', content: description },
        { property: 'og:image', content: ogImage },
        { name: 'twitter:title', content: title },
        { name: 'twitter:description', content: description },
        { name: 'twitter:image', content: ogImage },
        ...canonical.meta,
      ],
      links: [...canonical.links],
      scripts,
    };
  },
});

function BackToRacesLink() {
  return (
    <Button
      asChild
      variant="text"
      size="sm"
      leftIcon={ArrowLeft}
      className="mb-4"
    >
      <Link to="/races">Back to races</Link>
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
  const { race, nextRace } = Route.useLoaderData();
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const now = Date.now();
  const weekendSessions = getSessionsForWeekend(!!race?.hasSprint);
  function getSessionLockAt(session: SessionType): number {
    if (!race) {
      return 0;
    }
    switch (session) {
      case 'quali':
        return race.qualiLockAt ?? 0;
      case 'sprint_quali':
        return race.sprintQualiLockAt ?? 0;
      case 'sprint':
        return race.sprintLockAt ?? 0;
      case 'race':
        return race.predictionLockAt;
    }
  }
  function getSessionStartAt(session: SessionType): number {
    if (!race) {
      return 0;
    }
    switch (session) {
      case 'quali':
        return race.qualiStartAt ?? race.raceStartAt;
      case 'sprint_quali':
        return race.sprintQualiStartAt ?? race.raceStartAt;
      case 'sprint':
        return race.sprintStartAt ?? race.raceStartAt;
      case 'race':
        return race.raceStartAt;
    }
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

    const hasUnsavedTop5 = top5EditingSession !== null && top5HasUnsavedChanges;
    const hasUnsavedH2H = h2hEditingSession !== null && h2hHasUnsavedChanges;

    if (hasUnsavedTop5 || hasUnsavedH2H) {
      const confirmSwitch = window.confirm(
        'You have unsaved prediction changes for this session. Switch tabs and discard them?',
      );
      if (!confirmSwitch) {
        return;
      }
    }

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

  // ─── Queries for RaceScoreCard ───
  const predictionOpenAt = useQuery(
    api.races.getPredictionOpenAt,
    race ? { raceId: race._id } : 'skip',
  );
  const weekendPredictions = useQuery(
    api.predictions.myWeekendPredictions,
    race ? { raceId: race._id } : 'skip',
  );
  const scores = useQuery(
    api.results.getMyScoresForRace,
    race ? { raceId: race._id } : 'skip',
  );
  const actualTop5BySession = useQuery(
    api.results.getEnrichedTop5BySession,
    race ? { raceId: race._id } : 'skip',
  );
  const availableSessions = useQuery(
    api.results.getAllResultsForRace,
    race ? { raceId: race._id } : 'skip',
  );
  const drivers = useQuery(api.drivers.listDrivers);
  const raceRank = useQuery(
    api.results.getRaceRank,
    race ? { raceId: race._id } : 'skip',
  );

  // Per-session results (fetch when available)
  const qualiResult = useQuery(
    api.results.getResultForRace,
    race && availableSessions?.includes('quali')
      ? { raceId: race._id, sessionType: 'quali' as const }
      : 'skip',
  );
  const sprintQualiResult = useQuery(
    api.results.getResultForRace,
    race && availableSessions?.includes('sprint_quali')
      ? { raceId: race._id, sessionType: 'sprint_quali' as const }
      : 'skip',
  );
  const sprintResult = useQuery(
    api.results.getResultForRace,
    race && availableSessions?.includes('sprint')
      ? { raceId: race._id, sessionType: 'sprint' as const }
      : 'skip',
  );
  const raceResult = useQuery(
    api.results.getResultForRace,
    race && availableSessions?.includes('race')
      ? { raceId: race._id, sessionType: 'race' as const }
      : 'skip',
  );

  // ─── H2H queries (unchanged) ───
  const h2hPredictions = useQuery(
    api.h2h.myH2HPredictionsForRace,
    race ? { raceId: race._id } : 'skip',
  );
  const h2hQualiScore = useQuery(
    api.h2h.getMyH2HScoreForRace,
    race ? { raceId: race._id, sessionType: 'quali' } : 'skip',
  );
  const h2hSprintQualiScore = useQuery(
    api.h2h.getMyH2HScoreForRace,
    race ? { raceId: race._id, sessionType: 'sprint_quali' } : 'skip',
  );
  const h2hSprintScore = useQuery(
    api.h2h.getMyH2HScoreForRace,
    race ? { raceId: race._id, sessionType: 'sprint' } : 'skip',
  );
  const h2hRaceScore = useQuery(
    api.h2h.getMyH2HScoreForRace,
    race ? { raceId: race._id, sessionType: 'race' } : 'skip',
  );

  const hasPredictions =
    weekendPredictions?.predictions &&
    Object.values(weekendPredictions.predictions).some((p) => p !== null);
  const hasH2HPredictions = h2hPredictions
    ? Object.values(h2hPredictions).some((p) => p !== null)
    : false;
  const hasPublishedResults = (availableSessions?.length ?? 0) > 0;
  const publishedSessionSet = new Set(availableSessions ?? []);
  const top5PointsBySession: Record<SessionType, number> = {
    quali: scores?.quali?.points ?? 0,
    sprint_quali: scores?.sprint_quali?.points ?? 0,
    sprint: scores?.sprint?.points ?? 0,
    race: scores?.race?.points ?? 0,
  };
  const h2hPointsBySession: Record<SessionType, number> = {
    quali: h2hQualiScore?.points ?? 0,
    sprint_quali: h2hSprintQualiScore?.points ?? 0,
    sprint: h2hSprintScore?.points ?? 0,
    race: h2hRaceScore?.points ?? 0,
  };
  const pointsSoFar = weekendSessions.reduce((sum, session) => {
    if (!publishedSessionSet.has(session)) {
      return sum;
    }
    return sum + top5PointsBySession[session] + h2hPointsBySession[session];
  }, 0);
  const allEventsScored = weekendSessions.every((session) =>
    publishedSessionSet.has(session),
  );
  const scoredEventCount = weekendSessions.filter((session) =>
    publishedSessionSet.has(session),
  ).length;

  // ─── Build card data ───
  const resultsBySession: Partial<
    Record<
      SessionType,
      {
        enrichedClassification: NonNullable<
          typeof qualiResult
        >['enrichedClassification'];
      } | null
    >
  > = {};
  if (qualiResult !== undefined) {
    resultsBySession.quali = qualiResult;
  }
  if (sprintQualiResult !== undefined) {
    resultsBySession.sprint_quali = sprintQualiResult;
  }
  if (sprintResult !== undefined) {
    resultsBySession.sprint = sprintResult;
  }
  if (raceResult !== undefined) {
    resultsBySession.race = raceResult;
  }

  let cardData = null;
  if (race) {
    const data = fromRaceDetail({
      race,
      weekendPredictions: weekendPredictions ?? null,
      scores: scores ?? null,
      actualTop5BySession: actualTop5BySession ?? null,
      resultsBySession,
      drivers: drivers ?? undefined,
      availableSessions: availableSessions ?? [],
      predictionOpenAt:
        predictionOpenAt === undefined ? null : predictionOpenAt,
    });
    if (raceRank) {
      data.raceRank = raceRank;
    }
    cardData = data;
  }
  let selectedSessionCardData = null;
  if (cardData) {
    const sessions = { ...cardData.sessions };
    for (const session of weekendSessions) {
      if (session !== selectedSession) {
        sessions[session] = null;
      }
    }
    selectedSessionCardData = { ...cardData, sessions };
  }
  const hasSprintWeekend = race?.hasSprint ?? false;
  const trackTimeZone =
    race?.timeZone ??
    (race ? getRaceTimeZoneFromSlug(race.slug) : undefined) ??
    'UTC';
  const predictionSessionOptions = weekendSessions.map((session) => {
    const sessionData = cardData?.sessions[session] ?? null;
    const hasResults = sessionData?.hasResults ?? false;
    const isLocked = sessionData?.isLocked ?? false;
    const sessionPoints =
      (scores?.[session]?.points ?? 0) + h2hPointsBySession[session];
    const secondaryLabel = hasResults
      ? `+${sessionPoints}`
      : isLocked
        ? 'Locked'
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
          <span
            className={`hidden text-xs leading-none font-semibold sm:inline ${secondaryClassName}`}
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
  const canManagePredictions = isNextRace;
  const selectedSessionData = cardData?.sessions[selectedSession] ?? null;
  const canEditSelectedSession = Boolean(
    canManagePredictions &&
    selectedSessionData &&
    !selectedSessionData.isLocked &&
    !selectedSessionData.hasResults,
  );

  // ─── Top 5 editing flow ───
  function renderTop5EditForm() {
    if (!top5EditingSession) {
      return null;
    }
    return (
      <div className="p-4">
        <PredictionForm
          raceId={currentRace._id}
          sessionType={top5EditingSession}
          existingPicks={
            weekendPredictions?.predictions[top5EditingSession] ?? undefined
          }
          onSuccess={() => setTop5EditingSession(null)}
          onDirtyChange={setTop5HasUnsavedChanges}
        />
      </div>
    );
  }

  // ─── Initial prediction form (no picks yet, signed in) ───
  function renderInitialForm() {
    if (!isPredictable || !isSignedIn || hasPredictions) {
      return null;
    }
    return (
      <div className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 shrink-0 text-accent" />
          <h2 className="text-xl font-semibold text-text">Top 5 Predictions</h2>
        </div>
        <p className="text-text-muted">
          Pick your top 5 drivers. This prediction will apply to{' '}
          {currentRace.hasSprint
            ? 'Qualifying, Sprint Qualifying, Sprint, and Race'
            : 'Qualifying and Race'}
          . Save now, then edit any session any time before it starts.
        </p>
        <PredictionForm raceId={currentRace._id} />
      </div>
    );
  }

  function renderLateSessionEntryForm() {
    if (
      isPredictable ||
      !isSignedIn ||
      hasPredictions ||
      !canEditSelectedSession
    ) {
      return null;
    }

    return (
      <div className="space-y-2 p-4">
        <div className="flex items-center gap-2">
          <Trophy className="h-5 w-5 shrink-0 text-accent" />
          <h2 className="text-xl font-semibold text-text">
            {SESSION_LABELS[selectedSession]} Predictions
          </h2>
        </div>
        <p className="text-text-muted">
          Earlier sessions are closed, but {SESSION_LABELS[selectedSession]} is
          still open. These picks will apply to this session only.
        </p>
        <PredictionForm
          raceId={currentRace._id}
          sessionType={selectedSession}
          onDirtyChange={setTop5HasUnsavedChanges}
        />
      </div>
    );
  }

  return (
    <RaceEventPageLayout
      race={currentRace}
      isNextRace={isNextRace}
      isPredictable={isPredictable}
      isAuthLoaded={isAuthLoaded}
      isSignedIn={!!isSignedIn}
      isPredictionsLoading={isPredictable && weekendPredictions === undefined}
      hasPredictions={!!hasPredictions}
      hasH2HPredictions={hasH2HPredictions}
      hasPublishedResults={hasPublishedResults}
      allEventsScored={allEventsScored}
      pointsSoFar={pointsSoFar}
      scoredEventCount={scoredEventCount}
      weekendSessions={weekendSessions}
      selectedSession={selectedSession}
      onSelectedSessionChange={handleSessionTabChange}
      sessionTabOptions={predictionSessionOptions}
      showSessionTabs={
        weekendSessions.length > 1 && (!!hasPredictions || hasPublishedResults)
      }
      trackTimeZone={trackTimeZone}
      getSessionStartAt={getSessionStartAt}
      getSessionLockAt={getSessionLockAt}
      isSessionPublished={(session) => publishedSessionSet.has(session)}
      randomizeControl={
        <RandomizeButton
          raceId={race._id}
          hasPredictions={!!hasPredictions}
          hasH2HPredictions={hasH2HPredictions}
        />
      }
      backLink={<BackToRacesLink />}
      initialTop5Content={renderInitialForm()}
      top5MainContent={
        top5EditingSession
          ? renderTop5EditForm()
          : (renderLateSessionEntryForm() ??
            (cardData && (
              <ErrorBoundary>
                <RaceScoreCard
                  data={selectedSessionCardData ?? cardData}
                  variant="full"
                  viewer={{
                    isSignedIn: !!isSignedIn,
                    isOwner: true,
                  }}
                  isNextRace={isNextRace}
                  onEditSession={
                    canManagePredictions ? setTop5EditingSession : undefined
                  }
                />
              </ErrorBoundary>
            )))
      }
      top5HeaderAside={
        canManagePredictions && selectedSessionData ? (
          <div className="flex items-center gap-2">
            {selectedSessionData.isLocked &&
              !selectedSessionData.hasResults && (
                <Tooltip content="This session has started — predictions can't be changed">
                  <span className="shrink-0">
                    <Badge variant="locked" />
                  </span>
                </Tooltip>
              )}
            {top5EditingSession ? (
              <Button
                variant="text"
                size="inline"
                leftIcon={CircleX}
                onClick={() => {
                  if (top5HasUnsavedChanges) {
                    const confirmStop = window.confirm(
                      'You have unsaved Top 5 changes. Stop editing and discard them?',
                    );
                    if (!confirmStop) {
                      return;
                    }
                  }
                  setTop5EditingSession(null);
                }}
                title={`Stop editing ${SESSION_LABELS[selectedSession]} predictions`}
              >
                Stop Editing
              </Button>
            ) : (
              canEditSelectedSession && (
                <Button
                  variant="text"
                  size="inline"
                  leftIcon={Pencil}
                  onClick={() => setTop5EditingSession(selectedSession)}
                  title={`Edit ${SESSION_LABELS[selectedSession]}`}
                >
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              )
            )}
          </div>
        ) : null
      }
      h2hContent={
        <H2HSection
          race={race}
          selectedSession={selectedSession}
          editingSession={h2hEditingSession}
          onEditingSessionChange={setH2hEditingSession}
          onEditingDirtyChange={setH2hHasUnsavedChanges}
          hasUnsavedEditingChanges={h2hHasUnsavedChanges}
          showRandomizeButton={!hasH2HPredictions}
          hasPredictions={!!hasPredictions}
          hasH2HPredictions={hasH2HPredictions}
        />
      }
      h2hResultsContent={
        <H2HResultsSection
          raceId={race._id}
          selectedSession={selectedSession}
        />
      }
    />
  );
}
