import { useAuth } from '@clerk/clerk-react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { ConvexHttpClient } from 'convex/browser';
import { useQuery } from 'convex/react';
import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';

import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { InlineLoader } from '../../components/InlineLoader';
import { RaceDetailHeader } from '../../components/RaceDetailHeader';
import { RandomizeButton } from '../../components/RandomizeButton';
import type { SessionType } from '../../lib/sessions';
import { ogBaseUrl } from '../../lib/site';
import {
  H2HResultsSection,
  H2HSection,
  LockedSection,
  NotYetOpenSection,
  ResultsSection,
  Top5PredictionSection,
} from './-race-detail-content';

const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL);

export const Route = createFileRoute('/races/$raceId')({
  component: RaceDetailPage,
  loader: async ({ params }) => {
    const raceId = params.raceId as Id<'races'>;
    const [race, nextRace, predictionOpenAt] = await Promise.all([
      convex.query(api.races.getRace, { raceId }),
      convex.query(api.races.getNextRace),
      convex.query(api.races.getPredictionOpenAt, { raceId }),
    ]);
    return { race, nextRace, predictionOpenAt };
  },
  head: ({ loaderData }) => {
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
      ],
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

function RaceDetailPage() {
  const { race, nextRace, predictionOpenAt } = Route.useLoaderData();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const [top5EditingSession, setTop5EditingSession] =
    useState<SessionType | null>(null);
  const [h2hEditingSession, setH2hEditingSession] =
    useState<SessionType | null>(null);

  const myScore = useQuery(
    api.results.getMyScoreForRace,
    race ? { raceId: race._id } : 'skip',
  );
  const weekendPredictions = useQuery(
    api.predictions.myWeekendPredictions,
    race ? { raceId: race._id } : 'skip',
  );
  const hasMyPicks = myScore && myScore.enrichedBreakdown?.length;
  const hasPredictions =
    weekendPredictions?.predictions &&
    Object.values(weekendPredictions.predictions).some((p) => p !== null);
  const h2hPredictions = useQuery(
    api.h2h.myH2HPredictionsForRace,
    race ? { raceId: race._id } : 'skip',
  );
  const hasH2HPredictions = h2hPredictions
    ? Object.values(h2hPredictions).some((p) => p !== null)
    : false;

  if (race === null) {
    return <RaceNotFound />;
  }

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- nextRace can be null at runtime
  const isNextRace = nextRace && nextRace._id === race._id;
  const isPredictable = race.status === 'upcoming' && isNextRace;
  const isNotYetOpen = race.status === 'upcoming' && !isNextRace;
  const statusStyles = getStatusStyles(isPredictable, race.status);

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-8">
        <BackToRacesLink />

        <div
          className={`overflow-hidden rounded-lg border ${
            isNextRace
              ? 'border-accent/50 bg-surface'
              : 'border-border bg-surface'
          }`}
        >
          <RaceDetailHeader
            race={race}
            isNextRace={isNextRace}
            myScore={myScore ?? undefined}
            hasMyPicks={!!hasMyPicks}
          />

          <div className={`border-t ${statusStyles.border}`}>
            <div className={statusStyles.background}>
              {isPredictable ? (
                weekendPredictions === undefined || !isAuthLoaded ? (
                  <div className="p-4">
                    <InlineLoader />
                  </div>
                ) : (
                  <div className="relative">
                    {isSignedIn &&
                      !h2hEditingSession &&
                      !top5EditingSession &&
                      !hasPredictions && (
                        <div className="absolute top-3 right-2 z-10">
                          <RandomizeButton
                            raceId={race._id}
                            hasPredictions={!!hasPredictions}
                            hasH2HPredictions={hasH2HPredictions}
                          />
                        </div>
                      )}
                    {!h2hEditingSession && (
                      <Top5PredictionSection
                        race={race}
                        editingSession={top5EditingSession}
                        onEditingSessionChange={setTop5EditingSession}
                      />
                    )}
                    {hasPredictions && !top5EditingSession && (
                      <H2HSection
                        race={race}
                        editingSession={h2hEditingSession}
                        onEditingSessionChange={setH2hEditingSession}
                        showRandomizeButton={
                          hasPredictions && !hasH2HPredictions
                        }
                        hasPredictions={!!hasPredictions}
                        hasH2HPredictions={hasH2HPredictions}
                      />
                    )}
                  </div>
                )
              ) : isNotYetOpen ? (
                <NotYetOpenSection
                  predictionOpenAt={predictionOpenAt ?? null}
                />
              ) : race.status === 'locked' ? (
                <LockedSection />
              ) : (
                <>
                  <ResultsSection raceId={race._id} race={race} />
                  <div className="border-t border-border" />
                  <H2HResultsSection raceId={race._id} race={race} />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
