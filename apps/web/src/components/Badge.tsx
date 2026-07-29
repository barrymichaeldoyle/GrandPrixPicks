import type { Doc } from '@convex-generated/dataModel';
import { Clock, Lock, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';

/** The race lifecycle union, straight from the Convex schema. */
type RaceStatus = Doc<'races'>['status'];

type BadgeVariant =
  | 'sprint'
  | 'upcoming'
  | 'not_yet_open'
  | 'locked'
  | 'submitted'
  | 'finished'
  | 'cancelled';

const successBadgeStyles =
  'bg-success-muted text-success border border-success/30';
const mutedBadgeStyles =
  'bg-surface-elevated text-text-muted border border-border';

const variantStyles: Record<BadgeVariant, string> = {
  // Sprint reuses the violet result semantic rather than adding a sixth hue.
  sprint:
    'bg-result-perfect-quiet text-sprint-text border border-sprint-border/45',
  upcoming: successBadgeStyles,
  not_yet_open: mutedBadgeStyles,
  locked: 'border border-warning/50 bg-warning-muted text-warning',
  // Amber, not red: a cancelled race is information, not an alarm.
  cancelled: 'border border-error/50 bg-error-muted text-error',
  submitted: successBadgeStyles,
  finished: mutedBadgeStyles,
};

const statusIcons: Record<
  'upcoming' | 'not_yet_open' | 'locked' | 'submitted' | 'finished',
  ReactNode
> = {
  upcoming: <Clock size={14} />,
  not_yet_open: <Lock size={14} />,
  locked: <Lock size={14} />,
  submitted: null,
  finished: <Trophy size={14} />,
};

const statusLabels: Record<
  'upcoming' | 'not_yet_open' | 'locked' | 'submitted' | 'finished',
  string
> = {
  upcoming: 'Open for predictions',
  not_yet_open: 'Not yet open',
  locked: 'Predictions locked',
  submitted: 'Submitted',
  finished: 'Finished',
};

interface BadgeProps {
  variant: BadgeVariant;
  /** Optional icon (used for status variants when not provided). Ignored for next/sprint. */
  icon?: ReactNode;
  /** Label text. For status variants, defaults to the variant label when not provided. */
  children?: ReactNode;
}

export function Badge({ variant, icon, children }: BadgeProps) {
  const isStatusVariant =
    variant === 'upcoming' ||
    variant === 'not_yet_open' ||
    variant === 'locked' ||
    variant === 'submitted' ||
    variant === 'finished';

  const defaultIcon = isStatusVariant ? statusIcons[variant] : null;
  const defaultLabel = isStatusVariant ? statusLabels[variant] : null;

  const showIcon = isStatusVariant && (icon !== undefined ? icon : defaultIcon);
  const label = children ?? defaultLabel;

  return (
    // A status badge is a micro label: 2px radius (pill is reserved for the
    // 5px team dot), uppercase and tracked. Statuses are three words max.
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-sm border px-2 py-1 text-xs font-medium tracking-label uppercase ${variantStyles[variant]}`}
    >
      {showIcon}
      {label}
    </span>
  );
}

interface StatusBadgeProps {
  /** Race status, carried through from the Convex schema's union. */
  status: RaceStatus;
  /** When true and status is upcoming, shows "Open for predictions". When false and status is upcoming, shows "Not yet open". */
  isNext?: boolean;
}

export function StatusBadge({ status, isNext }: StatusBadgeProps) {
  if (status === 'cancelled') {
    return <Badge variant="cancelled">Called Off</Badge>;
  }

  const effectiveStatus: BadgeVariant =
    status === 'upcoming' && !isNext ? 'not_yet_open' : status;

  return <Badge variant={effectiveStatus} />;
}
