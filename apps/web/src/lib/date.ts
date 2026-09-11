/**
 * Shared date/time formatting for race and prediction UI.
 *
 * Every formatter accepts an optional `{ timezone, locale }` so the viewer's
 * saved Settings can override the device default. For React components, prefer
 * the `useUserDateFormat()` hook (in `./useUserDateFormat.ts`) which pulls
 * those values from Convex and returns pre-bound helpers.
 */

import type { UserDateSettings } from '@grandprixpicks/shared/dates';
import { getCountdownParts } from '@grandprixpicks/shared/dates';
import { useEffect, useState } from 'react';

export type { UserDateSettings } from '@grandprixpicks/shared/dates';

type DateLike = number | string | Date;

function toDateInput(value: DateLike): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Merge `timeZone` into the base options only when settings.timezone is set —
 * keeps the options object identical when no user setting is provided, which
 * matters for tests that assert exact `toLocaleX` call shapes.
 */
function withTimeZone(
  base: Intl.DateTimeFormatOptions,
  settings?: UserDateSettings,
): Intl.DateTimeFormatOptions {
  if (settings?.timezone) {
    return { ...base, timeZone: settings.timezone };
  }
  return base;
}

export function formatDate(
  timestamp: DateLike,
  settings?: UserDateSettings,
): string {
  return toDateInput(timestamp).toLocaleDateString(
    settings?.locale,
    withTimeZone(
      { weekday: 'short', month: 'short', day: 'numeric' },
      settings,
    ),
  );
}

export function formatTime(
  timestamp: DateLike,
  settings?: UserDateSettings,
): string {
  return toDateInput(timestamp).toLocaleTimeString(
    settings?.locale,
    withTimeZone({ hour: 'numeric', minute: '2-digit' }, settings),
  );
}

export function formatDateLong(
  timestamp: DateLike,
  settings?: UserDateSettings,
): string {
  return toDateInput(timestamp).toLocaleDateString(
    settings?.locale,
    withTimeZone(
      { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' },
      settings,
    ),
  );
}

export function formatMonthDay(
  timestamp: DateLike,
  settings?: UserDateSettings,
): string {
  return toDateInput(timestamp).toLocaleDateString(
    settings?.locale,
    withTimeZone({ month: 'short', day: 'numeric' }, settings),
  );
}

export function formatDateTime(
  timestamp: DateLike,
  settings?: UserDateSettings,
): string {
  if (!settings || (!settings.timezone && !settings.locale)) {
    return toDateInput(timestamp).toLocaleString();
  }
  return toDateInput(timestamp).toLocaleString(
    settings.locale,
    settings.timezone ? { timeZone: settings.timezone } : undefined,
  );
}

export function formatCalendarDate(
  timestamp: DateLike,
  settings?: UserDateSettings,
): string {
  return toDateInput(timestamp).toLocaleDateString(
    settings?.locale,
    withTimeZone({ year: 'numeric', month: 'long', day: 'numeric' }, settings),
  );
}

/**
 * `5 Sep 2026`, in UTC, for a date on a public page.
 *
 * Deliberately not viewer-local like `formatDate`: this renders during SSR into
 * HTML that a crawler reads and a cache serves to everyone, so a timezone-
 * dependent string would either mismatch on hydration or hand one visitor's
 * date to the next. The day a story was published is not a local fact anyway.
 */
export function formatUtcDate(timestamp: DateLike): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(toDateInput(timestamp));
}

/** `2026-09-05`, for the `datetime` attribute beside `formatUtcDate`. */
export function utcDateAttribute(timestamp: DateLike): string {
  return toDateInput(timestamp).toISOString().slice(0, 10);
}

export function formatInTimeZone(
  timestamp: DateLike,
  timeZone: string,
  options: Intl.DateTimeFormatOptions,
  settings?: UserDateSettings,
): string {
  try {
    return new Intl.DateTimeFormat(settings?.locale, {
      ...options,
      timeZone,
    }).format(toDateInput(timestamp));
  } catch {
    return new Intl.DateTimeFormat(undefined, options).format(
      toDateInput(timestamp),
    );
  }
}

export function formatTimeZoneAbbreviation(
  timestamp: DateLike,
  timeZone: string,
  settings?: UserDateSettings,
): string | undefined {
  try {
    return new Intl.DateTimeFormat(settings?.locale, {
      timeZone,
      timeZoneName: 'short',
    })
      .formatToParts(toDateInput(timestamp))
      .find((part) => part.type === 'timeZoneName')?.value;
  } catch {
    return undefined;
  }
}

/** "Fri 17:00" — weekday and clock. The card around it names the zone. */
export function formatSessionClockTime(
  timestamp: number,
  timeZone: string,
): string {
  return new Intl.DateTimeFormat('en-GB', {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone,
  }).format(timestamp);
}

/** Zero-padded countdown, omitting seconds while at least one day remains. */
function getTimeUntil(timestamp: number): string {
  const parts = getCountdownParts(timestamp - Date.now());

  if (!parts) {
    return 'Started';
  }

  const { days, hours, minutes, seconds } = parts;

  function pad(value: number): string {
    return String(value).padStart(2, '0');
  }

  if (days > 0) {
    return `${pad(days)}d ${pad(hours)}h ${pad(minutes)}m`;
  }
  return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

/** Live countdown that ticks every second. */
export function useCountdown(timestamp: number): string {
  const [label, setLabel] = useState(() => getTimeUntil(timestamp));

  useEffect(() => {
    function tick() {
      setLabel(getTimeUntil(timestamp));
    }
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [timestamp]);

  return label;
}

/**
 * Minute precision, on a 30s tick.
 *
 * Seconds on an editorial page are the only motion in the block, and they pull
 * the eye off the classification the countdown is sitting under.
 */
export function useMinuteCountdown(timestamp: number): string {
  const [label, setLabel] = useState(() => formatMinutesUntil(timestamp));

  useEffect(() => {
    function tick() {
      setLabel(formatMinutesUntil(timestamp));
    }
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [timestamp]);

  return label;
}

function formatMinutesUntil(timestamp: number): string {
  const remaining = timestamp - Date.now();
  if (remaining <= 0) {
    return 'Started';
  }
  const totalMinutes = Math.floor(remaining / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  const pad = (value: number) => value.toString().padStart(2, '0');
  return days > 0
    ? `${pad(days)}d ${pad(hours)}h ${pad(minutes)}m`
    : `${pad(hours)}h ${pad(minutes)}m`;
}
