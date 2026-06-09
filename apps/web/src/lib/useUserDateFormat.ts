import { api } from '@convex-generated/api';
import { useQuery } from 'convex/react';

import type { UserDateSettings } from './date';
import {
  formatCalendarDate,
  formatDate,
  formatDateLong,
  formatDateTime,
  formatInTimeZone,
  formatMonthDay,
  formatTime,
} from './date';

type DateLike = number | string | Date;

/**
 * Read the viewer's saved timezone + locale from Convex and return
 * `lib/date.ts` formatters pre-bound to them. While `me` is undefined
 * (loading or signed out) the formatters fall back to device default.
 */
export function useUserDateFormat() {
  const me = useQuery(api.users.me);
  const settings: UserDateSettings = {
    timezone: me?.timezone ?? undefined,
    locale: me?.locale ?? undefined,
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
  };
}
