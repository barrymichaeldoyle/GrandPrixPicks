import { CheckCircle2, Lock } from 'lucide-react';

import { useUserDateFormat } from '@/lib/useUserDateFormat';
import { getLockStatusViewModel } from '@/lib/lock';
import { useNow } from '@/lib/testing/now';
import { PredictionCountdownBadge } from './PredictionCountdownBadge';
import { Pill } from './Pill';
import { Tooltip } from './Tooltip';

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
  now,
}: {
  startsAt: number;
  lockAt: number;
  hasResults: boolean;
  trackTimeZone?: string;
  now?: number;
}) {
  const liveNow = useNow();
  const currentNow = now ?? liveNow;
  const {
    settings,
    formatDate,
    formatTime,
    formatInTimeZone,
    formatTimeZoneAbbreviation,
  } = useUserDateFormat();
  const lockStatus = getLockStatusViewModel({
    msRemaining: lockAt - currentNow,
  });
  const isOpen = !hasResults && lockStatus.urgency === 'open';
  const statusUi = hasResults
    ? {
        label: 'Published',
        icon: CheckCircle2,
        tone: 'accent' as const,
      }
    : {
        label: lockStatus.label,
        icon: Lock,
        tone: lockStatus.badgeTone,
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
  const viewerTimeZone =
    settings.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const localDate = formatDate(startsAt);
  const localTime = formatTime(startsAt);
  const localTimeZoneLabel = formatTimeZoneAbbreviation(
    startsAt,
    viewerTimeZone,
  );

  const statusPill = (
    <Pill
      tone={statusUi.tone}
      className={`gap-1 ${shouldPulseLockStatusBadge ? 'animate-pulse' : ''}`}
    >
      <StatusIcon className="h-3.5 w-3.5" aria-hidden="true" />
      {statusUi.label}
    </Pill>
  );

  return (
    /* The status sits beside the times, not at the far edge. `justify-between`
       on a full-width row stranded the pill a thousand pixels from the block
       it describes on a desktop, reading as an unrelated floating chip. */
    <div className="flex flex-col items-start gap-2.5 sm:flex-row sm:gap-4">
      <dl className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-3 gap-y-1 text-sm">
        <dt className="text-text-muted">On track</dt>
        <dd
          className="gpp-mono min-w-0 font-medium text-text"
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
        <dt className="text-text-muted">Your time</dt>
        <dd
          className="gpp-mono min-w-0 font-medium text-text"
          suppressHydrationWarning
        >
          <span className="inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
            <span>
              {localDate} · {localTime}
            </span>
            {localTimeZoneLabel ? (
              <span className="text-xs font-normal text-text-muted">
                {localTimeZoneLabel}
              </span>
            ) : null}
          </span>
        </dd>
      </dl>
      <div className="shrink-0 self-start sm:self-center">
        {isOpen ? (
          // The countdown already implies the session is open — skip the
          // redundant "Open" pill and show a single badge.
          <PredictionCountdownBadge
            predictionLockAt={lockAt}
            className="text-xs"
          />
        ) : /*
             The page's one lock statement, so it carries the explanation the
             per-section badges used to. Wrapped only when locked: an empty
             tooltip is still a tab stop and a `cursor-help` on something with
             nothing to say.
           */
        lockStatus.isLocked && !hasResults ? (
          <Tooltip content="This session has started. Predictions can't be changed">
            {statusPill}
          </Tooltip>
        ) : (
          statusPill
        )}
      </div>
    </div>
  );
}
