import { useAuth } from '@clerk/clerk-react';
import { Link, useLocation, useNavigate } from '@tanstack/react-router';
import { useMutation, useQuery } from 'convex/react';
import { ArrowRight, Dices, Flag, Sparkles } from 'lucide-react';
import { useState } from 'react';

import { api } from '../../convex/_generated/api';
import { toUserFacingMessage } from '../lib/userFacingError';
import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';

const SPRINT_SESSIONS = ['sprint_quali', 'sprint', 'quali', 'race'] as const;
const STANDARD_SESSIONS = ['quali', 'race'] as const;

export function UpcomingPredictionBanner() {
  const { isLoaded, isSignedIn } = useAuth();
  const navigate = useNavigate();
  const pathname = useLocation({ select: (location) => location.pathname });
  const [showConfirm, setShowConfirm] = useState(false);
  const [isRandomizing, setIsRandomizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nextRace = useQuery(api.races.getNextRace, isSignedIn ? {} : 'skip');
  const matchups = useQuery(
    api.h2h.getMatchupsForSeason,
    isSignedIn ? {} : 'skip',
  );
  const weekendPredictions = useQuery(
    api.predictions.myWeekendPredictions,
    isSignedIn && nextRace ? { raceId: nextRace._id } : 'skip',
  );
  const randomizePredictions = useMutation(api.predictions.randomizePredictions);
  const submitH2H = useMutation(api.h2h.submitH2HPredictions);

  if (!isLoaded || !isSignedIn) {
    return null;
  }

  if (nextRace === undefined || weekendPredictions === undefined) {
    return null;
  }

  if (!nextRace || nextRace.status !== 'upcoming') {
    return null;
  }

  const racePath = `/races/${nextRace.slug}`;
  const isOnRacePredictionPage =
    pathname === racePath || pathname.startsWith(`${racePath}/`);

  const relevantSessions = nextRace.hasSprint
    ? SPRINT_SESSIONS
    : STANDARD_SESSIONS;
  const hasAnyPredictions = relevantSessions.some(
    (sessionType) => weekendPredictions?.predictions[sessionType] != null,
  );

  if (hasAnyPredictions || isOnRacePredictionPage) {
    return null;
  }

  const handleRandomize = async () => {
    setError(null);
    setIsRandomizing(true);
    try {
      await randomizePredictions({ raceId: nextRace._id });
      if (matchups && matchups.length > 0) {
        const randomH2HPicks = matchups.map((m) => ({
          matchupId: m._id,
          predictedWinnerId:
            Math.random() < 0.5 ? m.driver1._id : m.driver2._id,
        }));
        await submitH2H({ raceId: nextRace._id, picks: randomH2HPicks });
      }
      setShowConfirm(false);
      await navigate({
        to: '/races/$raceSlug',
        params: { raceSlug: nextRace.slug },
      });
    } catch (err) {
      setError(toUserFacingMessage(err));
    } finally {
      setIsRandomizing(false);
    }
  };

  return (
    <div className="border-b border-border bg-page px-4 py-3">
      <div className="mx-auto max-w-7xl">
        <div className="overflow-hidden rounded-xl border border-accent/20 bg-surface shadow-sm">
          <div className="bg-gradient-to-r from-accent-muted/70 via-surface to-surface p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="mb-1 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-surface px-2.5 py-1 text-xs font-semibold text-accent">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  Weekend picks are open
                </p>
                <p className="truncate text-sm font-semibold text-text sm:text-base">
                  {nextRace.name}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-xs text-text-muted">
                  <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                  You haven&apos;t made any predictions yet.
                </p>
                {error && <p className="mt-1 text-xs text-error">{error}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Button asChild size="sm" rightIcon={ArrowRight}>
                  <Link to="/races/$raceSlug" params={{ raceSlug: nextRace.slug }}>
                    Make picks
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  leftIcon={Dices}
                  disabled={isRandomizing}
                  onClick={() => {
                    setError(null);
                    setShowConfirm(true);
                  }}
                >
                  {isRandomizing ? 'Randomizing...' : 'Quick randomize'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => void handleRandomize()}
        title={
          <span className="flex items-center gap-2 font-semibold">
            <Dices size={16} className="text-accent" /> Randomize Predictions
          </span>
        }
        description="This will randomly select your Top 5 and Head-to-Head picks for all open sessions this weekend. You can edit picks afterwards."
        confirmLabel="Randomize"
        loading={isRandomizing}
        error={error}
      />
    </div>
  );
}
