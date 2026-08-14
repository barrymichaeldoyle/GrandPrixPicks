import type { Doc } from '@convex-generated/dataModel';
import { Calendar } from 'lucide-react';

import {
  getRaceSessionLockAt,
  getWeekendPracticeStarts,
  getWeekendSessionStarts,
  PRACTICE_LABELS,
} from '@/lib/raceSessions';
import { SESSION_LABELS } from '@/lib/sessions';
import { useNow } from '@/lib/testing/now';
import { useUserDateFormat } from '@/lib/useUserDateFormat';

/**
 * Flat list of every session in the weekend with viewer-local start times.
 * Shown on the race page when there's no richer per-session content to show
 * (signed-out visitors, races that aren't open for predictions yet).
 *
 * Practice is listed alongside the scorable sessions and in the same running
 * order, because someone reading this wants to know when the cars are on
 * track, not which sessions we happen to award points for. It is styled a
 * step down and carries no lock state, so the rows you can act on still read
 * as the important ones.
 */
export function WeekendScheduleList({ race }: { race: Doc<'races'> }) {
  const now = useNow();
  const { settings, formatDate, formatTime, formatTimeZoneAbbreviation } =
    useUserDateFormat();
  const entries = [
    ...getWeekendSessionStarts(race).map((entry) => ({
      key: entry.type,
      label: SESSION_LABELS[entry.type],
      startAt: entry.startAt,
      lockAt: getRaceSessionLockAt(race, entry.type),
      isRace: entry.type === 'race',
    })),
    ...getWeekendPracticeStarts(race).map((entry) => ({
      key: entry.type,
      label: PRACTICE_LABELS[entry.type],
      startAt: entry.startAt,
      lockAt: undefined,
      isRace: false,
    })),
  ].sort((a, b) => a.startAt - b.startAt);
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
        <p className="flex items-center gap-1.5 text-xs font-semibold tracking-label text-text-muted uppercase">
          <Calendar size={13} aria-hidden />
          Weekend Schedule
        </p>
        {timezoneLabel ? (
          <span
            suppressHydrationWarning
            className="text-xs font-medium text-text-muted"
          >
            {timezoneLabel}
          </span>
        ) : null}
      </div>
      <div className="mt-1 divide-y divide-border/60">
        {entries.map(({ key, label, startAt, lockAt, isRace }) => {
          // Practice has no lock: there is nothing to pick, so it never shows
          // a "Locked" chip. It dims once it has run, like everything else.
          const isPractice = lockAt === undefined;
          const isLocked = now >= (lockAt ?? startAt);
          return (
            <div
              key={key}
              className="flex items-baseline justify-between gap-3 py-2 text-sm"
            >
              <span
                className={
                  isLocked || isPractice
                    ? 'text-text-muted/60'
                    : isRace
                      ? 'font-medium text-text'
                      : 'text-text'
                }
              >
                {label}
              </span>
              <span className="flex items-baseline gap-2">
                {isLocked && !isPractice && (
                  <span className="text-xs font-medium tracking-label text-text-muted/60 uppercase">
                    Locked
                  </span>
                )}
                <span
                  suppressHydrationWarning
                  className={`gpp-mono ${
                    isLocked || isPractice
                      ? 'text-text-muted/60'
                      : 'text-text-muted'
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
