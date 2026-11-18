import type { Doc } from '@convex-generated/dataModel';
import { getSessionsForWeekend } from '@grandprixpicks/shared/sessions';

import { getRaceSessionLockAt } from './raceSessions';

/**
 * The pick-lock calendar: one event per race weekend, at the moment the
 * weekend's first picks lock, served as a subscribable feed from
 * `/calendar/picks.ics` (`apps/web/server/routes/calendar/picks.ics.ts`).
 *
 * Why it exists: new players save their first card in one sitting and never
 * come back for the second weekend. Email reminders reach them and are not
 * opened, and web push reaches almost none of them (iOS needs the site
 * installed first). A calendar subscription needs no permission prompt, lands
 * on the phone at the right time, and carries next season's rounds the moment
 * they are seeded.
 *
 * Public on purpose: lock times are public, so the feed needs no per-player
 * token and one cached copy serves everyone.
 */

const CRLF = '\r\n';
const KEEP_FINISHED_MS = 3 * 24 * 60 * 60 * 1000;
/** Long enough to show as a block in a day view, short enough not to sit on the session. */
const EVENT_MINUTES = 15;

type LockRace = Pick<
  Doc<'races'>,
  | 'name'
  | 'slug'
  | 'season'
  | 'round'
  | 'status'
  | 'hasSprint'
  | 'raceStartAt'
  | 'predictionLockAt'
  | 'qualiLockAt'
  | 'sprintQualiLockAt'
  | 'sprintLockAt'
>;

const FIRST_SESSION_LABEL = {
  quali: 'qualifying',
  sprint_quali: 'sprint qualifying',
  sprint: 'sprint',
  race: 'race',
} as const;

/** `20261121T060000Z`. */
function icsTime(ms: number): string {
  return new Date(ms)
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
}

/** RFC 5545 §3.3.11: backslash, semicolon, comma and newline are escaped. */
function icsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * RFC 5545 §3.1: lines longer than 75 octets are folded, continuing with a
 * single space. Folded on UTF-8 bytes so a multi-byte character (São Paulo)
 * is never split.
 */
function fold(line: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) {
    return line;
  }
  const parts: string[] = [];
  let current = '';
  let currentBytes = 0;
  for (const char of line) {
    const bytes = encoder.encode(char).length;
    const limit = parts.length === 0 ? 75 : 74;
    if (currentBytes + bytes > limit) {
      parts.push(current);
      current = '';
      currentBytes = 0;
    }
    current += char;
    currentBytes += bytes;
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}

/** "Las Vegas Grand Prix" → "Las Vegas GP", for a calendar line. */
function shortRaceName(name: string): string {
  return name.replace(/ Grand Prix$/, ' GP');
}

/** The weekend's first lock and which session it belongs to. */
export function firstLock(race: LockRace) {
  let first: {
    session: keyof typeof FIRST_SESSION_LABEL;
    lockAt: number;
  } | null = null;
  for (const session of getSessionsForWeekend(Boolean(race.hasSprint))) {
    const lockAt = getRaceSessionLockAt(race as Doc<'races'>, session);
    if (!first || lockAt < first.lockAt) {
      first = { session, lockAt };
    }
  }
  return first;
}

export function buildLocksCalendar({
  races,
  now,
  siteUrl,
}: {
  races: readonly LockRace[];
  now: number;
  siteUrl: string;
}): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Grand Prix Picks//Pick locks//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Grand Prix Picks: pick locks',
    'X-WR-CALDESC:When each race weekend’s F1 picks lock.',
    // Ask subscribers' apps to refresh twice a day, so a rescheduled session
    // moves in their calendar without them doing anything.
    'REFRESH-INTERVAL;VALUE=DURATION:PT12H',
    'X-PUBLISHED-TTL:PT12H',
  ];

  const stamp = icsTime(now);
  for (const race of races) {
    if (race.status === 'cancelled') {
      continue;
    }
    if (race.raceStartAt < now - KEEP_FINISHED_MS) {
      continue;
    }
    const lock = firstLock(race);
    if (!lock) {
      continue;
    }
    const url = `${siteUrl}/races/${race.slug}?utm_source=calendar&utm_medium=ics`;
    const sessionLabel = FIRST_SESSION_LABEL[lock.session];
    lines.push(
      'BEGIN:VEVENT',
      `UID:picks-lock-${race.slug}@grandprixpicks.com`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${icsTime(lock.lockAt)}`,
      `DTEND:${icsTime(lock.lockAt + EVENT_MINUTES * 60_000)}`,
      `SUMMARY:${icsText(`Picks lock: ${shortRaceName(race.name)} ${sessionLabel}`)}`,
      `DESCRIPTION:${icsText(
        `Your ${race.name} picks lock when ${sessionLabel} starts. Each later session locks at its own start.\n\nMake or change your picks: ${url}`,
      )}`,
      `URL:${url}`,
      'TRANSP:TRANSPARENT',
      // A day ahead to plan, and an hour ahead to act. Some calendar apps drop
      // alarms from subscribed feeds; the event still shows on the day.
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${icsText(`${shortRaceName(race.name)} picks lock tomorrow`)}`,
      'TRIGGER:-P1D',
      'END:VALARM',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${icsText(`${shortRaceName(race.name)} picks lock in an hour`)}`,
      'TRIGGER:-PT1H',
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(fold).join(CRLF) + CRLF;
}

/** The feed's address, and the two ways to subscribe to it. */
export function locksCalendarLinks(siteUrl: string) {
  const feed = `${siteUrl}/calendar/picks.ics`;
  const webcal = feed.replace(/^https?:/, 'webcal:');
  return {
    feed,
    webcal,
    google: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`,
  };
}
