import { CheckCircle2, Lock } from 'lucide-react';

import { useUserDateFormat } from '../lib/useUserDateFormat';
import {
  getLockStatusViewModel,
  getLockUrgencyBadgeClassName,
} from '../lib/lock';
import { PredictionCountdownBadge } from './PredictionCountdownBadge';

export function SessionEventSummary({
  startsAt,
  lockAt,
  hasResults,
  trackTimeZone = 'UTC',
  now = Date.now(),
}: {
  startsAt: number;
  lockAt: number;
  hasResults: boolean;
  trackTimeZone?: string;
  now?: number;
}) {
  const { formatDate, formatTime, formatInTimeZone } = useUserDateFormat();
  const lockStatus = getLockStatusViewModel({
    msRemaining: lockAt - now,
  });
  const isOpen = !hasResults && lockStatus.urgency === 'open';
  const statusUi = hasResults
    ? {
        label: 'Published',
        icon: CheckCircle2,
        className: 'text-accent bg-accent-muted border-accent/30',
      }
    : {
        label: lockStatus.label,
        icon: Lock,
        className: getLockUrgencyBadgeClassName(lockStatus.badgeTone),
      };

  const StatusIcon = statusUi.icon;
  const shouldPulseLockStatusBadge = lockStatus.shouldPulse;
  const trackDateTime = formatInTimeZone(startsAt, trackTimeZone, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  });
  const localDateTime = `${formatDate(startsAt)} · ${formatTime(startsAt)}`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5">
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 text-sm">
        <span suppressHydrationWarning>
          <span className="text-text-muted">On track </span>
          <span className="font-medium text-text">{trackDateTime}</span>
        </span>
        <span suppressHydrationWarning>
          <span className="text-text-muted">Your time </span>
          <span className="font-medium text-text">{localDateTime}</span>
        </span>
      </div>
      <div className="flex items-center gap-2">
        {isOpen ? (
          // The countdown already implies the session is open — skip the
          // redundant "Open" pill and show a single badge.
          <PredictionCountdownBadge
            predictionLockAt={lockAt}
            className="text-xs"
          />
        ) : (
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${statusUi.className} ${
              shouldPulseLockStatusBadge ? 'animate-pulse' : ''
            }`}
          >
            <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {statusUi.label}
          </span>
        )}
      </div>
    </div>
  );
}
