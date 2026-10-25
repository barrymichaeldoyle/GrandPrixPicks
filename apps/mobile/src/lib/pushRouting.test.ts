import { beforeEach, describe, expect, it, vi } from 'vitest';

// The navigator is native; only the calls it receives matter here.
const navigate = vi.fn();
let ready = true;

vi.mock('../navigation/navigationRef', () => ({
  navigationRef: {
    navigate: (...args: unknown[]) => navigate(...args),
    isReady: () => ready,
  },
}));

const openBrowser = vi.fn();
vi.mock('expo-web-browser', () => ({
  openBrowserAsync: (...args: unknown[]) => openBrowser(...args),
}));

import { flushPendingPushRoute, routePushUrl } from './pushRouting';

beforeEach(() => {
  navigate.mockClear();
  openBrowser.mockClear();
  ready = true;
});

describe('routePushUrl', () => {
  it('opens the standings for a results push', () => {
    routePushUrl('/leaderboard?time=weekend&raceId=k1&utm_source=push');
    expect(navigate).toHaveBeenCalledWith('Tabs', {
      screen: 'LeaderboardTab',
      params: {
        screen: 'LeaderboardMain',
        params: { raceId: 'k1', time: 'weekend' },
      },
    });
  });

  it('opens the race for a reminder push', () => {
    routePushUrl('/races/spain-2026?utm_source=push');
    expect(navigate).toHaveBeenCalledWith('Tabs', {
      screen: 'HomeTab',
      params: {
        screen: 'RaceDetail',
        params: { raceSlug: 'spain-2026' },
      },
    });
  });

  it('opens a feed event', () => {
    routePushUrl('/feed/abc123?utm_source=push');
    expect(navigate).toHaveBeenCalledWith('Tabs', {
      screen: 'HomeTab',
      params: {
        screen: 'FeedEventDetail',
        params: { feedEventId: 'abc123' },
      },
    });
  });

  it('accepts an absolute URL as well as a bare path', () => {
    routePushUrl('https://grandprixpicks.com/leaderboard?time=weekend');
    expect(navigate).toHaveBeenCalledWith('Tabs', {
      screen: 'LeaderboardTab',
      params: {
        screen: 'LeaderboardMain',
        params: { raceId: undefined, time: 'weekend' },
      },
    });
  });

  it('opens a site page it has no screen for in the in-app browser', () => {
    // An announcement linking to the results policy used to be a dead tap.
    routePushUrl('/results-policy#sessions-heading');
    expect(navigate).not.toHaveBeenCalled();
    expect(openBrowser).toHaveBeenCalledWith(
      'https://grandprixpicks.com/results-policy?app=1#sessions-heading',
    );
  });

  it('never opens another site', () => {
    routePushUrl('https://example.com/phish');
    expect(navigate).not.toHaveBeenCalled();
    expect(openBrowser).not.toHaveBeenCalled();
  });

  it('ignores an empty url', () => {
    routePushUrl(null);
    routePushUrl(undefined);
    routePushUrl('');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('buffers a cold-start tap until the navigator is ready', () => {
    ready = false;
    routePushUrl('/leaderboard?time=weekend&raceId=k1');
    expect(navigate).not.toHaveBeenCalled();

    ready = true;
    flushPendingPushRoute();
    expect(navigate).toHaveBeenCalledWith('Tabs', {
      screen: 'LeaderboardTab',
      params: {
        screen: 'LeaderboardMain',
        params: { raceId: 'k1', time: 'weekend' },
      },
    });
  });

  it('delivers a buffered tap only once', () => {
    ready = false;
    routePushUrl('/leaderboard');
    ready = true;
    flushPendingPushRoute();
    flushPendingPushRoute();
    expect(navigate).toHaveBeenCalledTimes(1);
  });
});

it('opens the home feed for a session-lock link', () => {
  routePushUrl('/?utm_campaign=session_locked');
  expect(navigate).toHaveBeenCalledWith('Tabs', {
    screen: 'HomeTab',
    params: { screen: 'HomeMain' },
  });
});

it('opens the race calendar for /races', () => {
  routePushUrl('/races');
  expect(navigate).toHaveBeenCalledWith('Tabs', {
    screen: 'MoreTab',
    params: { screen: 'Races' },
  });
});
