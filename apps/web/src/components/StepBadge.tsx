import { Check } from 'lucide-react';

/**
 * Done-state indicator for the per-session picks flow (Top 5 → H2H).
 * Always renders a tick: accent-filled when done, muted outline when not.
 */
export function StepBadge({ step, done }: { step: number; done: boolean }) {
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
        done
          ? 'bg-accent text-white'
          : 'border border-border-strong bg-surface text-text-muted/60'
      }`}
      aria-label={done ? `Step ${step}, done` : `Step ${step}, not done`}
    >
      <Check size={14} strokeWidth={3} aria-hidden="true" />
    </span>
  );
}
