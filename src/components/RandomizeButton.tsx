import { useMutation, useQuery } from 'convex/react';
import { Dices } from 'lucide-react';
import posthog from 'posthog-js';
import { useEffect, useState } from 'react';

import { toUserFacingMessage } from '@/lib/userFacingError';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';
import { Tooltip } from './Tooltip';

const NARROW_BREAKPOINT_PX = 500;

interface RandomizeButtonProps {
  raceId: Id<'races'>;
  hasPredictions: boolean;
  hasH2HPredictions: boolean;
}

export function RandomizeButton({
  raceId,
  hasPredictions,
  hasH2HPredictions,
}: RandomizeButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNarrow, setIsNarrow] = useState(
    () =>
      typeof window !== 'undefined' &&
      window.matchMedia(`(max-width: ${NARROW_BREAKPOINT_PX - 1}px)`).matches,
  );

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${NARROW_BREAKPOINT_PX - 1}px)`);
    const handler = () => setIsNarrow(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const matchups = useQuery(api.h2h.getMatchupsForSeason, {});
  const randomizePredictions = useMutation(
    api.predictions.randomizePredictions,
  );
  const submitH2H = useMutation(api.h2h.submitH2HPredictions);

  // Both submitted — hide the button
  if (hasPredictions && hasH2HPredictions) {
    return null;
  }

  const needsTop5 = !hasPredictions;
  const needsH2H = !hasH2HPredictions;
  const dataLoading = matchups === undefined;

  const label = needsTop5
    ? 'Randomize All Predictions'
    : 'Randomize H2H Predictions';

  const description = needsTop5
    ? 'This will randomly select your Top 5 drivers and Head-to-Head picks for all sessions this weekend. You can edit individual sessions afterwards.'
    : 'This will randomly select your Head-to-Head picks for all sessions this weekend. You can edit individual sessions afterwards.';

  async function handleConfirm() {
    if (!matchups) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (needsTop5) {
        await randomizePredictions({ raceId });
      }

      if (needsH2H && matchups.length > 0) {
        const randomH2HPicks = matchups.map((m) => ({
          matchupId: m._id,
          predictedWinnerId:
            Math.random() < 0.5 ? m.driver1._id : m.driver2._id,
        }));
        await submitH2H({ raceId, picks: randomH2HPicks });
      }

      posthog.capture('prediction_randomized', {
        mode: needsTop5 ? 'all' : 'h2h',
      });
      setShowConfirm(false);
    } catch (err) {
      setError(toUserFacingMessage(err));
    } finally {
      setLoading(false);
    }
  }

  const buttonLabel = isNarrow ? 'Randomize' : label;
  const button = (
    <Button
      size="sm"
      disabled={dataLoading}
      onClick={() => {
        setError(null);
        setShowConfirm(true);
      }}
      leftIcon={Dices}
    >
      {buttonLabel}
    </Button>
  );

  return (
    <>
      {isNarrow ? button : <Tooltip content={label}>{button}</Tooltip>}
      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        title={
          <span className="flex items-center gap-2 font-semibold">
            <Dices size={16} className="text-accent" /> {label}
          </span>
        }
        description={description}
        confirmLabel="Randomize"
        loading={loading}
        error={error}
      />
    </>
  );
}
