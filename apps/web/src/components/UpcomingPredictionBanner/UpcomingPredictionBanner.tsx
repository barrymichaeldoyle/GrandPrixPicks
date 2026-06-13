import { useAuth } from '@clerk/react';
import { api } from '@convex-generated/api';
import { useLocation } from '@tanstack/react-router';
import { useQuery } from 'convex/react';

import { useUpcomingPredictionBannerDismissal } from '@/hooks/useUpcomingPredictionBannerDismissal';
import type { SessionType } from '@/lib/sessions';
import { UpcomingPredictionNudge } from './UpcomingPredictionNudge';

const SPRINT_SESSIONS = ['sprint_quali', 'sprint', 'quali', 'race'] as const;
const STANDARD_SESSIONS = ['quali', 'race'] as const;
const NUDGE_DELAY_MS = 24 * 60 * 60 * 1000;

export function getOpenUpcomingSessions(params: {
  hasSprint: boolean;
  now: number;
  lockAtBySession: Partial<Record<SessionType, number | undefined>>;
}): SessionType[] {
  const sessions = params.hasSprint
    ? [...SPRINT_SESSIONS]
    : [...STANDARD_SESSIONS];
  return sessions.filter((sessionType) => {
    const lockAt = params.lockAtBySession[sessionType];
    return typeof lockAt !== 'number' || params.now < lockAt;
  });
}

export function shouldDelayUpcomingPredictionBanner(params: {
  predictionOpenAt: number | null;
  shouldShowTop5Nudge: boolean;
  shouldShowH2HNudge: boolean;
  now: number;
}) {
  if (params.shouldShowH2HNudge) {
    return false;
  }
  if (!params.shouldShowTop5Nudge) {
    return false;
  }
  return (
    params.predictionOpenAt != null &&
    params.now < params.predictionOpenAt + NUDGE_DELAY_MS
  );
}

export function shouldShowUpcomingH2HNudge(params: {
  hasAnyTop5Predictions: boolean;
  hasCompleteH2H: boolean;
}) {
  return params.hasAnyTop5Predictions && !params.hasCompleteH2H;
}

export function useUpcomingPredictionBannerState() {
  const { isLoaded, isSignedIn } = useAuth();
  const pathname = useLocation({ select: (location) => location.pathname });

  const nextRace = useQuery(api.races.getNextRace, isSignedIn ? {} : 'skip');
  const predictionOpenAt = useQuery(
    api.races.getPredictionOpenAt,
    isSignedIn && nextRace ? { raceId: nextRace._id } : 'skip',
  );
  const weekendPredictions = useQuery(
    api.predictions.myWeekendPredictions,
    isSignedIn && nextRace ? { raceId: nextRace._id } : 'skip',
  );
  const h2hPredictions = useQuery(
    api.h2h.myH2HPredictionsForRace,
    isSignedIn && nextRace ? { raceId: nextRace._id } : 'skip',
  );
  const currentRace =
    nextRace && nextRace.status === 'upcoming' ? nextRace : null;
  const nudgeKind =
    currentRace &&
    weekendPredictions !== undefined &&
    h2hPredictions !== undefined &&
    shouldShowUpcomingH2HNudge({
      hasAnyTop5Predictions: (currentRace.hasSprint
        ? SPRINT_SESSIONS
        : STANDARD_SESSIONS
      ).some(
        (sessionType) => weekendPredictions?.predictions[sessionType] != null,
      ),
      hasCompleteH2H: (currentRace.hasSprint
        ? SPRINT_SESSIONS
        : STANDARD_SESSIONS
      ).every((sessionType) => h2hPredictions?.[sessionType] != null),
    })
      ? 'h2h'
      : 'top5';
  const { dismissed, dismiss } = useUpcomingPredictionBannerDismissal(
    currentRace?.slug,
    nudgeKind,
  );

  if (!isLoaded || !isSignedIn) {
    return {
      isVisible: false,
      hasCompleteUpcomingPredictions: false,
    } as const;
  }

  if (
    nextRace === undefined ||
    predictionOpenAt === undefined ||
    weekendPredictions === undefined ||
    h2hPredictions === undefined
  ) {
    return {
      isVisible: false,
      hasCompleteUpcomingPredictions: false,
    } as const;
  }

  if (!currentRace) {
    return {
      isVisible: false,
      hasCompleteUpcomingPredictions: false,
    } as const;
  }
  const activeRace = currentRace;
  const now = Date.now();

  const relevantSessions = activeRace.hasSprint
    ? getOpenUpcomingSessions({
        hasSprint: true,
        now,
        lockAtBySession: {
          quali: activeRace.qualiLockAt,
          sprint_quali: activeRace.sprintQualiLockAt,
          sprint: activeRace.sprintLockAt,
          race: activeRace.predictionLockAt,
        },
      })
    : getOpenUpcomingSessions({
        hasSprint: false,
        now,
        lockAtBySession: {
          quali: activeRace.qualiLockAt,
          race: activeRace.predictionLockAt,
        },
      });
  const hasAnyTop5Predictions = relevantSessions.some(
    (sessionType) => weekendPredictions?.predictions[sessionType] != null,
  );
  const hasCompleteH2H = relevantSessions.every(
    (sessionType) => h2hPredictions?.[sessionType] != null,
  );
  const hasCompleteUpcomingPredictions =
    relevantSessions.length > 0 && hasAnyTop5Predictions && hasCompleteH2H;
  const racePath = `/races/${activeRace.slug}`;
  const isOnRacePredictionPage =
    pathname === racePath || pathname.startsWith(`${racePath}/`);
  const shouldShowTop5Nudge = !hasAnyTop5Predictions;
  const shouldShowH2HNudge = shouldShowUpcomingH2HNudge({
    hasAnyTop5Predictions,
    hasCompleteH2H,
  });
  const shouldDelayBanner = shouldDelayUpcomingPredictionBanner({
    predictionOpenAt,
    shouldShowTop5Nudge,
    shouldShowH2HNudge,
    now,
  });

  if (
    (!shouldShowTop5Nudge && !shouldShowH2HNudge) ||
    isOnRacePredictionPage ||
    shouldDelayBanner ||
    dismissed
  ) {
    return {
      isVisible: false,
      activeRace,
      hasCompleteUpcomingPredictions,
      shouldShowH2HNudge,
      dismiss,
    } as const;
  }

  return {
    isVisible: true,
    activeRace,
    hasCompleteUpcomingPredictions,
    shouldShowH2HNudge,
    dismiss,
  } as const;
}

export function UpcomingPredictionBanner() {
  const { isSignedIn } = useAuth();
  const pathname = useLocation({ select: (location) => location.pathname });
  const profileUsername = pathname.match(/^\/p\/([^/]+)/)?.[1];
  // Avoid mounting the inner banner, and its prediction queries, on routes
  // where a "go make picks" nudge is out of context.
  const viewer = useQuery(
    api.users.me,
    isSignedIn && profileUsername != null ? {} : 'skip',
  );

  if (pathname.startsWith('/settings') || pathname.startsWith('/pricing')) {
    return null;
  }

  if (profileUsername != null) {
    if (viewer === undefined) {
      return null;
    }

    if (viewer == null || profileUsername !== viewer.username) {
      return null;
    }
  }

  // On /feed at lg+, the sidebar already surfaces a next-race card, so suppress
  // the banner there to avoid duplicating the same CTA.
  if (pathname === '/feed' || pathname.startsWith('/feed/')) {
    return (
      <div className="lg:hidden">
        <UpcomingPredictionBannerInner />
      </div>
    );
  }

  return <UpcomingPredictionBannerInner />;
}

function UpcomingPredictionBannerInner() {
  const bannerState = useUpcomingPredictionBannerState();

  if (!bannerState.isVisible) {
    return null;
  }

  const { activeRace, shouldShowH2HNudge, dismiss } = bannerState;
  const ctaLabel = shouldShowH2HNudge ? 'Submit H2H' : 'Make picks';

  return (
    <UpcomingPredictionNudge
      raceName={activeRace.name}
      raceSlug={activeRace.slug}
      ctaLabel={ctaLabel}
      onDismiss={dismiss}
    />
  );
}
