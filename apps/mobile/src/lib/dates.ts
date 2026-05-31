import { getRaceTimeZoneFromSlug } from '@grandprixpicks/shared/raceTimezones';
import { useQuery } from 'convex/react';

import { api } from '../integrations/convex/api';

export type UserDateSettings = {
  /** IANA timezone, e.g. "Europe/London". Falls back to the device default. */
  timezone?: string;
  /** Locale string, e.g. "en-US" / "en-GB". Falls back to the device default. */
  locale?: string;
};

/**
 * Format a race-related ISO date into "your time" + "track time" pair.
 * Settings (if provided) override the device default — used by user
 * preference (see `useUserDateFormat`).
 */
export function formatRaceDate(
  isoDate: string,
  raceSlug: string,
  settings?: UserDateSettings,
) {
  const date = new Date(isoDate);
  const raceTimeZone = getRaceTimeZoneFromSlug(raceSlug);
  const locale = settings?.locale;
  const tz = settings?.timezone;

  return {
    local: safeFormat(date, locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: tz,
    }),
    track: safeFormat(date, locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: raceTimeZone ?? 'UTC',
    }),
    trackTimeZone: raceTimeZone ?? 'UTC',
  };
}

/**
 * `Intl.DateTimeFormat` throws if given a bad locale/timezone string. Falling
 * back to the device default keeps display alive when prefs are corrupt.
 */
function safeFormat(
  date: Date,
  locale: string | undefined,
  options: Intl.DateTimeFormatOptions,
): string {
  try {
    return new Intl.DateTimeFormat(locale, options).format(date);
  } catch {
    // Drop the (possibly invalid) locale *and* timeZone and fall back to the
    // device default — keeping timeZone here would re-throw on a corrupt
    // saved timezone, defeating the whole point of this guard.
    const { timeZone: _timeZone, ...deviceDefaultOptions } = options;
    return new Intl.DateTimeFormat(undefined, deviceDefaultOptions).format(
      date,
    );
  }
}

/**
 * Read the viewer's saved timezone + locale from Convex and return formatters
 * pre-bound to them. While the query is loading, formatters use the device
 * default — never crashes, never blanks out.
 */
export function useUserDateFormat() {
  const me = useQuery(api.users.me);
  const settings: UserDateSettings = {
    timezone: me?.timezone ?? undefined,
    locale: me?.locale ?? undefined,
  };

  return {
    settings,
    formatRaceDate: (isoDate: string, raceSlug: string) =>
      formatRaceDate(isoDate, raceSlug, settings),
    /** Long form with date + time in the user's preferred zone/locale. */
    formatDateTime: (isoDate: string) =>
      safeFormat(new Date(isoDate), settings.locale, {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: settings.timezone,
      }),
    /** Just the time (e.g. "14:30" / "2:30 PM"). */
    formatTime: (isoDate: string) =>
      safeFormat(new Date(isoDate), settings.locale, {
        timeStyle: 'short',
        timeZone: settings.timezone,
      }),
    /** Short date for calendar rows (e.g. "Sun, May 25"). */
    formatShortDate: (isoDate: string) =>
      safeFormat(new Date(isoDate), settings.locale, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        timeZone: settings.timezone,
      }),
    /** Just the day-of-month, for big date badges. */
    formatDay: (isoDate: string) =>
      safeFormat(new Date(isoDate), settings.locale, {
        day: '2-digit',
        timeZone: settings.timezone,
      }),
    /** Just the abbreviated month, for big date badges. */
    formatMonth: (isoDate: string) =>
      safeFormat(new Date(isoDate), settings.locale, {
        month: 'short',
        timeZone: settings.timezone,
      }),
    /** Long date with year (e.g. "May 25, 2026"). */
    formatLongDate: (isoDate: string) =>
      safeFormat(new Date(isoDate), settings.locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: settings.timezone,
      }),
  };
}
