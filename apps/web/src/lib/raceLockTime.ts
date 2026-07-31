import { getRaceTimeZoneFromSlug } from '@grandprixpicks/shared/raceTimezones';

/**
 * "Saturday, 14:00 CEST" for a session start, in the circuit's own timezone.
 *
 * Track-local rather than viewer-local on purpose: this string sits next to the
 * GP name as a fact about the event ("Locks Saturday, 14:00 CEST"), the same way
 * a broadcast schedule quotes it. The viewer's own countdown is the thing that
 * tells them how long they personally have left.
 *
 * Because the timezone is explicit, the server and the client format the same
 * string, so this is safe to render during SSR.
 */
export function formatRaceLocalLockTime(
  startAt: number,
  raceSlug: string,
): string | null {
  const timeZone = getRaceTimeZoneFromSlug(raceSlug);
  if (!timeZone) {
    return null;
  }

  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'short',
    }).formatToParts(new Date(startAt));

    function get(type: Intl.DateTimeFormatPartTypes) {
      return parts.find((part) => part.type === type)?.value ?? '';
    }

    const weekday = get('weekday');
    const hour = get('hour');
    const minute = get('minute');
    const zone = get('timeZoneName');

    if (!weekday || !hour || !minute) {
      return null;
    }

    // Zones without a letter abbreviation format as "GMT+4"; that still reads
    // fine, it just isn't worth a leading space when it's missing entirely.
    return zone
      ? `${weekday}, ${hour}:${minute} ${zone}`
      : `${weekday}, ${hour}:${minute}`;
  } catch {
    // An unknown IANA zone throws rather than falling back. Callers treat null
    // as "just don't show the lock time".
    return null;
  }
}

/**
 * The same instant split into a dated headline and its time: `{ date: "Sat 23
 * Aug", time: "14:00 CEST" }`.
 *
 * Used where a countdown would be counter-productive. A deadline three weeks
 * out rendered as ticking digits reads as "no rush"; the calendar date reads as
 * a fixture to plan around. Same timezone rules as
 * {@link formatRaceLocalLockTime}, so it is equally SSR-safe.
 */
export function formatRaceLocalLockDate(
  startAt: number,
  raceSlug: string,
): { date: string; time: string } | null {
  const timeZone = getRaceTimeZoneFromSlug(raceSlug);
  if (!timeZone) {
    return null;
  }

  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'short',
    }).formatToParts(new Date(startAt));

    function get(type: Intl.DateTimeFormatPartTypes) {
      return parts.find((part) => part.type === type)?.value ?? '';
    }

    const weekday = get('weekday');
    const day = get('day');
    const month = get('month');
    const hour = get('hour');
    const minute = get('minute');
    const zone = get('timeZoneName');

    if (!weekday || !day || !month || !hour || !minute) {
      return null;
    }

    return {
      date: `${weekday} ${day} ${month}`,
      time: zone ? `${hour}:${minute} ${zone}` : `${hour}:${minute}`,
    };
  } catch {
    return null;
  }
}

/**
 * The same split as {@link formatRaceLocalLockDate}, but in the *viewer's* own
 * timezone: `{ date: "Fri 21 Aug", time: "16:30 SAST" }`.
 *
 * Track-local is right for a schedule fact quoted beside the GP name, and wrong
 * for a deadline the visitor has to personally beat — "16:30 CEST" makes a
 * reader in Johannesburg or Austin do arithmetic before they know whether they
 * have tonight or next week. The instant is identical; only the frame of
 * reference changes.
 *
 * Unlike its track-local sibling this resolves the zone from the host, so the
 * server (UTC on Cloudflare) and the browser disagree. It is deliberately NOT
 * SSR-safe: callers render the track-local string first and swap this in after
 * mount.
 */
export function formatViewerLockDate(
  startAt: number,
): { date: string; time: string } | null {
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      timeZoneName: 'short',
    }).formatToParts(new Date(startAt));

    function get(type: Intl.DateTimeFormatPartTypes) {
      return parts.find((part) => part.type === type)?.value ?? '';
    }

    const weekday = get('weekday');
    const day = get('day');
    const month = get('month');
    const hour = get('hour');
    const minute = get('minute');
    const zone = get('timeZoneName');

    if (!weekday || !day || !month || !hour || !minute) {
      return null;
    }

    return {
      date: `${weekday} ${day} ${month}`,
      time: zone ? `${hour}:${minute} ${zone}` : `${hour}:${minute}`,
    };
  } catch {
    return null;
  }
}
