import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';

import { Button } from './Button/Button';
import { StepBadge } from './StepBadge';

interface StartPicksCtaProps {
  /** Step number in the weekend picks flow; shown next to the title. */
  step?: number;
  /** Omit when a section heading already names the picks type. */
  title?: string;
  description: string;
  icon: LucideIcon;
  actionLabel: string;
  onStart?: () => void;
  /** When set, the CTA renders dimmed with this note and the button disabled. */
  disabledNote?: string;
  'data-testid'?: string;
}

/** Big "start your picks" call to action shared by the Top 5 and H2H flows. */
export function StartPicksCta({
  step,
  title,
  description,
  icon: Icon,
  actionLabel,
  onStart,
  disabledNote,
  'data-testid': testId,
}: StartPicksCtaProps) {
  const disabled = disabledNote != null;
  return (
    <div
      className={`rounded-xl border border-dashed border-border-strong/70 px-4 py-6 text-center sm:py-8 ${
        disabled ? 'opacity-60' : ''
      }`}
    >
      <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-muted/40">
          <Icon className="h-6 w-6 text-accent" aria-hidden />
        </span>
        {(step != null || title) && (
          <div className="flex items-center gap-2">
            {step != null && <StepBadge step={step} done={false} />}
            {title ? (
              <h3 className="text-lg font-semibold text-text">{title}</h3>
            ) : null}
          </div>
        )}
        <p className="text-sm text-text-muted">{description}</p>
        <Button
          variant="primary"
          size="md"
          rightIcon={ArrowRight}
          disabled={disabled}
          onClick={onStart}
          data-testid={testId}
          className="w-full max-w-xs"
        >
          {actionLabel}
        </Button>
        {disabledNote ? (
          <p className="text-xs text-text-muted">{disabledNote}</p>
        ) : null}
      </div>
    </div>
  );
}
