import { useAuth } from '@clerk/react';
import { api } from '@convex-generated/api';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { Dices } from 'lucide-react';
import { useState } from 'react';

import { useUpcomingPredictionBannerDismissal } from '../../hooks/useUpcomingPredictionBannerDismissal';
import type { SessionType } from '../../lib/sessions';
import { toUserFacingMessage } from '../../lib/userFacingError';
import { ConfirmDialog } from '../ConfirmDialog';
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
  const matchups = useQuery(
    api.h2h.getMatchupsForSeason,
    isSignedIn ? {} : 'skip',
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
      matchups,
    } as const;
  }

  return {
    isVisible: true,
    activeRace,
    hasCompleteUpcomingPredictions,
    shouldShowH2HNudge,
    dismiss,
    matchups,
  } as const;
}

export function UpcomingPredictionBanner() {
  const navigate = useNavigate();
  const [showConfirm, setShowConfirm] = useState(false);
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const randomizePredictions = useMutation(
    api.predictions.randomizePredictions,
  );
  const submitH2H = useMutation(api.h2h.submitH2HPredictions);
  const bannerState = useUpcomingPredictionBannerState();

  if (!bannerState.isVisible) {
    return null;
  }

  const { activeRace, shouldShowH2HNudge, dismiss, matchups } = bannerState;
  const needsTop5 = !shouldShowH2HNudge;
  const needsH2H = true;
  const nudgeMessage = shouldShowH2HNudge
    ? 'Your Top 5 picks were recorded. You still need to submit your remaining H2H picks before each session starts.'
    : 'No predictions yet. Make your weekend picks now and adjust them any time before each session starts.';
  const randomizeLabel = shouldShowH2HNudge
    ? 'Randomize H2H'
    : 'Quick randomize';
  const confirmTitle = shouldShowH2HNudge
    ? 'Randomize H2H Predictions'
    : 'Randomize Predictions';
  const confirmDescription = shouldShowH2HNudge
    ? 'This will randomly select your Head-to-Head picks for all open sessions this weekend. You can edit picks afterwards.'
    : 'This will randomly select your Top 5 and Head-to-Head picks for all open sessions this weekend. You can edit picks afterwards.';

  async function handleRandomize() {
    setError(null);
    setIsRandomizing(true);
    try {
      if (needsTop5) {
        await randomizePredictions({ raceId: activeRace._id });
      }
      if (needsH2H && matchups && matchups.length > 0) {
        const randomH2HPicks = matchups.map((m) => ({
          matchupId: m._id,
          predictedWinnerId:
            Math.random() < 0.5 ? m.driver1._id : m.driver2._id,
        }));
        await submitH2H({ raceId: activeRace._id, picks: randomH2HPicks });
      }
      setShowConfirm(false);
      await navigate({
        to: '/races/$raceSlug',
        params: { raceSlug: activeRace.slug },
      });
    } catch (err) {
      setError(toUserFacingMessage(err));
    } finally {
      setIsRandomizing(false);
    }
  }

  return (
    <div>
      <UpcomingPredictionNudge
        raceName={activeRace.name}
        raceSlug={activeRace.slug}
        message={nudgeMessage}
        randomizeLabel={randomizeLabel}
        isRandomizing={isRandomizing}
        error={error}
        onDismiss={dismiss}
        onRandomizeClick={() => {
          setError(null);
          setShowConfirm(true);
        }}
      />
      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleRandomize}
        title={
          <span className="flex items-center gap-2 font-semibold">
            <Dices size={16} className="text-accent" /> {confirmTitle}
          </span>
        }
        description={confirmDescription}
        confirmLabel="Randomize"
        loading={isRandomizing}
        error={error}
      />
    </div>
  );
}
