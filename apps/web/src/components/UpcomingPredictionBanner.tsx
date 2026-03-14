import { useAuth } from '@clerk/react';
import { api } from '@convex-generated/api';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { ArrowRight, Dices } from 'lucide-react';
import { useState } from 'react';

import { useUpcomingPredictionBannerDismissal } from '../hooks/useUpcomingPredictionBannerDismissal';
import { toUserFacingMessage } from '../lib/userFacingError';
import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';
import { UpcomingPredictionNudge } from './UpcomingPredictionNudge';

const SPRINT_SESSIONS = ['sprint_quali', 'sprint', 'quali', 'race'] as const;
const STANDARD_SESSIONS = ['quali', 'race'] as const;
const NUDGE_DELAY_MS = 24 * 60 * 60 * 1000;

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

export function UpcomingPredictionBanner() {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  const [showConfirm, setShowConfirm] = useState(false);
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
  const randomizePredictions = useMutation(
    api.predictions.randomizePredictions,
  );
  const submitH2H = useMutation(api.h2h.submitH2HPredictions);
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
    return null;
  }

  if (
    nextRace === undefined ||
    predictionOpenAt === undefined ||
    weekendPredictions === undefined ||
    h2hPredictions === undefined
  ) {
    return null;
  }

  if (!currentRace) {
    return null;
  }
  const activeRace = currentRace;

  const racePath = `/races/${activeRace.slug}`;
  const isOnRacePredictionPage =
    pathname === racePath || pathname.startsWith(`${racePath}/`);
  const relevantSessions = activeRace.hasSprint
    ? SPRINT_SESSIONS
    : STANDARD_SESSIONS;
  const hasAnyTop5Predictions = relevantSessions.some(
    (sessionType) => weekendPredictions?.predictions[sessionType] != null,
  );
  const hasCompleteH2H = relevantSessions.every(
    (sessionType) => h2hPredictions?.[sessionType] != null,
  );
  const shouldShowTop5Nudge = !hasAnyTop5Predictions;
  const shouldShowH2HNudge = shouldShowUpcomingH2HNudge({
    hasAnyTop5Predictions,
    hasCompleteH2H,
  });
  const shouldDelayBanner = shouldDelayUpcomingPredictionBanner({
    predictionOpenAt,
    shouldShowTop5Nudge,
    shouldShowH2HNudge,
    now: Date.now(),
  });

  if (
    (!shouldShowTop5Nudge && !shouldShowH2HNudge) ||
    isOnRacePredictionPage ||
    shouldDelayBanner ||
    dismissed
  ) {
    return null;
  }

  const needsTop5 = shouldShowTop5Nudge;
  const needsH2H = shouldShowTop5Nudge || shouldShowH2HNudge;
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
        makePicksControl={
          <Button asChild size="sm" rightIcon={ArrowRight}>
            <Link to="/races/$raceSlug" params={{ raceSlug: activeRace.slug }}>
              Make picks
            </Link>
          </Button>
        }
      />
      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => void handleRandomize()}
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
