import { useCountdown } from '@/lib/date';

interface PredictionCountdownBadgeProps {
  /** Timestamp (ms) when predictions lock. */
  predictionLockAt: number;
  /** Badge copy mode for different contexts. */
  labelMode?: 'predict' | 'lock';
  /** Optional extra classes for context-specific layout tweaks. */
  className?: string;
}

/**
 * Badge showing a live countdown until predictions close (e.g. "02h 30m 15s to predict Race").
 * Use wherever we indicate that the next race is open for predictions.
 */
export function PredictionCountdownBadge({
  predictionLockAt,
  labelMode = 'predict',
  className = '',
}: PredictionCountdownBadgeProps) {
  const label = useCountdown(predictionLockAt);
  const suffix = labelMode === 'lock' ? 'until lock' : `to predict`;
  return (
    <span
      suppressHydrationWarning
      className={`gpp-mono inline-flex max-w-full min-w-0 items-center rounded-sm border border-accent-hairline bg-accent-quiet px-2.5 py-1 text-sm leading-tight whitespace-normal text-accent ${className}`}
    >
      {label} {suffix}
    </span>
  );
}
