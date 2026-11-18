import { describe, expect, it } from 'vitest';

import {
  buildLocksCalendar,
  firstLock,
  locksCalendarLinks,
} from './locksCalendar';

const HOUR = 3_600_000;
const now = Date.UTC(2026, 10, 18, 12);

const vegas = {
  name: 'Las Vegas Grand Prix',
  slug: 'las-vegas-2026',
  season: 2026,
  round: 21,
  status: 'upcoming' as const,
  hasSprint: false,
  qualiLockAt: Date.UTC(2026, 10, 21, 4),
  predictionLockAt: Date.UTC(2026, 10, 22, 4),
  raceStartAt: Date.UTC(2026, 10, 22, 4),
};

const qatar = {
  name: 'Qatar Grand Prix',
  slug: 'qatar-2026',
  season: 2026,
  round: 22,
  status: 'upcoming' as const,
  hasSprint: true,
  sprintQualiLockAt: Date.UTC(2026, 10, 27, 17, 30),
  sprintLockAt: Date.UTC(2026, 10, 28, 14),
  qualiLockAt: Date.UTC(2026, 10, 28, 18),
  predictionLockAt: Date.UTC(2026, 10, 29, 16),
  raceStartAt: Date.UTC(2026, 10, 29, 16),
};

describe('firstLock', () => {
  it('is qualifying on a regular weekend and sprint qualifying on a sprint one', () => {
    expect(firstLock(vegas)).toEqual({
      session: 'quali',
      lockAt: vegas.qualiLockAt,
    });
    expect(firstLock(qatar)).toEqual({
      session: 'sprint_quali',
      lockAt: qatar.sprintQualiLockAt,
    });
  });
});

describe('buildLocksCalendar', () => {
  const ics = buildLocksCalendar({
    races: [
      { ...vegas, slug: 'old-2026', raceStartAt: now - 10 * 24 * HOUR },
      { ...vegas, slug: 'gone-2026', status: 'cancelled' as const },
      vegas,
      qatar,
    ],
    now,
    siteUrl: 'https://grandprixpicks.com',
  });

  it('is a valid calendar with CRLF lines', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(
      ics
        .split('\r\n')
        .every((line) => new TextEncoder().encode(line).length <= 75),
    ).toBe(true);
  });

  it('has one event per upcoming weekend, at its first lock', () => {
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(2);
    expect(ics).toContain('UID:picks-lock-las-vegas-2026@grandprixpicks.com');
    expect(ics).toContain('DTSTART:20261121T040000Z');
    expect(ics).toContain('SUMMARY:Picks lock: Las Vegas GP qualifying');
    expect(ics).toContain('DTSTART:20261127T173000Z');
    expect(ics).toContain('SUMMARY:Picks lock: Qatar GP sprint qualifying');
    expect(ics).not.toContain('old-2026');
    expect(ics).not.toContain('gone-2026');
  });

  it('links back to the race with a calendar source and sets two alarms', () => {
    expect(ics).toContain('utm_source=calendar');
    expect(ics.match(/TRIGGER:-P1D/g)).toHaveLength(2);
    expect(ics.match(/TRIGGER:-PT1H/g)).toHaveLength(2);
  });
});

describe('locksCalendarLinks', () => {
  it('offers webcal for Apple and a Google subscribe link', () => {
    const links = locksCalendarLinks('https://grandprixpicks.com');
    expect(links.webcal).toBe('webcal://grandprixpicks.com/calendar/picks.ics');
    expect(links.google).toBe(
      'https://calendar.google.com/calendar/r?cid=webcal%3A%2F%2Fgrandprixpicks.com%2Fcalendar%2Fpicks.ics',
    );
  });
});
