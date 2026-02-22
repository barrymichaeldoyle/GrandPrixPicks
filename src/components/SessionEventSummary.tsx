import { CalendarClock, CheckCircle2, CircleDot, Lock } from 'lucide-react';

import { formatDate, formatTime } from '../lib/date';
import type { SessionType } from '../lib/sessions';
import { SESSION_LABELS } from '../lib/sessions';
import { PredictionCountdownBadge } from './PredictionCountdownBadge';

type SessionStatus = 'open' | 'locked' | 'published';

function getSessionStatus({
  hasResults,
  lockAt,
  now,
}: {
  hasResults: boolean;
  lockAt: number;
  now: number;
}): SessionStatus {
  if (hasResults) {
    return 'published';
  }
  return now < lockAt ? 'open' : 'locked';
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
  const status = getSessionStatus({ hasResults, lockAt, now });
  const statusUi =
    status === 'open'
      ? {
          label: 'Open',
          icon: CircleDot,
          className: 'text-success bg-success-muted border-success/30',
        }
      : status === 'locked'
        ? {
            label: 'Locked',
            icon: Lock,
            className: 'text-warning bg-warning-muted border-warning/30',
          }
        : {
            label: 'Published',
            icon: CheckCircle2,
            className: 'text-accent bg-accent-muted border-accent/30',
          };

  const StatusIcon = statusUi.icon;
  const trackDateTime = (() => {
    try {
      return new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: trackTimeZone,
        timeZoneName: 'short',
      }).format(startsAt);
    } catch {
      return new Intl.DateTimeFormat(undefined, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'UTC',
        timeZoneName: 'short',
      }).format(startsAt);
    }
  })();

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
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold ${statusUi.className}`}
          >
            <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {statusUi.label}
          </span>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div className="rounded-md border border-border bg-surface-muted/40 px-2.5 py-2">
          <p className="text-xs font-medium text-text-muted">On-track time</p>
          <p className="font-medium text-text">{trackDateTime}</p>
        </div>
        <div className="rounded-md border border-border bg-surface-muted/40 px-2.5 py-2">
          <p className="text-xs font-medium text-text-muted">Your local time</p>
          <p className="font-medium text-text">
            {formatDate(startsAt)} · {formatTime(startsAt)}
          </p>
        </div>
      </div>
    </>
  );
}
