import { Check } from 'lucide-react';

/** Numbered step indicator for the per-session picks flow (Top 5 → H2H). */
export function StepBadge({ step, done }: { step: number; done: boolean }) {
  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
        done
          ? 'bg-accent text-white'
          : 'border border-border-strong bg-surface text-text-muted'
      }`}
      aria-label={done ? `Step ${step}, done` : `Step ${step}`}
    >
      {done ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : step}
    </span>
  );
}
