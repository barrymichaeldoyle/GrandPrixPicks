import { useCountdown } from '../lib/date';

interface PredictionCountdownBadgeProps {
  /** Timestamp (ms) when predictions lock. */
  predictionLockAt: number;
}

/**
 * Badge showing a live countdown until predictions close (e.g. "02h 30m 15s to predict").
 * Use wherever we indicate that the next race is open for predictions.
 */
export function PredictionCountdownBadge({
  predictionLockAt,
}: PredictionCountdownBadgeProps) {
  const label = useCountdown(predictionLockAt);
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-accent/30 bg-accent-muted px-2.5 py-1 text-sm font-semibold tabular-nums text-teal-800 dark:text-white">
      {label} to predict
    </span>
  );
}
