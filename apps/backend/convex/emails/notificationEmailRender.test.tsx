import { emailColors } from '@grandprixpicks/shared/tokens';
import { render } from 'react-email';
import { describe, expect, it } from 'vitest';

import {
  formatSessionSchedule,
  formatTimeUntil,
  lastPlayedLine,
  nextRaceLine,
  ordinal,
  podiumLine,
} from './deliverNotificationEmail';
import { PredictionReminderEmail } from './PredictionReminderEmail';
import { ResultsEmailShell } from './ResultsEmail.shared';
import { SignupNudgeEmail } from './SignupNudgeEmail';

const shared = {
  settingsUrl: 'https://grandprixpicks.com/settings',
  unsubscribeUrl: 'https://convex.site/notifications/unsubscribe?token=abc',
  logoUrl: 'https://grandprixpicks.com/logo-email.png',
};

// The inline HTML this replaced was dark. `emailColors` is the light shell, and
// nothing else in the product uses it, so a regression here is invisible
// without an assertion.
describe('notification email templates', () => {
  it('renders the reminder on the light shell, with every open deadline', async () => {
    const html = await render(
      <PredictionReminderEmail
        {...shared}
        raceName="Azerbaijan Grand Prix"
        raceUrl="https://grandprixpicks.com/races/azerbaijan-2026?utm_medium=email"
        timeUntilLock="24 hours"
        round={17}
        countryCode="az"
        sessions={[
          {
            label: 'Qualifying',
            date: 'Sat, 26 Sep',
            time: '12:00 UTC',
            isSprint: false,
          },
          {
            label: 'Race',
            date: 'Sun, 27 Sep',
            time: '11:00 UTC',
            isSprint: false,
          },
        ]}
      />,
    );
    expect(html).toContain(`background-color:${emailColors.page}`);
    expect(html).toContain('Qualifying');
    expect(html).toContain('Sat, 26 Sep');
    expect(html).toContain('Sun, 27 Sep');
    expect(html).toContain('utm_medium=email');
    expect(html).toContain(shared.unsubscribeUrl);
  });

  it('renders the summary with both point totals and the standings CTA', async () => {
    const html = await render(
      <ResultsEmailShell
        {...shared}
        previewText="You scored 31 points at the Azerbaijan Grand Prix."
        headline="You scored 31 points"
        intro="Top 5: 24 points. Head-to-head: 7 points."
        raceName="Azerbaijan Grand Prix"
        raceUrl="https://grandprixpicks.com/leaderboard?time=weekend&raceId=x"
        round={17}
        countryCode="az"
        primaryCtaLabel="See Weekend Standings"
        footerText="You're receiving this because you have result notifications enabled."
      />,
    );
    expect(html).toContain(`background-color:${emailColors.page}`);
    expect(html).toContain('You scored 31 points');
    expect(html).toContain('Top 5: 24 points.');
    expect(html).toContain('Head-to-head: 7 points.');
    expect(html).toContain('See Weekend Standings');
    expect(html).toContain(shared.unsubscribeUrl);
  });

  it('puts the lapsed lead above the deadline, with the write-up link', async () => {
    const html = await render(
      <PredictionReminderEmail
        {...shared}
        raceName="Azerbaijan Grand Prix"
        raceUrl="https://grandprixpicks.com/races/azerbaijan-2026?utm_medium=email"
        timeUntilLock="24 hours"
        round={17}
        countryCode="az"
        sessions={[]}
        lead={{
          headline: 'Baku forecast: 40 km/h gusts for qualifying',
          sourceName: 'FIA',
          writeupUrl:
            'https://grandprixpicks.com/f1-2026-azerbaijan-grand-prix-predictions?utm_medium=email',
        }}
        lastPlayed="Last time out: Italian Grand Prix, 12 points, 2nd of 2."
      />,
    );
    const headlineAt = html.indexOf('Baku forecast');
    const deadlineAt = html.indexOf('lock in');
    expect(headlineAt).toBeGreaterThan(-1);
    expect(headlineAt).toBeLessThan(deadlineAt);
    expect(html).toContain('Read the Azerbaijan Grand Prix write-up');
    expect(html).toContain('Last time out: Italian Grand Prix');
  });

  it('renders the summary details and the next-race button', async () => {
    const html = await render(
      <ResultsEmailShell
        {...shared}
        previewText="You scored 31 points at the Azerbaijan Grand Prix."
        headline="You scored 31 points"
        intro="Top 5: 24 points. Head-to-head: 7 points."
        details={[
          '3rd of 14 players this weekend.',
          'Best pick: Lando Norris P2 in qualifying, 5 points.',
        ]}
        raceName="Azerbaijan Grand Prix"
        raceUrl="https://grandprixpicks.com/leaderboard?time=weekend&raceId=x"
        round={17}
        countryCode="az"
        primaryCtaLabel="See Weekend Standings"
        secondaryCtaLabel="Make Singapore Grand Prix picks"
        secondaryCtaUrl="https://grandprixpicks.com/races/singapore-2026?utm_medium=email"
        helperText="Next: Singapore Grand Prix. Picks lock Fri, 9 Oct, 12:30 UTC."
        footerText="You're receiving this because you have result notifications enabled."
      />,
    );
    expect(html).toContain('3rd of 14 players this weekend.');
    expect(html).toContain(
      'Best pick: Lando Norris P2 in qualifying, 5 points.',
    );
    expect(html).toContain('Make Singapore Grand Prix picks');
    expect(html).toContain('Picks lock Fri, 9 Oct, 12:30 UTC.');
  });

  it('renders the signup nudge with an unsubscribe link', async () => {
    const html = await render(
      <SignupNudgeEmail
        {...shared}
        raceName="Azerbaijan Grand Prix"
        raceUrl="https://grandprixpicks.com/races/azerbaijan-2026"
      />,
    );
    expect(html).toContain(`background-color:${emailColors.page}`);
    expect(html).toContain(shared.unsubscribeUrl);
  });
});

describe('formatTimeUntil', () => {
  it('rounds to whole units', () => {
    expect(formatTimeUntil(24 * 3600000)).toBe('24 hours');
    expect(formatTimeUntil(72 * 3600000)).toBe('3 days');
    expect(formatTimeUntil(90 * 60000)).toBe('2 hours');
    expect(formatTimeUntil(60000)).toBe('1 minute');
  });
});

describe('formatSessionSchedule', () => {
  const sessions = [
    { label: 'Race', startAt: Date.UTC(2026, 8, 27, 11, 0), isSprint: false },
  ];

  it('formats in the viewer timezone', () => {
    const [row] = formatSessionSchedule(sessions, 'Africa/Johannesburg');
    expect(row.date).toBe('Sun, 27 Sep');
    expect(row.time).toContain('13:00');
  });

  it('falls back to UTC rather than throwing on an unusable zone', () => {
    const [row] = formatSessionSchedule(sessions, 'Not/AZone');
    expect(row.time).toContain('11:00');
  });
});

describe('ordinal and last-played line', () => {
  it('handles the teens and the common suffixes', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 111].map(ordinal)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
      '23rd',
      '111th',
    ]);
  });
  it('drops the rank when the weekend was never ranked', () => {
    expect(
      lastPlayedLine({
        raceName: 'Italian Grand Prix',
        points: 0,
        position: null,
        totalPlayers: null,
      }),
    ).toBe('Last time out: Italian Grand Prix, 0 points.');
  });
});

describe('recap lines', () => {
  it('names the podium in one sentence', () => {
    expect(
      podiumLine('Madrid Grand Prix', [
        'Max Verstappen',
        'Lando Norris',
        'Charles Leclerc',
      ]),
    ).toBe(
      'Max Verstappen won the Madrid Grand Prix from Lando Norris and Charles Leclerc.',
    );
    expect(podiumLine('Madrid Grand Prix', ['Max Verstappen'])).toBe(
      'Max Verstappen won the Madrid Grand Prix.',
    );
    expect(podiumLine('Madrid Grand Prix', [])).toBe(
      'The Madrid Grand Prix has been scored.',
    );
  });
  it('states the next lock in the reader timezone', () => {
    expect(
      nextRaceLine(
        { name: 'Azerbaijan Grand Prix', lockAt: Date.UTC(2026, 8, 25, 12) },
        'Asia/Tokyo',
      ),
    ).toBe('Next: Azerbaijan Grand Prix. Picks lock Fri, 25 Sep, 21:00 GMT+9.');
    expect(nextRaceLine(null, undefined)).toBeUndefined();
  });
});
