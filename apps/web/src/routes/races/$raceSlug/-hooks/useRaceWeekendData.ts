import { api } from '@convex-generated/api';
import type { Doc } from '@convex-generated/dataModel';
import { getRaceTimeZoneFromSlug } from '@grandprixpicks/shared/raceTimezones';
import { useQuery } from 'convex/react';

import { fromRaceDetail } from '@/components/RaceScoreCard/adapters';
import type { WeekendCardData } from '@/components/RaceScoreCard/types';
import {
  toPointsBySession,
  useMyH2HScoresBySession,
} from '@/hooks/useMyH2HScoresBySession';
import type { SessionType } from '@/lib/sessions';
import { getSessionsForWeekend } from '@/lib/sessions';
import { useNow } from '@/lib/testing/now';

type UseRaceWeekendDataArgs = {
  race: Doc<'races'> | null;
  isAuthLoaded: boolean;
  isSignedIn: boolean;
};

/**
 * All Convex subscriptions and derived weekend state for the race detail
 * page: the viewer's Top 5 + H2H predictions, published results, scores, and
 * the assembled RaceScoreCard data.
 */
export function useRaceWeekendData({
  race,
  isAuthLoaded,
  isSignedIn,
}: UseRaceWeekendDataArgs) {
  const now = useNow();
  const weekendSessions = getSessionsForWeekend(!!race?.hasSprint);

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

  // Keep the matchups subscription warm at route level: H2HSection (which
  // also queries this) only mounts after Top 5 picks exist, and without the
  // warm cache the Top 5 → H2H chained overlay opens onto a loading spinner.
  useQuery(api.h2h.getMatchupsForSeason, race ? {} : 'skip');
  const h2hPredictions = useQuery(
    api.h2h.myH2HPredictionsForRace,
    race ? { raceId: race._id } : 'skip',
  );
  const {
    pointsBySession: h2hPointsBySession,
    scoresBySession: h2hScoresBySession,
  } = useMyH2HScoresBySession(race?._id);

  const isViewerPredictionDataLoading = Boolean(
    race &&
    isAuthLoaded &&
    isSignedIn &&
    (weekendPredictions == null || h2hPredictions == null),
  );

  const hasPredictions = Boolean(
    weekendPredictions?.predictions &&
    Object.values(weekendPredictions.predictions).some((p) => p !== null),
  );
  const hasH2HPredictions = h2hPredictions
    ? Object.values(h2hPredictions).some((p) => p !== null)
    : false;
  const hasPublishedResults = (availableSessions?.length ?? 0) > 0;
  const publishedSessionSet = new Set(availableSessions ?? []);
  const top5PointsBySession = toPointsBySession(scores);
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

  let cardData: WeekendCardData | null = null;
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
      now,
    });
    if (raceRank) {
      data.raceRank = raceRank;
    }
    cardData = data;
  }

  const trackTimeZone =
    race?.timeZone ??
    (race ? getRaceTimeZoneFromSlug(race.slug) : undefined) ??
    'UTC';

  // Single source of truth for the two-step picks flow (tab labels, the
  // "n of 2 done" header, and the step badges all derive from these).
  function isTop5SavedForSession(session: SessionType): boolean {
    return weekendPredictions?.predictions?.[session] != null;
  }
  function isH2HSavedForSession(session: SessionType): boolean {
    return h2hPredictions?.[session] != null;
  }

  return {
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
  };
}
