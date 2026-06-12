import { useAuth } from '@clerk/react';
import { api } from '@convex-generated/api';
import { getRaceTimeZoneFromSlug } from '@grandprixpicks/shared/raceTimezones';
import {
  createFileRoute,
  Link,
  notFound,
  redirect,
} from '@tanstack/react-router';
import { ConvexHttpClient } from 'convex/browser';
import { useQuery } from 'convex/react';
import { ArrowLeft, Trophy } from 'lucide-react';
import { useEffect, useState } from 'react';

import { Button } from '../../../components/Button/Button';
import { DevNowPanel } from '../../../components/DevNowPanel';
import {
  toPointsBySession,
  useMyH2HScoresBySession,
} from '../../../hooks/useMyH2HScoresBySession';
import { fromRaceDetail } from '../../../components/RaceScoreCard/adapters';
import { RandomizeButton } from '../../../components/RandomizeButton';
import { Tooltip } from '../../../components/Tooltip';
import {
  getRaceSessionLockAt,
  getRaceSessionStartAt,
} from '../../../lib/raceSessions';
import type { SessionType } from '../../../lib/sessions';
import {
  getSessionsForWeekend,
  SESSION_LABELS,
  SESSION_LABELS_SHORT,
} from '../../../lib/sessions';
import { SHOW_DEV_TIME_CONTROLS } from '../../../lib/devFlags';
import {
  encodeShareCardSearch,
  parseShareCard,
} from '../../../lib/og/shareCard';
import {
  canonicalMeta,
  defaultOgImage,
  shareCardOgImageUrl,
  siteConfig,
} from '../../../lib/site';
import { useNow } from '../../../lib/testing/now';
import { RaceEventPage } from './-components/RaceEventPage/RaceEventPage';

const convex = new ConvexHttpClient(import.meta.env.VITE_CONVEX_URL);

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
  loader: async ({ params, location, deps }) => {
    const [race, nextRace] = await Promise.all([
      convex.query(api.races.getRaceBySlugOrLegacyRef, {
        ref: params.raceSlug,
      }),
      convex.query(api.races.getNextRace),
    ]);
    if (!race) {
      throw notFound();
    }
    if (race && race.slug !== params.raceSlug) {
      throw redirect({
        to: '/races/$raceSlug',
        params: { raceSlug: race.slug },
        search: location.search,
      });
    }
    const shareCard =
      'share' in deps
        ? parseShareCard({ ...deps, session: deps.shareSession })
        : null;
    return { race, nextRace, shareCard };
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
          ? `${race.name} Predictions | Grand Prix Picks`
          : 'Race Predictions | Grand Prix Picks';
    const description =
      race && shareCard?.variant === 'result'
        ? `Official ${SESSION_LABELS[shareCard.session].toLowerCase()} top 5 for the ${race.name}.`
        : race &&
            (shareCard?.variant === 'h2h_result' ||
              shareCard?.variant === 'h2h_score')
          ? `${SESSION_LABELS[shareCard.session]} teammate Head-to-Head results for the ${race.name}.`
          : race
            ? `Pick your top 5 finishers for the ${race.name}. Earn up to 25 points per session and compete on the season leaderboard.`
            : 'Pick your top 5 finishers for this Grand Prix. Earn up to 25 points per session and compete on the season leaderboard.';
    const canonical = canonicalMeta(`/races/${params.raceSlug}`);
    const scripts: { type: string; children: string }[] = [];
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
  const { race, nextRace } = Route.useLoaderData();
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const { from } = search;
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const now = useNow();
  const weekendSessions = getSessionsForWeekend(!!race?.hasSprint);
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
  // Keep the matchups subscription warm at route level: H2HSection (which
  // also queries this) only mounts after Top 5 picks exist, and without the
  // warm cache the Top 5 → H2H chained overlay opens onto a loading spinner.
  useQuery(api.h2h.getMatchupsForSeason, race ? {} : 'skip');
  const h2hPredictions = useQuery(
    api.h2h.myH2HPredictionsForRace,
    race ? { raceId: race._id } : 'skip',
  );
  const { pointsBySession: h2hPointsBySession } = useMyH2HScoresBySession(
    race?._id,
  );

  const isViewerPredictionDataLoading = Boolean(
    race &&
    isAuthLoaded &&
    isSignedIn &&
    (weekendPredictions == null || h2hPredictions == null),
  );

  const hasPredictions =
    weekendPredictions?.predictions &&
    Object.values(weekendPredictions.predictions).some((p) => p !== null);
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
      now,
    });
    if (raceRank) {
      data.raceRank = raceRank;
    }
    cardData = data;
  }
  const hasSprintWeekend = race?.hasSprint ?? false;
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
        isAuthLoaded={isAuthLoaded}
        isSignedIn={!!isSignedIn}
        isPredictionsLoading={
          (isPredictable && weekendPredictions === undefined) ||
          isViewerPredictionDataLoading
        }
        isViewerPredictionDataLoading={isViewerPredictionDataLoading}
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
        trackTimeZone={trackTimeZone}
        getSessionStartAt={getSessionStartAt}
        getSessionLockAt={getSessionLockAt}
        isSessionPublished={(session) => publishedSessionSet.has(session)}
        top5SelectedSessionDone={isTop5SavedForSession(selectedSession)}
        h2hSelectedSessionDone={isH2HSavedForSession(selectedSession)}
        cardData={cardData}
        top5EditingSession={top5EditingSession}
        onTop5EditingSessionChange={setTop5EditingSession}
        top5HasUnsavedChanges={top5HasUnsavedChanges}
        onTop5DirtyChange={setTop5HasUnsavedChanges}
        h2hEditingSession={h2hEditingSession}
        onH2HEditingSessionChange={setH2hEditingSession}
        h2hHasUnsavedChanges={h2hHasUnsavedChanges}
        onH2HDirtyChange={setH2hHasUnsavedChanges}
        existingTop5PicksBySession={weekendPredictions?.predictions}
        randomizeControl={
          <RandomizeButton
            raceId={race._id}
            hasPredictions={!!hasPredictions}
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
