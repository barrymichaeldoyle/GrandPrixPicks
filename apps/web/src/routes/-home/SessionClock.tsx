import { formatLockCountdown } from '@grandprixpicks/shared/picks';
import { useEffect, useState } from 'react';

import { Flag } from '@/components/Flag';
import { abbreviateGrandPrix } from '@/lib/display';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import { getCircuitForRace } from '@grandprixpicks/shared/circuits';
import {
  formatRaceLocalLockDate,
  formatViewerLockDate,
} from '@/lib/raceLockTime';

/**
 * The lock deadline as a session clock, not a badge.
 *
 * This is the page's largest piece of data, so it is structural: GP name and
 * flag, what is locking, then the digits. The digits are always a countdown —
 * a date makes the reader work out the distance from today before they know
 * anything, and "how long have I got" is the only question this block exists to
 * answer. The instant itself rides underneath, where it answers the follow-up.
 *
 * Precision is what changes with distance, not the format. Days/hours/minutes
 * inside the week (never seconds: a column redrawing sixty times a minute is
 * noise, and the picker below is where attention should end up), and a lone day
 * count outside it, because at nineteen days the hours and minutes are two
 * thirds of a hero spent on digits nobody can act on.
 */

/**
 * Inside this window the hours and minutes are worth their space.
 *
 * A week rather than three days: between those two marks "06 : 14 : 22" still
 * reads as a deadline you are inside of, and it gets smaller every time the
 * visitor comes back.
 */
const COUNTDOWN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Below a minute the segments are all zero, and "00 00 00" under three unit
 * labels reads as a broken clock rather than the most urgent minute on the
 * page. `locked` only fires at zero, so without this the last 60 seconds
 * before a session closes were the worst-looking state in the hero.
 */
const IMMINENT_MS = 60_000;

type ClockUnit = 'day' | 'hour' | 'minute';
type ClockSegment = { value: number; unit: ClockUnit };

const PLURALS: Record<ClockUnit, string> = {
  day: 'days',
  hour: 'hours',
  minute: 'minutes',
};

/**
 * "12 hours" — one wording for the label under the digits and the spoken
 * countdown, so an abbreviation can never drift from what it stands for.
 *
 * Spelled out rather than D / H / M: the letters read as a code the visitor has
 * to break, and a deadline is the last place to ask for that.
 */
function unitWord({ value, unit }: ClockSegment) {
  return value === 1 ? unit : PLURALS[unit];
}

function accessibleSegment(segment: ClockSegment) {
  return `${segment.value} ${unitWord(segment)}`;
}

function segmentsFor(msRemaining: number): ClockSegment[] {
  const totalMinutes = Math.max(0, Math.floor(msRemaining / 60_000));
  const days = Math.floor(totalMinutes / 1440);

  if (msRemaining > COUNTDOWN_WINDOW_MS) {
    return [{ value: days, unit: 'day' }];
  }

  return [
    { value: days, unit: 'day' },
    { value: Math.floor((totalMinutes % 1440) / 60), unit: 'hour' },
    { value: totalMinutes % 60, unit: 'minute' },
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

/**
 * The lock instant as `{ date, time }`, or null when the circuit's timezone is
 * unknown. Resolved whichever branch is on screen: far out it is the headline,
 * inside the urgency window it is the line under the digits saying which
 * instant they are counting down to.
 */
function useLockDateDisplay({
  locked,
  lockAt,
  raceSlug,
}: {
  locked: boolean;
  lockAt: number | undefined;
  raceSlug: string;
}) {
  const trackDate =
    !locked && lockAt !== undefined
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
  round,
  sessionLabel,
  msRemaining,
  lockAt,
  size = 'lg',
}: {
  raceName: string;
  raceSlug: string;
  /** Championship round, shown beside the circuit as quiet context. */
  round?: number;
  /**
   * Session whose picks lock next, spelled out — "Sprint Qualifying", not
   * "Sprint Quali". This is the first F1 word a first-time visitor reads, so it
   * takes the full label even though the compact one is fine in product UI.
   */
  sessionLabel: string;
  msRemaining: number;
  /**
   * Instant the session locks. Supplied, it is named under the countdown, in
   * the circuit's timezone on the server and the viewer's own after mount.
   */
  lockAt?: number;
  size?: 'lg' | 'sm';
}) {
  const countryCode = getCountryCodeForRace({ slug: raceSlug });
  const locked = msRemaining <= 0;
  const imminent = !locked && msRemaining < IMMINENT_MS;
  const segments = segmentsFor(msRemaining);
  const circuit = getCircuitForRace(raceSlug);
  const contextLine = [
    round === undefined ? null : `Round ${round}`,
    circuit?.locality ?? null,
  ]
    .filter(Boolean)
    .join(' · ');
  const large = size === 'lg';
  const lockDate = useLockDateDisplay({ locked, lockAt, raceSlug });
  const farOut = msRemaining > COUNTDOWN_WINDOW_MS;
  const single = segments.length === 1;

  return (
    <div>
      {/* The event, as a name. This used to be set in the tracked uppercase
          micro label, which made the one proper noun in the block read as a
          column header rather than the Grand Prix being counted down to. */}
      <p className="flex items-center gap-2">
        {countryCode ? (
          <Flag code={countryCode} size={large ? 'sm' : 'xs'} />
        ) : null}
        <span
          className={`font-title font-medium text-text ${large ? 'text-lg' : 'text-base'}`}
        >
          {raceName}
        </span>
      </p>
      {contextLine ? (
        <p className="gpp-reading-meta mt-0.5 text-text-muted">{contextLine}</p>
      ) : null}

      {/* The label and countdown read as one direct sentence:
          "Sprint Qualifying picks lock in 19 days." */}
      <p className="gpp-label mt-2">
        {locked
          ? `${sessionLabel} picks are locked`
          : `${sessionLabel} picks lock in`}
      </p>

      {locked ? (
        <p
          className={`gpp-mono mt-2 text-text-muted ${large ? 'text-3xl' : 'text-xl'}`}
          suppressHydrationWarning
        >
          Locked
        </p>
      ) : imminent ? (
        <p
          className={`font-title mt-2 font-medium text-text ${large ? 'text-2xl' : 'text-lg'}`}
          role="timer"
          aria-label={`${sessionLabel} picks lock in under a minute`}
          suppressHydrationWarning
        >
          Under a minute
        </p>
      ) : (
        <div className="mt-2" suppressHydrationWarning>
          <div
            className={
              // A stacked unit under a lone number hangs off the left rag every
              // other line in this block sits on, and the column stack only
              // earns itself when three of them share a row.
              single
                ? 'flex items-baseline gap-2'
                : 'flex items-start gap-3 sm:gap-4'
            }
            role="timer"
            aria-label={`${sessionLabel} picks lock in ${segments
              .map(accessibleSegment)
              .join(', ')}`}
          >
            {single ? (
              // The whole clock is spoken once by the timer's own label, so the
              // visuals stay out of the accessibility tree rather than being
              // read a second time as bare digits.
              <span className="flex items-baseline gap-2" aria-hidden="true">
                <span
                  className={`gpp-mono leading-none font-light text-text ${
                    large ? 'text-4xl sm:text-5xl' : 'text-xl'
                  }`}
                >
                  {segments[0].value}
                </span>
                <span className={`gpp-label ${large ? '' : 'text-[0.625rem]'}`}>
                  {unitWord(segments[0])}
                </span>
              </span>
            ) : (
              segments.map((segment, index) => (
                <div
                  key={segment.unit}
                  className="flex items-start gap-3 sm:gap-4"
                  aria-hidden="true"
                >
                  {index > 0 ? (
                    <span
                      className={`gpp-mono text-border-strong ${
                        large ? 'text-4xl sm:text-5xl' : 'text-xl'
                      }`}
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
                    >
                      {unitWord(segment)}
                    </span>
                  </span>
                </div>
              ))
            )}
          </div>
          {/*
           * The digits say how long is left; they do not say when. Deciding
           * whether you will be around for a deadline needs the instant itself,
           * so it rides underneath in the viewer's own timezone.
           *
           * Far out it carries the invitation too: a day count on its own can
           * be read as "come back later", and this is the line that answers.
           */}
          {lockDate ? (
            <p className={`gpp-label mt-2 ${large ? '' : 'text-[0.625rem]'}`}>
              {lockDate.date} · {lockDate.time}
              {farOut ? ' · Picks open now' : ''}
            </p>
          ) : null}
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
  const lockDate = useLockDateDisplay({ locked, lockAt, raceSlug });
  const showDate = lockDate !== null && msRemaining > COUNTDOWN_WINDOW_MS;

  let detail: string;
  if (locked) {
    detail = `${sessionLabel} picks are locked`;
  } else if (showDate && lockDate) {
    detail = `${sessionLabel} locks ${lockDate.date}, ${lockDate.time}`;
  } else {
    // One line has room for the countdown or the instant, not both, and inside
    // the window the countdown is the half that earns the space.
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
