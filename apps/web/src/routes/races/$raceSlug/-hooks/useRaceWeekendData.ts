import { api } from '@convex-generated/api';
import type { Doc } from '@convex-generated/dataModel';
import { getRaceTimeZoneFromSlug } from '@grandprixpicks/shared/raceTimezones';
import { useQuery } from '@/integrations/convex/query';
import { useConvexAuth } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';

import { fromRaceDetail } from '@/components/RaceScoreCard/adapters';
import type { WeekendCardData } from '@/components/RaceScoreCard/types';
import {
  toPointsBySession,
  useMyH2HScoresBySession,
} from '@/hooks/useMyH2HScoresBySession';
import type { SessionType } from '@/lib/sessions';
import { getSessionsForWeekend } from '@/lib/sessions';
import { useNow } from '@/lib/testing/now';

/**
 * Public, published results resolved in the route loader so a finished race
 * renders its actual finishing order in the server HTML. Used as the initial
 * value for the client Convex subscriptions until they boot (and so crawlers,
 * which never run them, still see the results).
 */
export type RaceWeekendInitialResults = {
  availableSessions: FunctionReturnType<
    typeof api.results.getAllResultsForRace
  >;
  resultsBySession: Partial<
    Record<SessionType, FunctionReturnType<typeof api.results.getResultForRace>>
  >;
};

type UseRaceWeekendDataArgs = {
  race: Doc<'races'> | null;
  isAuthLoaded: boolean;
  isSignedIn: boolean;
  initialResults?: RaceWeekendInitialResults;
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
  initialResults,
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
  const availableSessions =
    useQuery(
      api.results.getAllResultsForRace,
      race ? { raceId: race._id } : 'skip',
    ) ?? initialResults?.availableSessions;
  // Pinned to this race's round, so a past race shows the grid that raced it
  // rather than today's: a driver who has since changed teams keeps the team
  // he drove for here, and a stand-in stays visible on the rounds he covered.
  const drivers = useQuery(
    api.drivers.listDrivers,
    race
      ? { round: race.round, season: race.season, includeNotRacing: true }
      : 'skip',
  );
  const raceRank = useQuery(
    api.results.getRaceRank,
    race ? { raceId: race._id } : 'skip',
  );
  const liveSnapshot = useQuery(
    api.liveScoring.getActiveSnapshot,
    race ? { raceId: race._id } : 'skip',
  );

  // Per-session results (fetch when available). Fall back to the loader-seeded
  // result so the finishing order is present during SSR / before the client
  // subscription resolves.
  const qualiResult =
    useQuery(
      api.results.getResultForRace,
      race && availableSessions?.includes('quali')
        ? { raceId: race._id, sessionType: 'quali' as const }
        : 'skip',
    ) ?? initialResults?.resultsBySession?.quali;
  const sprintQualiResult =
    useQuery(
      api.results.getResultForRace,
      race && availableSessions?.includes('sprint_quali')
        ? { raceId: race._id, sessionType: 'sprint_quali' as const }
        : 'skip',
    ) ?? initialResults?.resultsBySession?.sprint_quali;
  const sprintResult =
    useQuery(
      api.results.getResultForRace,
      race && availableSessions?.includes('sprint')
        ? { raceId: race._id, sessionType: 'sprint' as const }
        : 'skip',
    ) ?? initialResults?.resultsBySession?.sprint;
  const raceResult =
    useQuery(
      api.results.getResultForRace,
      race && availableSessions?.includes('race')
        ? { raceId: race._id, sessionType: 'race' as const }
        : 'skip',
    ) ?? initialResults?.resultsBySession?.race;

  // Keep the matchups subscription warm at route level: H2HSection (which
  // also queries this) only mounts after Top 5 picks exist, and without the
  // warm cache the Top 5 → H2H chained overlay opens onto a loading spinner.
  useQuery(
    api.h2h.getMatchupsForSeason,
    race ? { round: race.round, season: race.season } : 'skip',
  );
  const h2hPredictions = useQuery(
    api.h2h.myH2HPredictionsForRace,
    race ? { raceId: race._id } : 'skip',
  );
  const {
    pointsBySession: h2hPointsBySession,
    scoresBySession: h2hScoresBySession,
  } = useMyH2HScoresBySession(race?._id);

  /**
   * Whether the viewer's own picks are still on their way.
   *
   * The point of this flag is to hold the body on a loader rather than flash
   * "make your picks" at somebody who has already made them. What it must not
   * do is hold there forever, and the earlier version could: it asked
   * `weekendPredictions == null`, which is true both while the subscription
   * has not answered *and* once it has answered `null`.
   *
   * Those are different facts. `undefined` means no answer yet. `null` is an
   * answer, and both viewer queries return it on exactly one path -- `getViewer`
   * finding nobody -- so it means "Convex does not know who you are". Clerk
   * signing in on the client and Convex's socket carrying an identity are two
   * separate events, and between them these queries legitimately answer `null`.
   * Treating that answer as "still loading" meant that if the second event
   * never arrived, the page sat on a spinner under a header showing the
   * viewer's own avatar, with nothing left to wait for.
   *
   * The hung-token case that CI actually hit is fixed upstream of here, in
   * {@link useClerkConvexAuth}: while Clerk's `getToken` never settles, Convex
   * keeps its socket paused and reports `isLoading`, and no amount of care in
   * this file escapes that. What this gate owns is the state on the other side
   * of that deadline -- Convex having decided, wrongly but definitely, that it
   * has no identity -- which is where a page that waits on `null` still hangs.
   *
   * So the wait is now on Convex's auth state, which is the thing actually
   * being waited for, and the queries are read for what they are:
   *
   * - Convex auth still resolving: wait. This is the real gap, and it is the
   *   window the flash guard exists for.
   * - Convex authenticated, queries unanswered: wait.
   * - Convex resolved *unauthenticated* while Clerk says signed in: do not
   *   wait. Something is wrong, but no amount of spinning fixes it, and the
   *   page has public content it can show meanwhile.
   */
  const { isLoading: isConvexAuthLoading, isAuthenticated: isConvexAuthed } =
    useConvexAuth();

  const isViewerPredictionDataLoading = Boolean(
    race &&
    isAuthLoaded &&
    isSignedIn &&
    (isConvexAuthLoading ||
      (isConvexAuthed &&
        (weekendPredictions === undefined || h2hPredictions === undefined))),
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
    liveSnapshot,
    pointsSoFar,
    allEventsScored,
    scoredEventCount,
    isTop5SavedForSession,
    isH2HSavedForSession,
  };
}
