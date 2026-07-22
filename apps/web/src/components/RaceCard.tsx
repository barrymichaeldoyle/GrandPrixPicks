import type { Doc } from '@convex-generated/dataModel';
import { Link } from '@tanstack/react-router';
import { ArrowRight, Calendar } from 'lucide-react';

import { useCountdown } from '@/lib/date';
import {
  getLockStatusViewModel,
  getLockUrgencyBadgeClassName,
} from '@/lib/lock';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import {
  getNextSessionLockAt,
  getWeekendSessionStarts,
} from '@/lib/raceSessions';
import { SESSION_LABELS } from '@/lib/sessions';
import { useNow } from '@/lib/testing/now';
import { useUserDateFormat } from '@/lib/useUserDateFormat';
import { Badge } from './Badge';
import { PredictionCountdownBadge } from './PredictionCountdownBadge';
import { RaceFlag } from './RaceFlag';

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
        className={`group grid min-h-18 grid-cols-[2.25rem_minmax(0,1fr)_auto_auto] items-center gap-3 px-1 py-3 transition-colors hover:bg-surface/55 sm:grid-cols-[3rem_2.25rem_minmax(0,1fr)_auto_auto_auto] sm:px-3 ${
          isMutedPastRace ? 'opacity-60 hover:opacity-85' : ''
        }`}
      >
        <span className="hidden text-xs font-semibold text-text-muted tabular-nums sm:block">
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
              <span className="text-violet-300">Sprint</span>
            ) : null}
          </span>
        </span>
        {race.hasSprint ? (
          <span className="hidden text-xs font-medium text-violet-300 sm:block">
            Sprint
          </span>
        ) : (
          <span className="hidden sm:block" />
        )}
        <span
          className="text-right text-sm text-text-muted tabular-nums"
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
      className={`group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-md border bg-surface transition-colors duration-200 hover:border-accent/70 focus-visible:border-accent focus-visible:outline-none ${
        hasCancelledBorder
          ? 'border-destructive/30 hover:border-destructive/50 opacity-60'
          : isMutedPastRace
            ? 'border-border opacity-60 hover:border-border-strong focus-visible:border-border-strong'
            : isNext
              ? 'border-accent/70 hover:border-accent'
              : 'border-border hover:border-accent/70 focus-visible:border-accent/70'
      }`}
    >
      <div className="relative flex h-full flex-col">
        {/* Header: flag + round + race name */}
        <div className="flex items-center gap-2.5 px-3 pt-2.5">
          {countryCode && (
            <RaceFlag
              countryCode={countryCode}
              size="md"
              className="shrink-0 rounded-sm"
            />
          )}
          <div className="min-w-0 flex-1">
            <p
              className={`text-[11px] font-semibold tracking-wide uppercase ${
                isNext ? 'text-accent' : 'text-text-muted'
              }`}
            >
              Round {race.round}
              {isNext ? ' · Next Race' : ''}
            </p>
            <h3 className="line-clamp-2 text-sm leading-tight font-semibold text-text sm:text-base">
              {race.name}
            </h3>
          </div>
          <ArrowRight
            size={14}
            strokeWidth={2}
            className="shrink-0 text-accent transition-colors group-hover:text-accent-hover group-focus-visible:text-accent-hover"
            aria-hidden
          />
        </div>

        <div className="flex h-full flex-col gap-1.5 px-3 pt-2 pb-2.5">
          {/* Badges and status */}
          <div className="flex flex-wrap items-center gap-1">
            {race.status === 'cancelled' && (
              <Badge variant="cancelled">CALLED OFF</Badge>
            )}
            {race.status === 'finished' && (
              <Badge variant="finished">COMPLETED</Badge>
            )}
            {race.hasSprint && <Badge variant="sprint">SPRINT</Badge>}
            {/* The "Open" state is already conveyed by the cyan countdown badge —
                only surface this status pill when it adds new info (Closing Soon, Locked). */}
            {isPredictable && lockStatus.urgency !== 'open' && (
              <span
                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${getLockUrgencyBadgeClassName(lockStatus.badgeTone)} ${
                  lockStatus.shouldPulse ? 'animate-pulse' : ''
                }`}
              >
                {lockStatus.label}
              </span>
            )}
            {isNotYetOpen && predictionOpenAt != null && (
              <span
                className="inline-flex items-center rounded-full border border-border-strong/70 bg-surface-elevated px-2 py-0.5 text-xs font-medium text-text"
                suppressHydrationWarning
              >
                Opens {formatDateLong(predictionOpenAt)}
              </span>
            )}
            {isPredictable && (
              <PredictionCountdownBadge
                predictionLockAt={nextSessionLockAt}
                labelMode="lock"
              />
            )}
            {race.status === 'locked' && (
              <span className="inline-flex items-center rounded-full bg-warning-muted px-2 py-0.5 text-xs font-medium text-warning tabular-nums">
                {race.raceStartAt > now ? (
                  <Countdown timestamp={race.raceStartAt} suffix="until race" />
                ) : (
                  'Results pending'
                )}
              </span>
            )}
          </div>

          {/* Weekend sessions */}
          {scheduleEntries.length > 0 && (
            <div className="mt-0.5 flex flex-1 flex-col border-t border-border/60 pt-1.5">
              <div className="mb-1 flex items-center justify-between text-[11px] font-medium tracking-wide text-text-muted uppercase">
                <span className="inline-flex items-center gap-1">
                  <Calendar size={12} aria-hidden />
                  Weekend Sessions
                </span>
                {timezoneLabel ? (
                  <span suppressHydrationWarning>{timezoneLabel}</span>
                ) : null}
              </div>
              <div className="grid flex-1 grid-cols-[auto_1fr] content-end items-baseline gap-x-2 gap-y-1 text-sm text-text-muted">
                {scheduleEntries.map((entry) => (
                  <div key={entry.type} className="contents">
                    <span
                      className={`font-medium ${
                        entry.type === 'race' ? 'text-text' : ''
                      }`}
                    >
                      {SESSION_LABELS[entry.type]}
                    </span>
                    <span
                      suppressHydrationWarning
                      className={`text-right tabular-nums ${
                        entry.type === 'race' ? 'font-semibold text-text' : ''
                      }`}
                    >
                      {formatDate(entry.startAt)} · {formatTime(entry.startAt)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
