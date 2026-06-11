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

/** Human-readable countdown (e.g. "23d 3h 5m 9s" or "2h 30m 15s"). */
function getTimeUntil(timestamp: number): string {
  const parts = getCountdownParts(timestamp - Date.now());

  if (!parts) {
    return 'Started';
  }

  const { days, hours, minutes, seconds } = parts;
  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }
  return `${hours}h ${minutes}m ${seconds}s`;
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
