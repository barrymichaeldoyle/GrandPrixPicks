/**
 * The landing hero's countdown arithmetic.
 *
 * Precision is what changes with distance, not the format. Days, hours and
 * minutes inside the week (never seconds: a column redrawing sixty times a
 * minute is noise, and the picker below is where attention should end up), and
 * a lone day count outside it, because at nineteen days the hours and minutes
 * are digits nobody can act on.
 */

/**
 * Inside this window the hours and minutes are worth their space.
 *
 * A week rather than three days: between those two marks "06 14 22" still
 * reads as a deadline you are inside of, and it gets smaller every time the
 * visitor comes back.
 */
const COUNTDOWN_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Below a minute the segments are all zero, and "00 00 00" under three unit
 * labels reads as a broken clock rather than the most urgent minute on the
 * page, so the last minute before a session closes says so in words.
 */
export const IMMINENT_MS = 60_000;

type ClockUnit = 'day' | 'hour' | 'minute';
export type ClockSegment = { value: number; unit: ClockUnit };

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
export function unitWord({ value, unit }: ClockSegment) {
  return value === 1 ? unit : PLURALS[unit];
}

export function accessibleSegment(segment: ClockSegment) {
  return `${segment.value} ${unitWord(segment)}`;
}

export function segmentsFor(msRemaining: number): ClockSegment[] {
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
