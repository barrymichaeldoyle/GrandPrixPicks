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
    // The dimming used to sit here, on the whole card, which took the copy
    // down with it: `text-text-muted` at 60% opacity lands around 3.6:1 on the
    // page background, under the 4.5:1 floor. WCAG exempts disabled *controls*
    // from contrast, not the prose beside them — and the worst-hit line was
    // `disabledNote`, the sentence that explains why the card is inactive. The
    // text a reader most needs in this state was the least legible thing in it.
    //
    // So the inactive signal is carried by the parts that are decoration: the
    // icon medallion below, and the Button's own disabled styling.
    <div className="rounded-xl border border-dashed border-border-strong/70 px-4 py-6 text-center sm:py-8">
      <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-full bg-accent-muted/40 ${
            disabled ? 'opacity-60' : ''
          }`}
        >
          <Icon className="h-6 w-6 text-accent" aria-hidden />
        </span>
        {(step != null || title) && (
          <div className="flex items-center gap-2">
            {step != null && <StepBadge step={step} done={false} />}
            {/* h2, not h3. These cards are top-level sections of the race
                page, which has no h2 above them, so an h3 skipped a level
                straight from the page title. Same classes, so the rank changes
                and the type does not. */}
            {title ? (
              <h2 className="text-lg font-semibold text-text">{title}</h2>
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
