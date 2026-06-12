import { CheckCircle2, Lock } from 'lucide-react';

import { useUserDateFormat } from '../lib/useUserDateFormat';
import {
  getLockStatusViewModel,
  getLockUrgencyBadgeClassName,
} from '../lib/lock';
import { PredictionCountdownBadge } from './PredictionCountdownBadge';

const sessionDateOptions: Intl.DateTimeFormatOptions = {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
};

const sessionTimeOptions: Intl.DateTimeFormatOptions = {
  hour: 'numeric',
  minute: '2-digit',
};

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
  const {
    formatDate,
    formatTime,
    formatInTimeZone,
    formatTimeZoneAbbreviation,
  } = useUserDateFormat();
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
  const trackDate = formatInTimeZone(
    startsAt,
    trackTimeZone,
    sessionDateOptions,
  );
  const trackTime = formatInTimeZone(
    startsAt,
    trackTimeZone,
    sessionTimeOptions,
  );
  const trackTimeZoneLabel = formatTimeZoneAbbreviation(
    startsAt,
    trackTimeZone,
  );
  const localDate = formatDate(startsAt);
  const localTime = formatTime(startsAt);
  // When the viewer's timezone matches the track's offset (e.g. SAST vs CEST
  // in summer), the two rows would read identically — skip the redundant one.
  const localMatchesTrack = localDate === trackDate && localTime === trackTime;

  return (
    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <dl className="grid min-w-0 flex-1 grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-1 text-sm">
        <dt className="text-text-muted">On track</dt>
        <dd
          className="min-w-0 font-medium text-text tabular-nums"
          suppressHydrationWarning
        >
          <span className="inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span>
              {trackDate} · {trackTime}
            </span>
            {trackTimeZoneLabel ? (
              <span className="text-xs font-normal text-text-muted">
                {trackTimeZoneLabel}
              </span>
            ) : null}
          </span>
        </dd>
        {!localMatchesTrack && (
          <>
            <dt className="text-text-muted">Your time</dt>
            <dd
              className="min-w-0 font-medium text-text tabular-nums"
              suppressHydrationWarning
            >
              {localDate} · {localTime}
            </dd>
          </>
        )}
      </dl>
      <div className="shrink-0 self-start sm:self-center">
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
