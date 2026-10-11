import { api } from '@convex-generated/api';
import { useSyncExternalStore } from 'react';

import { useQuery } from '@/integrations/convex/query';

import type { UserDateSettings } from './date';
import {
  formatCalendarDate,
  formatDate,
  formatDateLong,
  formatDateTime,
  formatInTimeZone,
  formatMonthDay,
  formatTime,
  formatTimeZoneAbbreviation,
} from './date';

type DateLike = number | string | Date;

/**
 * What Cloudflare Workers format with when nothing is passed. Pinned so the
 * hydration render prints exactly what the server sent.
 */
const SERVER_DEFAULTS = { timezone: 'UTC', locale: 'en-US' } as const;

function subscribeNever() {
  return () => {};
}

/** False on the server and through hydration, true for every later render. */
function useHydrated() {
  return useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
}

/**
 * Read the viewer's saved timezone + locale from Convex and return
 * `lib/date.ts` formatters pre-bound to them. While `me` is undefined
 * (loading or signed out) the formatters fall back to device default.
 *
 * The device default is the host's, so the server (UTC, en-US) and the
 * browser disagree. Until hydration has finished the gaps are filled with the
 * server's values, then the browser's own take over. Without that a reader
 * outside the US got a text mismatch on every race page and React discarded
 * the server HTML.
 */
export function useUserDateFormat() {
  const me = useQuery(api.users.me);
  const hydrated = useHydrated();
  const settings: UserDateSettings = {
    timezone: me?.timezone ?? (hydrated ? undefined : SERVER_DEFAULTS.timezone),
    locale: me?.locale ?? (hydrated ? undefined : SERVER_DEFAULTS.locale),
  };

  return {
    settings,
    formatDate: (timestamp: DateLike) => formatDate(timestamp, settings),
    formatTime: (timestamp: DateLike) => formatTime(timestamp, settings),
    formatDateLong: (timestamp: DateLike) =>
      formatDateLong(timestamp, settings),
    formatMonthDay: (timestamp: DateLike) =>
      formatMonthDay(timestamp, settings),
    formatDateTime: (timestamp: DateLike) =>
      formatDateTime(timestamp, settings),
    formatCalendarDate: (timestamp: DateLike) =>
      formatCalendarDate(timestamp, settings),
    formatInTimeZone: (
      timestamp: DateLike,
      timeZone: string,
      options: Intl.DateTimeFormatOptions,
    ) => formatInTimeZone(timestamp, timeZone, options, settings),
    formatTimeZoneAbbreviation: (timestamp: DateLike, timeZone: string) =>
      formatTimeZoneAbbreviation(timestamp, timeZone, settings),
  };
}
