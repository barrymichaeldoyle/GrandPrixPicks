import { describe, expect, it } from 'vitest';

import { buildRaceEmailUrl, buildWeekendLeaderboardEmailUrl } from './urls';

describe('buildRaceEmailUrl', () => {
  it('uses the race slug in reminder links', () => {
    expect(
      buildRaceEmailUrl({
        appUrl: 'https://grandprixpicks.com',
        raceSlug: 'china-2026',
        campaign: 'prediction_reminder',
      }),
    ).toBe(
      'https://grandprixpicks.com/races/china-2026?utm_source=email&utm_medium=email&utm_campaign=prediction_reminder',
    );
  });
});

describe('buildWeekendLeaderboardEmailUrl', () => {
  it('opens the weekend standings for the round the email is about', () => {
    expect(
      buildWeekendLeaderboardEmailUrl({
        appUrl: 'https://grandprixpicks.com',
        raceId: 'k1234567890',
        campaign: 'results',
      }),
    ).toBe(
      'https://grandprixpicks.com/leaderboard?time=weekend&raceId=k1234567890&utm_source=email&utm_medium=email&utm_campaign=results',
    );
  });

  it('pins the round rather than leaving the weekend to default', () => {
    const url = new URL(
      buildWeekendLeaderboardEmailUrl({
        appUrl: 'https://grandprixpicks.com',
        raceId: 'k999',
        campaign: 'results',
      }),
    );
    // Without raceId the page falls back to whatever weekend is current, which
    // is the wrong round for anyone opening the mail a few days late.
    expect(url.searchParams.get('raceId')).toBe('k999');
    expect(url.searchParams.get('time')).toBe('weekend');
  });

  it('carries the email attribution the race links already carry', () => {
    const url = new URL(
      buildWeekendLeaderboardEmailUrl({
        appUrl: 'https://grandprixpicks.com',
        raceId: 'k1',
        campaign: 'results',
      }),
    );
    expect(url.searchParams.get('utm_source')).toBe('email');
    expect(url.searchParams.get('utm_medium')).toBe('email');
    expect(url.searchParams.get('utm_campaign')).toBe('results');
  });
});
