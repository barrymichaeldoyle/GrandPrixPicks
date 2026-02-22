import { useAuth } from '@clerk/clerk-react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ConvexHttpClient } from 'convex/browser';
import { useQuery } from 'convex/react';
import { ArrowLeft, ArrowLeft as ArrowLeftIcon, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { api } from '../../../convex/_generated/api';
import { Button } from '../../components/Button';
import { ErrorBoundary } from '../../components/ErrorBoundary';
import { InlineLoader } from '../../components/InlineLoader';
import { PredictionForm } from '../../components/PredictionForm';
import { RaceDetailHeader } from '../../components/RaceDetailHeader';
import { fromRaceDetail, RaceScoreCard } from '../../components/RaceScoreCard';
import { RandomizeButton } from '../../components/RandomizeButton';
import { Tooltip } from '../../components/Tooltip';
import type { SessionType } from '../../lib/sessions';
import {
  getSessionsForWeekend,
  SESSION_LABELS,
  SESSION_LABELS_SHORT,
} from '../../lib/sessions';
import { canonicalMeta, ogBaseUrl, siteConfig } from '../../lib/site';
import { H2HResultsSection, H2HSection } from './-race-detail-content';

const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL);

export const Route = createFileRoute('/races/$raceSlug')({
  component: RaceDetailPage,
  loader: async ({ params }) => {
    const [race, nextRace] = await Promise.all([
      convex.query(api.races.getRaceBySlug, { slug: params.raceSlug }),
      convex.query(api.races.getNextRace),
    ]);
    return { race, nextRace };
  },
  head: ({ loaderData, params }) => {
    const race = loaderData?.race;
    const ogImage = race
      ? `${ogBaseUrl}/og/race/${race._id}.png`
      : `${ogBaseUrl}/og/home.png`;
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

function BackToRacesLink({ className }: { className?: string }) {
  return (
    <Link
      to="/races"
      className={`inline-flex items-center gap-2 pr-1 text-text-muted transition-colors hover:text-text ${className ?? 'mb-4 sm:mb-6'}`}
    >
      <ArrowLeft size={20} />
      Back to races
    </Link>
  );
}

function RaceNotFound() {
  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-4xl p-4">
        <BackToRacesLink className="mb-8" />
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

function getStatusStyles(
  isPredictable: boolean,
  status: string,
): { border: string; background: string } {
  if (isPredictable) {
    return { border: 'border-accent/40', background: 'bg-surface' };
  }
  if (status === 'locked') {
    return { border: 'border-warning/40', background: 'bg-warning-muted' };
  }
  return { border: 'border-border', background: 'bg-surface' };
}

function isSessionType(value: string | null): value is SessionType {
  return (
    value === 'quali' ||
    value === 'sprint_quali' ||
    value === 'sprint' ||
    value === 'race'
  );
}

function RaceDetailPage() {
  const { race, nextRace } = Route.useLoaderData();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const now = Date.now();
  const weekendSessions = getSessionsForWeekend(!!race?.hasSprint);
  const getSessionLockAt = (session: SessionType): number => {
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
  };
  const nextOpenSession = weekendSessions.find(
    (session) => now < getSessionLockAt(session),
  );
  const defaultSession: SessionType =
    nextOpenSession ?? weekendSessions[weekendSessions.length - 1];
  const sessionFromUrl = (() => {
    if (typeof window === 'undefined') {
      return null;
    }
    const raw = new URLSearchParams(window.location.search).get('session');
    return isSessionType(raw) && weekendSessions.includes(raw) ? raw : null;
  })();
  const [selectedSession, setSelectedSession] = useState<SessionType>(
    sessionFromUrl ?? defaultSession,
  );
  const [top5EditingSession, setTop5EditingSession] =
    useState<SessionType | null>(null);
  const [h2hEditingSession, setH2hEditingSession] =
    useState<SessionType | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const current = params.get('session');
    if (current === selectedSession) {
      return;
    }
    params.set('session', selectedSession);
    const nextSearch = params.toString();
    const nextUrl = `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ''}${window.location.hash}`;
    window.history.replaceState(window.history.state, '', nextUrl);
  }, [selectedSession]);

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
  const resultsBySession = useMemo(() => {
    const map: Partial<
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
      map.quali = qualiResult;
    }
    if (sprintQualiResult !== undefined) {
      map.sprint_quali = sprintQualiResult;
    }
    if (sprintResult !== undefined) {
      map.sprint = sprintResult;
    }
    if (raceResult !== undefined) {
      map.race = raceResult;
    }
    return map;
  }, [qualiResult, sprintQualiResult, sprintResult, raceResult]);

  const cardData = useMemo(() => {
    if (!race) {
      return null;
    }
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
    return data;
  }, [
    race,
    weekendPredictions,
    scores,
    actualTop5BySession,
    resultsBySession,
    drivers,
    availableSessions,
    predictionOpenAt,
    raceRank,
  ]);
  const selectedSessionCardData = useMemo(() => {
    if (!cardData) {
      return null;
    }
    const sessions = { ...cardData.sessions };
    for (const session of weekendSessions) {
      if (session !== selectedSession) {
        sessions[session] = null;
      }
    }
    return { ...cardData, sessions };
  }, [cardData, weekendSessions, selectedSession]);

  if (race === null) {
    return <RaceNotFound />;
  }

  const isNextRace = Boolean(nextRace && nextRace._id === race._id);
  const isPredictable = race.status === 'upcoming' && isNextRace;
  const statusStyles = getStatusStyles(isPredictable, race.status);

  // ─── Top 5 editing flow ───
  const renderTop5EditForm = () => {
    if (!top5EditingSession) {
      return null;
    }
    return (
      <div className="space-y-4 p-4">
        <button
          type="button"
          onClick={() => setTop5EditingSession(null)}
          className="inline-flex items-center gap-2 text-sm font-medium text-text-muted transition-colors hover:text-text"
        >
          <ArrowLeftIcon size={18} />
          Back to summary
        </button>
        <h3 className="text-lg font-semibold text-text">
          Top 5 - Edit {SESSION_LABELS[top5EditingSession]}
        </h3>
        <PredictionForm
          raceId={race._id}
          sessionType={top5EditingSession}
          existingPicks={
            weekendPredictions?.predictions[top5EditingSession] ?? undefined
          }
          onSuccess={() => setTop5EditingSession(null)}
        />
      </div>
    );
  };

  // ─── Initial prediction form (no picks yet, signed in) ───
  const renderInitialForm = () => {
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
          {race.hasSprint
            ? 'Qualifying, Sprint Qualifying, Sprint, and Race'
            : 'Qualifying and Race'}
          . You can fine-tune individual sessions after submitting.
        </p>
        <PredictionForm raceId={race._id} />
      </div>
    );
  };

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
        <BackToRacesLink />

        <div
          className={`overflow-hidden rounded-lg border ${
            isNextRace
              ? 'border-accent/50 bg-surface'
              : 'border-border bg-surface'
          }`}
        >
          <RaceDetailHeader race={race} isNextRace={isNextRace} />
          {hasPublishedResults && (
            <div className="border-t border-border bg-surface px-4 py-3 text-sm">
              <span className="text-text-muted">
                {allEventsScored ? 'Weekend Total' : 'Points So Far'}
              </span>
              <div className="font-bold text-accent">+{pointsSoFar} pts</div>
              {!allEventsScored && (
                <p className="text-xs text-text-muted">
                  {scoredEventCount}/{weekendSessions.length} events scored
                </p>
              )}
            </div>
          )}

          <div className={`border-t ${statusStyles.border}`}>
            <div className={statusStyles.background}>
              {!isAuthLoaded ||
              (isPredictable && weekendPredictions === undefined) ? (
                <div className="p-4">
                  <InlineLoader />
                </div>
              ) : top5EditingSession ? (
                renderTop5EditForm()
              ) : isPredictable && isSignedIn && !hasPredictions ? (
                <div className="relative">
                  {!h2hEditingSession && (
                    <div className="absolute top-3 right-2 z-10">
                      <RandomizeButton
                        raceId={race._id}
                        hasPredictions={!!hasPredictions}
                        hasH2HPredictions={hasH2HPredictions}
                      />
                    </div>
                  )}
                  {!h2hEditingSession && renderInitialForm()}
                </div>
              ) : (
                <div>
                  {/* Top 5 section via RaceScoreCard */}
                  {cardData && !h2hEditingSession && !hasPublishedResults && (
                    <div className="space-y-2 p-4">
                      {isPredictable &&
                        hasPredictions &&
                        weekendSessions.length > 1 && (
                          <div
                            className="mb-2 flex gap-1 rounded-lg border border-border bg-surface-muted/50 p-1"
                            role="tablist"
                            aria-label="Predictions by session"
                          >
                            {weekendSessions.map((session) => (
                              <Button
                                key={session}
                                variant="tab"
                                size="tab"
                                active={selectedSession === session}
                                onClick={() => setSelectedSession(session)}
                                className="flex-1"
                              >
                                <span className="hidden sm:inline">
                                  {SESSION_LABELS[session]}
                                </span>
                                {race.hasSprint ? (
                                  <span className="sm:hidden">
                                    <Tooltip content={SESSION_LABELS[session]}>
                                      <span>
                                        {SESSION_LABELS_SHORT[session]}
                                      </span>
                                    </Tooltip>
                                  </span>
                                ) : (
                                  <span className="sm:hidden">
                                    {SESSION_LABELS[session]}
                                  </span>
                                )}
                              </Button>
                            ))}
                          </div>
                        )}
                      {isPredictable && hasPredictions && (
                        <div className="flex items-center gap-2">
                          <Trophy className="h-5 w-5 shrink-0 text-accent" />
                          <h2 className="text-xl font-semibold text-text">
                            Top 5 Predictions -{' '}
                            {SESSION_LABELS[selectedSession]}
                          </h2>
                        </div>
                      )}
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
                            isPredictable ? setTop5EditingSession : undefined
                          }
                        />
                      </ErrorBoundary>
                    </div>
                  )}

                  {/* H2H section */}
                  {isPredictable && hasPredictions && (
                    <H2HSection
                      race={race}
                      selectedSession={selectedSession}
                      editingSession={h2hEditingSession}
                      onEditingSessionChange={setH2hEditingSession}
                      showRandomizeButton={!hasH2HPredictions}
                      hasPredictions={!!hasPredictions}
                      hasH2HPredictions={hasH2HPredictions}
                    />
                  )}
                  {hasPublishedResults && (
                    <>
                      <div className="border-t border-border" />
                      <H2HResultsSection raceId={race._id} race={race} />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
