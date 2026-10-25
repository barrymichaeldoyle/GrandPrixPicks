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

/**
 * "just now", "5m ago", "3h ago", "12d ago", then a date.
 *
 * Relative for as long as relative means something. "142d ago" is a worse
 * answer than a date: past a month nobody is counting days, and the season is
 * long enough that feed and notification rows really do get that old. Older
 * than this year, the date carries the year.
 *
 * One copy for both apps. There were four, and the notification bell's had
 * already drifted from the feed's (30 days against 7, a year against none).
 */
export function formatRelativeTime(
  timestamp: number,
  now: number = Date.now(),
): string {
  const minutes = Math.floor((now - timestamp) / 60_000);
  if (minutes < 1) {
    return 'just now';
  }
  if (minutes < 60) {
    return `${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 30) {
    return `${days}d ago`;
  }
  const created = new Date(timestamp);
  return created.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(created.getFullYear() === new Date(now).getFullYear()
      ? {}
      : { year: 'numeric' }),
  });
}
