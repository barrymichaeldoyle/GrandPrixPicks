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
