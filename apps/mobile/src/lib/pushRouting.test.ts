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

import { flushPendingPushRoute, routePushUrl } from './pushRouting';

beforeEach(() => {
  navigate.mockClear();
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

  it('ignores a path it does not know rather than guessing', () => {
    routePushUrl('/some/unknown/place');
    expect(navigate).not.toHaveBeenCalled();
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
