import { emailColors } from '@grandprixpicks/shared/tokens';
import { render } from 'react-email';
import { describe, expect, it } from 'vitest';

import {
  formatSessionSchedule,
  formatTimeUntil,
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
