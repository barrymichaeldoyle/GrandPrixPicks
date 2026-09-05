import { useUserDateFormat } from '@/lib/useUserDateFormat';
import { getLockStatusViewModel } from '@/lib/lock';
import { useNow } from '@/lib/testing/now';
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
  /*
   * The only status this line still shows. A closed session used to get a
   * "Locked" or "Published" pill here, which the session tab above already
   * says — in amber, for the same session, four inches away.
   *
   * The countdown stays because it is not a restatement of the tab: the tab
   * says the session is open, this says how long that lasts. It covers
   * `closing_soon` as well as `open`, which the old `urgency === 'open'` test
   * did not — that state used to fall through to the pill, so gating purely on
   * `isOpen` would have left the last hour before a lock, the hour the
   * deadline matters most, with nothing on this line at all. It pulses there,
   * as the pill did.
   */
  const showCountdown = !hasResults && !lockStatus.isLocked;
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
      {showCountdown && (
        <div className="shrink-0 self-start sm:self-center">
          <PredictionCountdownBadge
            predictionLockAt={lockAt}
            className={`text-xs ${lockStatus.shouldPulse ? 'animate-pulse' : ''}`}
          />
        </div>
      )}
    </div>
  );
}
