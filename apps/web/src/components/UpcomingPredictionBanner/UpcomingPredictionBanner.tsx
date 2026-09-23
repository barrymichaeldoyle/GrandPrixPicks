import { lazy, Suspense, useEffect, useState } from 'react';
import { PicksFocusOverlay } from '@/components/PicksFocusOverlay';
import { WeekendCardSkeleton } from '@/components/WeekendCardSkeleton';
import { deferUntilAfterLoad } from '@/lib/deferUntilAfterLoad';
import { picksOverlayHeading } from '@/lib/picksOverlayHeading';
import { useAuth } from '@clerk/react';
import { api } from '@convex-generated/api';
import { useLocation } from '@tanstack/react-router';
import { useQuery } from '@/integrations/convex/query';

import { useUpcomingPredictionBannerDismissal } from '@/hooks/useUpcomingPredictionBannerDismissal';
import type { SessionType } from '@/lib/sessions';
import { useNow } from '@/lib/testing/now';
import { UpcomingPredictionNudge } from './UpcomingPredictionNudge';

let picksModalModule: Promise<typeof import('./UpcomingPicksModal')> | null =
  null;

function loadPicksModal() {
  picksModalModule ??= import('./UpcomingPicksModal');
  return picksModalModule;
}

const UpcomingPicksModal = lazy(() =>
  loadPicksModal().then((module) => ({
    default: module.UpcomingPicksModal,
  })),
);

const UpcomingPicksPrefetch = lazy(() =>
  loadPicksModal().then((module) => ({
    default: module.UpcomingPicksPrefetch,
  })),
);

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

function useUpcomingPredictionBannerState() {
  const { isLoaded, isSignedIn } = useAuth();
  const now = useNow(30_000);
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

  // The authenticated home owns the complete current-weekend state and CTA.
  // A second global prompt above it would duplicate the page's primary action.
  if (pathname === '/') {
    return null;
  }

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

  // The /feed carve-out that used to live here is gone with the page: it
  // suppressed the banner at lg+ because FeedSidebar surfaced the same
  // next-race CTA, and neither the sidebar nor the page exists now.
  // `/feed/$feedEventId` is a single event with no rail, so it gets the banner
  // like everywhere else.
  return <UpcomingPredictionBannerInner />;
}

function UpcomingPredictionBannerInner() {
  const bannerState = useUpcomingPredictionBannerState();

  const [pickerRace, setPickerRace] = useState<{
    slug: string;
    step: 'top5' | 'h2h';
  } | null>(null);
  // Set when a player reaches for the CTA (hover, focus, touch). Mounting the
  // prefetch then starts the picker's reads a few hundred milliseconds before
  // the tap, which is most of what the loading shell used to wait on.
  const [intent, setIntent] = useState(false);

  // The picker's code is fetched once the page has settled, so the first tap
  // does not wait on a chunk as well as on data.
  useEffect(() => {
    if (!bannerState.isVisible) {
      return;
    }
    return deferUntilAfterLoad(() => void loadPicksModal());
  }, [bannerState.isVisible]);

  if (!bannerState.isVisible && !pickerRace) {
    return null;
  }

  const { activeRace, shouldShowH2HNudge, dismiss } = bannerState;
  const ctaLabel = shouldShowH2HNudge ? 'Submit H2H' : 'Make picks';

  return (
    <>
      {bannerState.isVisible && activeRace && (
        <UpcomingPredictionNudge
          raceName={activeRace.name}
          raceSlug={activeRace.slug}
          ctaLabel={ctaLabel}
          onDismiss={dismiss}
          onIntent={() => setIntent(true)}
          onMakePicks={() =>
            setPickerRace({
              slug: activeRace.slug,
              step: shouldShowH2HNudge ? 'h2h' : 'top5',
            })
          }
        />
      )}
      {intent && !pickerRace && (
        <Suspense fallback={null}>
          <UpcomingPicksPrefetch />
        </Suspense>
      )}
      {pickerRace && (
        <Suspense
          fallback={
            <PicksFocusOverlay
              open
              onClose={() => setPickerRace(null)}
              {...picksOverlayHeading(pickerRace.step)}
            >
              <WeekendCardSkeleton />
            </PicksFocusOverlay>
          }
        >
          <UpcomingPicksModal
            raceSlug={pickerRace.slug}
            step={pickerRace.step}
            onClose={() => setPickerRace(null)}
          />
        </Suspense>
      )}
    </>
  );
}
