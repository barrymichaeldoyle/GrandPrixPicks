import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';

type NoticeCardProps = {
  /** Lucide icon shown above the title. Omit for a text-only notice. */
  icon?: LucideIcon;
  /** Omit for a card that is only a line of copy, e.g. "no results yet". */
  title?: ReactNode;
  description?: ReactNode;
  /** Button or link shown beneath the copy. */
  action?: ReactNode;
  /**
   * `page` owns the route and renders an h1 (sign-in gates, "not found").
   * `section` sits inside a page that already has a heading, so it renders an
   * h2 at a smaller size (empty states like "No scores yet"). `subsection` is
   * the same size as `section` but an h3, for cards nested under one.
   */
  level?: 'page' | 'section' | 'subsection';
  /** Extra classes on the card itself, e.g. a width constraint. */
  className?: string;
  'data-testid'?: string;
};

/**
 * The centred card the app uses for sign-in gates, "not found" states and empty
 * lists. This markup was duplicated 25 times across 14 route files before it was
 * extracted, which is why the icon and spacing are fixed rather than props:
 * the variance was drift, not intent.
 */
export function NoticeCard({
  icon: Icon,
  title,
  description,
  action,
  level = 'section',
  className = '',
  'data-testid': testId,
}: NoticeCardProps) {
  const Heading =
    level === 'page' ? 'h1' : level === 'subsection' ? 'h3' : 'h2';
  // Light on dark reads bolder, so every heading role sits one weight step
  // below where it would normally land.
  const headingClass =
    level === 'page'
      ? 'mb-2 text-2xl font-light tracking-display text-text'
      : 'mb-2 text-xl font-normal tracking-tight text-text';

  return (
    <div
      className={`rounded-lg border border-border bg-surface p-8 text-center ${className}`}
      data-testid={testId}
    >
      {Icon ? (
        // Was 64px. The old card leaned on a large icon for presence; here the
        // type and the hairline carry it, so the icon steps back to a marker.
        <Icon
          className="mx-auto mb-4 h-8 w-8 text-text-muted"
          strokeWidth={1.5}
          aria-hidden
        />
      ) : null}
      {title ? <Heading className={headingClass}>{title}</Heading> : null}
      {description ? (
        <p className={`text-text-muted ${action ? 'mb-4' : ''}`}>
          {description}
        </p>
      ) : null}
      {action}
    </div>
  );
}
