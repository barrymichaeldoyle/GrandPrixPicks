import type { ReactNode } from 'react';

/**
 * The small rounded label used for inline status and metadata.
 *
 * `Badge` covers the named domain states (sprint weekend, predictions locked,
 * submitted...) and supplies its own icon and copy. This is the lower-level
 * thing underneath: a pill in a given tone, with whatever content the caller
 * has. Nine call sites each hand-rolled the same markup and each picked its own
 * opacities for the same tone (`accent/35` in one place, `accent/45` in
 * another, `bg-accent-muted/35` vs `bg-accent/18`), which is why the recipes
 * live here now.
 */
export type PillTone = 'accent' | 'neutral' | 'success' | 'warning';

const TONE_CLASSES: Record<PillTone, string> = {
  accent: 'border-accent-hairline bg-accent-quiet text-accent',
  neutral: 'border-border bg-surface-elevated text-text-muted',
  success: 'border-success/35 bg-success-muted text-success',
  warning: 'border-warning/35 bg-warning-muted text-warning',
};

/**
 * `sm` is for pills that sit inside a dense line of text (the "Live" marker in
 * the weekend schedule); `lg` is for standalone marketing labels.
 */
export type PillSize = 'sm' | 'md' | 'lg';

const SIZE_CLASSES: Record<PillSize, string> = {
  sm: 'px-1.5 py-0.5 text-xs tracking-label uppercase',
  md: 'px-2 py-0.5 text-xs tracking-label uppercase',
  lg: 'px-3 py-1 text-xs tracking-label uppercase',
};

export function Pill({
  tone = 'neutral',
  size = 'md',
  className = '',
  children,
}: {
  tone?: PillTone;
  size?: PillSize;
  /** Layout-only extras (animation, gpp-mono, max-width). Not colour. */
  className?: string;
  children: ReactNode;
}) {
  return (
    // 2px radius, not a pill: `rounded-full` is reserved for the 5px team dot
    // and for avatars, which stay circular.
    <span
      className={`inline-flex items-center rounded-sm border font-medium ${SIZE_CLASSES[size]} ${TONE_CLASSES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
