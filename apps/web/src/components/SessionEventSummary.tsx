import { CalendarClock, CheckCircle2, CircleDot, Lock } from 'lucide-react';

import { formatDate, formatInTimeZone, formatTime } from '../lib/date';
import {
  getLockStatusViewModel,
  getLockUrgencyBadgeClassName,
} from '../lib/lock';
import type { SessionType } from '../lib/sessions';
import { SESSION_LABELS } from '../lib/sessions';
import { PredictionCountdownBadge } from './PredictionCountdownBadge';

type SessionStatus = 'open' | 'closing_soon' | 'locked' | 'published';

function TimeInfoCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-md border border-border bg-surface-muted/40 px-2.5 py-2">
      <p className="text-xs font-medium text-text-muted">{label}</p>
      <p className="font-medium text-text" suppressHydrationWarning>
        {value}
      </p>
    </div>
  );
}

export function SessionEventSummary({
  session,
  startsAt,
  lockAt,
  hasResults,
  trackTimeZone = 'UTC',
  now = Date.now(),
}: {
  session: SessionType;
  startsAt: number;
  lockAt: number;
  hasResults: boolean;
  trackTimeZone?: string;
  now?: number;
}) {
  const lockStatus = getLockStatusViewModel({
    msRemaining: lockAt - now,
  });
  const status: SessionStatus = hasResults ? 'published' : lockStatus.urgency;
  const statusUi =
    status === 'open'
      ? {
          label: lockStatus.label,
          icon: CircleDot,
          className: getLockUrgencyBadgeClassName(lockStatus.badgeTone),
        }
      : status === 'closing_soon'
        ? {
            label: lockStatus.label,
            icon: Lock,
            className: getLockUrgencyBadgeClassName(lockStatus.badgeTone),
          }
        : status === 'locked'
          ? {
              label: lockStatus.label,
              icon: Lock,
              className: getLockUrgencyBadgeClassName(lockStatus.badgeTone),
            }
          : {
              label: 'Published',
              icon: CheckCircle2,
              className: 'text-accent bg-accent-muted border-accent/30',
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
    <>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h2 className="inline-flex items-center gap-1.5 text-xl font-semibold text-text">
          <CalendarClock className="h-5 w-5 text-accent" aria-hidden="true" />
          {SESSION_LABELS[session]} Event
        </h2>
        <div className="flex items-center gap-2">
          {status === 'open' && (
            <PredictionCountdownBadge
              predictionLockAt={lockAt}
              sessionLabel={SESSION_LABELS[session]}
              className="text-xs"
            />
          )}
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${statusUi.className} ${
              shouldPulseLockStatusBadge ? 'animate-pulse' : ''
            }`}
          >
            <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {statusUi.label}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <TimeInfoCard label="On-track time" value={trackDateTime} />
        <TimeInfoCard label="Your local time" value={localDateTime} />
      </div>
    </>
  );
}
