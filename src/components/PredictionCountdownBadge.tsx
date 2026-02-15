import { useCountdown } from '../lib/date';

interface PredictionCountdownBadgeProps {
  /** Timestamp (ms) when predictions lock. */
  predictionLockAt: number;
  /** Session label, e.g. "Qualifying", "Race", "Sprint". */
  sessionLabel: string;
}

/**
 * Badge showing a live countdown until predictions close (e.g. "02h 30m 15s to predict Race").
 * Use wherever we indicate that the next race is open for predictions.
 */
export function PredictionCountdownBadge({
  predictionLockAt,
  sessionLabel,
}: PredictionCountdownBadgeProps) {
  const label = useCountdown(predictionLockAt);
  return (
    <span className="inline-flex shrink-0 items-center rounded-full border border-accent/30 bg-accent-muted px-2.5 py-1 text-sm font-semibold text-teal-800 tabular-nums dark:text-white">
      {label} to predict {sessionLabel}
    </span>
  );
}
