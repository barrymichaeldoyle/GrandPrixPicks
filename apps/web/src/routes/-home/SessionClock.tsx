import { formatLockCountdown } from '@grandprixpicks/shared/picks';
import { useEffect, useState } from 'react';

import { Flag } from '@/components/Flag';
import { abbreviateGrandPrix } from '@/lib/display';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import {
  formatRaceLocalLockDate,
  formatViewerLockDate,
} from '@/lib/raceLockTime';

/**
 * The lock deadline as a session clock, not a badge.
 *
 * This is the page's largest piece of data, so it is structural: GP name and
 * flag, what is locking, then the digits. Days/hours/minutes only — a seconds
 * column on a deadline three days out is noise that redraws sixty times a
 * minute, and the picker below it is where the attention should end up.
 *
 * Outside the urgency window the digits are replaced by the date. "21 : 03 :
 * 04" is a countdown that argues against itself: three weeks of runway reads
 * as "come back later", which is the opposite of what a deadline is for. A
 * date is a fixture to plan around, and the clock starts ticking when the tick
 * means something.
 */

/** Inside this window the deadline is close enough that digits create urgency. */
const COUNTDOWN_WINDOW_MS = 72 * 60 * 60 * 1000;

type ClockSegment = { value: number; unit: string };

const ACCESSIBLE_UNITS = {
  D: ['day', 'days'],
  H: ['hour', 'hours'],
  M: ['minute', 'minutes'],
} as const;

function accessibleSegment({ value, unit }: ClockSegment) {
  const labels = ACCESSIBLE_UNITS[unit as keyof typeof ACCESSIBLE_UNITS];
  return `${value} ${value === 1 ? labels[0] : labels[1]}`;
}

function segmentsFor(msRemaining: number): ClockSegment[] {
  const totalMinutes = Math.max(0, Math.floor(msRemaining / 60_000));
  return [
    { value: Math.floor(totalMinutes / 1440), unit: 'D' },
    { value: Math.floor((totalMinutes % 1440) / 60), unit: 'H' },
    { value: totalMinutes % 60, unit: 'M' },
  ];
}

/**
 * The lock instant in the visitor's own timezone, or null until mounted.
 *
 * The date branch has to render something during SSR, and only the circuit's
 * zone is knowable there — the server runs in UTC, so formatting for "the
 * viewer" on the server means formatting for the wrong person and mismatching
 * every hydration. So the first paint is track-local and this swaps in the
 * visitor's zone once there is a browser to ask. Both strings are the same
 * instant at the same width, so the swap costs no layout.
 */
function useViewerLockDate(lockAt: number | undefined, enabled: boolean) {
  const [viewerDate, setViewerDate] = useState<{
    date: string;
    time: string;
  } | null>(null);

  useEffect(() => {
    setViewerDate(
      enabled && lockAt !== undefined ? formatViewerLockDate(lockAt) : null,
    );
  }, [lockAt, enabled]);

  return viewerDate;
}

function useLockDateDisplay({
  locked,
  lockAt,
  msRemaining,
  raceSlug,
}: {
  locked: boolean;
  lockAt: number | undefined;
  msRemaining: number;
  raceSlug: string;
}) {
  // Falls back to the countdown when the circuit's timezone is unknown: an
  // undated "locks at 14:00" would be worse than digits.
  const trackDate =
    !locked && lockAt !== undefined && msRemaining > COUNTDOWN_WINDOW_MS
      ? formatRaceLocalLockDate(lockAt, raceSlug)
      : null;
  // Whether we show a date at all stays keyed off the *track* zone, so the
  // date-vs-digits choice is identical on server and client and nothing
  // reflows after mount. Only the zone the date is expressed in changes.
  const viewerDate = useViewerLockDate(lockAt, trackDate !== null);
  return viewerDate ?? trackDate;
}

export function SessionClock({
  raceName,
  raceSlug,
  sessionLabel,
  msRemaining,
  lockAt,
  size = 'lg',
}: {
  raceName: string;
  raceSlug: string;
  /**
   * Session whose picks lock next, spelled out — "Sprint Qualifying", not
   * "Sprint Quali". This is the first F1 word a first-time visitor reads, so it
   * takes the full label even though the compact one is fine in product UI.
   */
  sessionLabel: string;
  msRemaining: number;
  /**
   * Instant the session locks. Supplied, a deadline further out than the
   * urgency window shows as a track-local date instead of a countdown.
   */
  lockAt?: number;
  size?: 'lg' | 'sm';
}) {
  const countryCode = getCountryCodeForRace({ slug: raceSlug });
  const locked = msRemaining <= 0;
  const segments = segmentsFor(msRemaining);
  const large = size === 'lg';
  const lockDate = useLockDateDisplay({
    locked,
    lockAt,
    msRemaining,
    raceSlug,
  });

  return (
    <div>
      <p
        className={`flex items-center gap-2 font-medium tracking-label uppercase ${
          large ? 'text-sm' : 'text-xs'
        }`}
      >
        {countryCode ? (
          <Flag code={countryCode} size={large ? 'sm' : 'xs'} />
        ) : null}
        <span className="text-text">{raceName}</span>
      </p>

      {/*
       * "Sprint Quali picks lock" stacks three pieces of jargon before the
       * reader gets to a verb they can act on. "Next deadline" is the frame
       * anyone understands on sight; the session name then says which deadline,
       * and the digits below say the rest. The word "picks" stays because it is
       * the only thing here naming what the visitor actually does.
       */}
      <p className="gpp-label mt-2">
        {locked
          ? `${sessionLabel} picks are locked`
          : `Next deadline · ${sessionLabel} picks`}
      </p>

      {locked ? (
        <p
          className={`gpp-mono mt-2 text-text-muted ${large ? 'text-3xl' : 'text-xl'}`}
          suppressHydrationWarning
        >
          Locked
        </p>
      ) : lockDate ? (
        <div className="mt-2" suppressHydrationWarning>
          <p
            className={`gpp-mono leading-none font-light text-text ${
              large ? 'text-4xl sm:text-5xl' : 'text-xl'
            }`}
          >
            {lockDate.date}
          </p>
          {/*
           * Date + time is two renderings of the same instant — enough on its
           * own. Hanging "locks in 20 days" off that would say "no rush", so
           * far-out deadlines reframe as invitation instead of countdown.
           */}
          <p className={`gpp-label mt-2 ${large ? '' : 'text-[0.625rem]'}`}>
            {lockDate.time} · Picks open now
          </p>
        </div>
      ) : (
        <div
          className="mt-2 flex items-start gap-3 sm:gap-4"
          suppressHydrationWarning
          role="timer"
          aria-label={`${sessionLabel} picks lock in ${segments
            .map(accessibleSegment)
            .join(', ')}`}
        >
          {segments.map((segment, index) => (
            <div key={segment.unit} className="flex items-start gap-3 sm:gap-4">
              {index > 0 ? (
                <span
                  className={`gpp-mono text-border-strong ${
                    large ? 'text-4xl sm:text-5xl' : 'text-xl'
                  }`}
                  aria-hidden="true"
                >
                  :
                </span>
              ) : null}
              <span className="flex flex-col items-center">
                <span
                  className={`gpp-mono leading-none font-light text-text ${
                    large ? 'text-4xl sm:text-5xl' : 'text-xl'
                  }`}
                >
                  {segment.value.toString().padStart(2, '0')}
                </span>
                <span
                  className={`gpp-label mt-1.5 ${large ? '' : 'text-[0.625rem]'}`}
                  aria-hidden="true"
                >
                  {segment.unit}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Single-line deadline for the mobile hero fold.
 *
 * The full {@link SessionClock} is the right column on desktop. Stacked on a
 * phone it stole the lead from the headline, so phones get this chip instead:
 * flag, abbreviated GP, session, and one lock fact — date when far out,
 * countdown only inside the urgency window.
 */
export function SessionClockChip({
  raceName,
  raceSlug,
  sessionLabel,
  msRemaining,
  lockAt,
}: {
  raceName: string;
  raceSlug: string;
  /** Compact session label — "Sprint Quali", not "Sprint Qualifying". */
  sessionLabel: string;
  msRemaining: number;
  lockAt?: number;
}) {
  const countryCode = getCountryCodeForRace({ slug: raceSlug });
  const shortName = abbreviateGrandPrix(raceName);
  const locked = msRemaining <= 0;
  const lockDate = useLockDateDisplay({
    locked,
    lockAt,
    msRemaining,
    raceSlug,
  });

  let detail: string;
  if (locked) {
    detail = `${sessionLabel} picks are locked`;
  } else if (lockDate) {
    detail = `${sessionLabel} locks ${lockDate.date}, ${lockDate.time}`;
  } else {
    detail = `${sessionLabel} locks in ${formatLockCountdown(msRemaining)}`;
  }

  return (
    // Primary text, not muted: the lock time is the urgency payload, so it
    // has to clear contrast at `text-xs`. Weight alone separates the GP name.
    <p className="flex min-w-0 items-center gap-1.5 text-xs text-text">
      {countryCode ? <Flag code={countryCode} size="xs" /> : null}
      <span className="min-w-0 truncate" suppressHydrationWarning>
        <span className="font-medium">{shortName}</span>
        {' · '}
        {detail}
      </span>
    </p>
  );
}
