import type { Doc } from '@convex-generated/dataModel';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Calendar, Clock3, Lock } from 'lucide-react';

import { formatLockCountdown } from '@grandprixpicks/shared/picks';

import { useCountdown } from '@/lib/date';
import { getLockStatusViewModel } from '@/lib/lock';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import {
  getNextSessionLockAt,
  getRaceSessionLockAt,
  getWeekendSessionStarts,
} from '@/lib/raceSessions';
import { SESSION_LABELS } from '@/lib/sessions';
import { useNow } from '@/lib/testing/now';
import { useUserDateFormat } from '@/lib/useUserDateFormat';
import { Badge } from './Badge';
import { RaceFlag } from './RaceFlag';
import { Pill } from './Pill';

type Race = Doc<'races'>;

interface RaceCardProps {
  race: Race;
  isNext?: boolean;
  compact?: boolean;
  /** When predictions open (previous race start). Shown for "not yet open" races. */
  predictionOpenAt?: number | null;
}

function Countdown({
  timestamp,
  suffix,
}: {
  timestamp: number;
  suffix: string;
}) {
  const label = useCountdown(timestamp);
  return (
    <span suppressHydrationWarning>
      {label} {suffix}
    </span>
  );
}

export function RaceCard({
  race,
  isNext,
  compact = false,
  predictionOpenAt,
}: RaceCardProps) {
  // Only the next upcoming race is open for predictions
  const isPredictable = race.status === 'upcoming' && isNext;
  const isNotYetOpen = race.status === 'upcoming' && !isNext;
  const now = useNow();
  const { formatDate, formatDateLong, formatTime } = useUserDateFormat();
  const isCancelled = race.status === 'cancelled';
  const isCompleted = race.status === 'finished';
  const isPastRace = race.raceStartAt <= now;
  const isMutedPastRace = (isCancelled || isCompleted) && isPastRace;
  const hasCancelledBorder = isCancelled && !isPastRace;

  const countryCode = getCountryCodeForRace(race);
  const timezoneLabel = Intl.DateTimeFormat(undefined, {
    timeZoneName: 'short',
  })
    .formatToParts(now)
    .find((p) => p.type === 'timeZoneName')?.value;
  const scheduleEntries = getWeekendSessionStarts(race);
  // Count down to the next session that locks (quali/sprint lock before the
  // race), so the card never claims more time than the user actually has.
  const nextSessionLockAt = getNextSessionLockAt(race, now);
  const msUntilLock = nextSessionLockAt - now;
  const lockStatus = getLockStatusViewModel({
    msRemaining: msUntilLock,
  });

  if (compact) {
    return (
      <Link
        to="/races/$raceSlug"
        params={{ raceSlug: race.slug }}
        className={`group grid min-h-18 grid-cols-[2.5rem_minmax(0,1fr)_auto_auto] items-center gap-3 px-1 py-3 transition-colors hover:bg-surface/55 sm:grid-cols-[3rem_2.5rem_minmax(0,1fr)_auto_auto_auto] sm:px-3 ${
          isMutedPastRace ? 'opacity-60 hover:opacity-85' : ''
        }`}
      >
        <span className="gpp-mono hidden text-xs font-semibold text-text-muted sm:block">
          {String(race.round).padStart(2, '0')}
        </span>
        {countryCode ? (
          <RaceFlag
            countryCode={countryCode}
            size="md"
            className="shrink-0 rounded-sm"
          />
        ) : (
          <span className="h-6 w-9" />
        )}
        <span className="min-w-0">
          <span className="block truncate font-semibold text-text">
            {race.name}
          </span>
          <span className="mt-0.5 flex items-center gap-2 text-xs text-text-muted sm:hidden">
            <span>Round {race.round}</span>
            {race.hasSprint ? (
              <span className="text-sprint-text">Sprint</span>
            ) : null}
          </span>
        </span>
        {race.hasSprint ? (
          <span className="hidden text-xs font-medium text-sprint-text sm:block">
            Sprint
          </span>
        ) : (
          <span className="hidden sm:block" />
        )}
        <span
          className="gpp-mono text-right text-sm text-text-muted"
          suppressHydrationWarning
        >
          {formatDate(race.raceStartAt)}
        </span>
        <ArrowRight
          size={15}
          className="text-text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent"
          aria-hidden
        />
      </Link>
    );
  }

  return (
    <Link
      to="/races/$raceSlug"
      params={{ raceSlug: race.slug }}
      // Hover is one surface step lighter plus a firmer edge. The card no
      // longer lifts or gains a shadow: nothing in this system moves on hover,
      // and there are no elevation shadows to grow.
      className={`group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-lg border bg-surface transition-[border-color,background-color,opacity] duration-150 ease-out hover:bg-surface-elevated focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:outline-none ${
        hasCancelledBorder
          ? 'border-error/30 opacity-60 hover:border-error/50'
          : isMutedPastRace
            ? 'border-border opacity-60 hover:border-border-strong focus-visible:border-border-strong'
            : isNext
              ? // The next race is the thing that matters on this page, so it
                // gets the stripe rather than a brighter border.
                'gpp-stripe border-border hover:border-border-strong'
              : 'border-border hover:border-border-strong focus-visible:border-border-strong'
      }`}
    >
      {/* Phones stack the card; from md the sessions sit beside the header
          so the card can span the page without an empty right half. */}
      <div className="relative flex h-full flex-col md:grid md:grid-cols-2">
        <div className="flex flex-col gap-1.5 px-3 pt-2.5 pb-2 md:pb-2.5">
          {/* Header: flag + round + race name */}
          <div className="flex items-center gap-2.5">
            {countryCode && (
              <RaceFlag
                countryCode={countryCode}
                size="md"
                className="shrink-0 rounded-sm"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-text-muted">
                Round {race.round}
              </p>
              {/* h2, not h3: these cards sit directly under the page's h1 on the
                  calendar, and the level was skipping a rank. Heading level is
                  document structure, not type scale — the size is set in CSS. */}
              <h2 className="line-clamp-2 text-sm leading-tight font-semibold text-text sm:text-base">
                {race.name}
              </h2>
            </div>
            <ArrowRight
              size={14}
              strokeWidth={2}
              className="shrink-0 text-text-muted transition-colors group-hover:text-text group-focus-visible:text-text"
              aria-hidden
            />
          </div>

          {/* The countdown reads as the dashboard hero's clock line rather
              than a bordered pill: quiet mono, the value carrying the
              emphasis. It gets its own line so the race name keeps the full
              width on a phone instead of wrapping to four lines. */}
          {isPredictable && msUntilLock > 0 && (
            <p className="gpp-mono text-xs whitespace-nowrap text-text-muted">
              locks in
              {/* The flag goes on the element that owns the ticking text: React
                  applies it one level deep, so on the <p> it covered only
                  "locks in", and a second passing between the server render
                  and hydration threw a mismatch. */}
              <strong
                className="ml-1.5 font-medium text-text"
                suppressHydrationWarning
              >
                {formatLockCountdown(msUntilLock)}
              </strong>
            </p>
          )}

          {/* Badges and status */}
          <div className="flex flex-wrap items-center gap-1 empty:hidden">
            {race.status === 'cancelled' && (
              <Badge variant="cancelled">Called off</Badge>
            )}
            {race.status === 'finished' && (
              <Badge variant="finished">Completed</Badge>
            )}
            {race.hasSprint && <Badge variant="sprint">Sprint</Badge>}
            {/* The "Open" state is already conveyed by the "locks in" clock
                line — only surface this status pill when it adds new info
                (Closing soon, Locked). */}
            {isPredictable && lockStatus.urgency !== 'open' && (
              <Pill
                tone={lockStatus.badgeTone}
                className={lockStatus.shouldPulse ? 'animate-pulse' : ''}
              >
                {lockStatus.label}
              </Pill>
            )}
            {isNotYetOpen && predictionOpenAt != null && (
              <Pill>
                <span suppressHydrationWarning>
                  Opens {formatDateLong(predictionOpenAt)}
                </span>
              </Pill>
            )}
            {race.status === 'locked' && (
              <Pill tone="warning" className="gpp-mono">
                {race.raceStartAt > now ? (
                  <Countdown timestamp={race.raceStartAt} suffix="until race" />
                ) : (
                  'Results pending'
                )}
              </Pill>
            )}
          </div>
        </div>

        {/* Weekend sessions */}
        {scheduleEntries.length > 0 && (
          <div className="mx-3 flex flex-1 flex-col border-t border-border/60 pt-1.5 pb-2.5 md:mx-0 md:border-t-0 md:border-l md:px-4 md:pt-2.5">
            <div className="mb-1 flex items-center justify-between gap-2 text-xs font-medium text-text-muted">
              <span className="inline-flex items-center gap-1">
                <Calendar size={12} aria-hidden />
                Weekend sessions
              </span>
              {timezoneLabel ? (
                <span suppressHydrationWarning>{timezoneLabel}</span>
              ) : null}
            </div>
            <div className="grid flex-1 grid-cols-[auto_1fr] content-end items-baseline gap-x-2 gap-y-1 text-sm text-text-muted">
              {scheduleEntries.map((entry) => {
                // Same state the dashboard's session chips carry: an icon and
                // a tone, no status word. A race doc has no per-session
                // results, so this stops at open / locked — the trophy state
                // needs data this card does not load.
                const isSessionLocked =
                  now >= getRaceSessionLockAt(race, entry.type);
                const SessionIcon = isSessionLocked ? Lock : Clock3;
                return (
                  <div key={entry.type} className="contents">
                    <span
                      className={`inline-flex items-center gap-1.5 font-medium ${
                        entry.type === 'race' ? 'text-text' : ''
                      }`}
                    >
                      <SessionIcon
                        className={`size-3 shrink-0 ${
                          isSessionLocked ? 'text-warning' : 'text-accent'
                        }`}
                        aria-hidden
                      />
                      {SESSION_LABELS[entry.type]}
                    </span>
                    <span
                      suppressHydrationWarning
                      className={`gpp-mono text-right ${
                        entry.type === 'race' ? 'font-semibold text-text' : ''
                      }`}
                    >
                      {formatDate(entry.startAt)} · {formatTime(entry.startAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Link>
  );
}
