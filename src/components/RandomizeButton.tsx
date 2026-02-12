import { useMutation, useQuery } from 'convex/react';
import { Shuffle } from 'lucide-react';
import { useState } from 'react';

import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { Button } from './Button';
import { ConfirmDialog } from './ConfirmDialog';

interface RandomizeButtonProps {
  raceId: Id<'races'>;
  hasPredictions: boolean;
  hasH2HPredictions: boolean;
}

function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function RandomizeButton({
  raceId,
  hasPredictions,
  hasH2HPredictions,
}: RandomizeButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const drivers = useQuery(api.drivers.listDrivers);
  const matchups = useQuery(api.h2h.getMatchupsForSeason, {});
  const submitPrediction = useMutation(api.predictions.submitPrediction);
  const submitH2H = useMutation(api.h2h.submitH2HPredictions);

  // Both submitted — hide the button
  if (hasPredictions && hasH2HPredictions) {
    return null;
  }

  const needsTop5 = !hasPredictions;
  const needsH2H = !hasH2HPredictions;
  const dataLoading = drivers === undefined || matchups === undefined;

  const label = needsTop5
    ? 'Randomize All Predictions'
    : 'Randomize H2H Predictions';

  const description = needsTop5
    ? 'This will randomly select your Top 5 drivers and Head-to-Head picks for all sessions this weekend. You can edit individual sessions afterwards.'
    : 'This will randomly select your Head-to-Head picks for all sessions this weekend. You can edit individual sessions afterwards.';

  async function handleConfirm() {
    if (!drivers || !matchups) return;

    setLoading(true);
    setError(null);

    try {
      if (needsTop5) {
        const driverIds = drivers.map((d) => d._id);
        const randomTop5 = shuffleArray(driverIds).slice(0, 5);
        await submitPrediction({ raceId, picks: randomTop5 });
      }

      if (needsH2H && matchups.length > 0) {
        const randomH2HPicks = matchups.map((m) => ({
          matchupId: m._id,
          predictedWinnerId:
            Math.random() < 0.5 ? m.driver1._id : m.driver2._id,
        }));
        await submitH2H({ raceId, picks: randomH2HPicks });
      }

      setShowConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="flex justify-center px-4 pt-4 sm:px-6 sm:pt-6">
        <Button
          variant="secondary"
          size="sm"
          disabled={dataLoading}
          onClick={() => {
            setError(null);
            setShowConfirm(true);
          }}
        >
          <Shuffle size={16} />
          {label}
        </Button>
      </div>
      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleConfirm}
        title={label}
        description={description}
        confirmLabel="Randomize"
        loading={loading}
        error={error}
      />
    </>
  );
}
