/**
 * Date/time primitives shared between web and mobile.
 *
 * Note: the locale-aware *formatters* deliberately live per-app - web builds on
 * `toLocaleX` (its tests assert exact call shapes) while mobile builds on
 * `Intl.DateTimeFormat`. Only the genuinely platform-agnostic pieces live here.
 */

export type UserDateSettings = {
  /** IANA timezone, e.g. "Europe/London". Falls back to the device default. */
  timezone?: string;
  /** Locale string, e.g. "en-US" / "en-GB". Falls back to the device default. */
  locale?: string;
};

export type CountdownParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;

/**
 * Decompose a remaining-millisecond span into day/hour/minute/second parts.
 *
 * Returns `null` once the span has elapsed (`<= 0`) so each surface can render
 * its own terminal state ("Started", "locked", "Starting now") rather than
 * baking one in here.
 */
export function getCountdownParts(msRemaining: number): CountdownParts | null {
  if (msRemaining <= 0) {
    return null;
  }
  return {
    days: Math.floor(msRemaining / MS_PER_DAY),
    hours: Math.floor((msRemaining % MS_PER_DAY) / MS_PER_HOUR),
    minutes: Math.floor((msRemaining % MS_PER_HOUR) / MS_PER_MINUTE),
    seconds: Math.floor((msRemaining % MS_PER_MINUTE) / MS_PER_SECOND),
  };
}
