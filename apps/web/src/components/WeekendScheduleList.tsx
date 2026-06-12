import type { Doc } from '@convex-generated/dataModel';
import { Calendar } from 'lucide-react';

import {
  getRaceSessionLockAt,
  getWeekendSessionStarts,
} from '../lib/raceSessions';
import { SESSION_LABELS } from '../lib/sessions';
import { useNow } from '../lib/testing/now';
import { useUserDateFormat } from '../lib/useUserDateFormat';

/**
 * Flat list of every session in the weekend with viewer-local start times.
 * Shown on the race page when there's no richer per-session content to show
 * (signed-out visitors, races that aren't open for predictions yet).
 */
export function WeekendScheduleList({ race }: { race: Doc<'races'> }) {
  const now = useNow();
  const { settings, formatDate, formatTime, formatTimeZoneAbbreviation } =
    useUserDateFormat();
  const entries = getWeekendSessionStarts(race);
  const firstStartAt = entries[0]?.startAt ?? race.raceStartAt;
  const viewerTimeZone =
    settings.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timezoneLabel = formatTimeZoneAbbreviation(
    firstStartAt,
    viewerTimeZone,
  );

  return (
    <section aria-label="Weekend schedule">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-semibold tracking-[0.14em] text-text-muted uppercase">
          <Calendar size={13} aria-hidden />
          Weekend Schedule
        </p>
        {timezoneLabel ? (
          <span
            suppressHydrationWarning
            className="text-[11px] font-medium text-text-muted"
          >
            {timezoneLabel}
          </span>
        ) : null}
      </div>
      <div className="mt-1 divide-y divide-border/60">
        {entries.map(({ type, startAt }) => {
          const isLocked = now >= getRaceSessionLockAt(race, type);
          return (
            <div
              key={type}
              className="flex items-baseline justify-between gap-3 py-2 text-sm"
            >
              <span
                className={
                  isLocked
                    ? 'text-text-muted/60'
                    : type === 'race'
                      ? 'font-medium text-text'
                      : 'text-text'
                }
              >
                {SESSION_LABELS[type]}
              </span>
              <span className="flex items-baseline gap-2">
                {isLocked && (
                  <span className="text-[11px] font-medium tracking-wide text-text-muted/60 uppercase">
                    Locked
                  </span>
                )}
                <span
                  suppressHydrationWarning
                  className={`tabular-nums ${
                    isLocked ? 'text-text-muted/60' : 'text-text-muted'
                  }`}
                >
                  {formatDate(startAt)} · {formatTime(startAt)}
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
