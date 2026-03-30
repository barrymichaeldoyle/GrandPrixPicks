import { Clock, Lock, Trophy } from 'lucide-react';
import type { ReactNode } from 'react';

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
  'bg-surface-muted text-text-muted border border-border';

const variantStyles: Record<BadgeVariant, string> = {
  sprint:
    'sprint-badge bg-purple-50/80 dark:bg-purple-950/35 border border-purple-300 dark:border-purple-500/40',
  upcoming: successBadgeStyles,
  not_yet_open: mutedBadgeStyles,
  locked:
    'border border-warning/40 bg-warning/12 text-warning dark:border-warning/50 dark:bg-warning/18',
  submitted: successBadgeStyles,
  finished: mutedBadgeStyles,
  cancelled:
    'border border-destructive/40 bg-destructive/10 text-destructive dark:border-destructive/50 dark:bg-destructive/15',
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
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${variantStyles[variant]}`}
    >
      {showIcon}
      {label}
    </span>
  );
}

interface StatusBadgeProps {
  /** Race status from Convex: "upcoming" | "locked" | "finished" | "cancelled". */
  status: string;
  /** When true and status is upcoming, shows "Open for predictions". When false and status is upcoming, shows "Not yet open". */
  isNext?: boolean;
}

export function StatusBadge({ status, isNext }: StatusBadgeProps) {
  if (status === 'cancelled') {
    return <Badge variant="cancelled">Called Off</Badge>;
  }
  const effectiveStatus: BadgeVariant =
    status === 'upcoming' && !isNext
      ? 'not_yet_open'
      : (status as BadgeVariant);

  return <Badge variant={effectiveStatus} />;
}
