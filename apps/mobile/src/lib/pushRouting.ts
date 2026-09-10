import { navigationRef } from '../navigation/navigationRef';

/**
 * Routes a push-notification tap to the right screen. The backend sends a
 * site path in `data.url` (shared contract with web push): `/races/{slug}`,
 * `/leaderboard`, `/feed/{feedEventId}`, or `/feed`. Anything unrecognized is
 * ignored rather than guessed at.
 *
 * That last rule is why this file has to be updated in the same change as any
 * new push destination: an unhandled path is not a fallback, it is a tap that
 * does nothing.
 *
 * Taps can arrive before the navigator mounts (cold start), so unroutable
 * URLs are buffered and flushed from the NavigationContainer's onReady.
 */

let pendingUrl: string | null = null;

function navigateTo(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url, 'https://grandprixpicks.com');
  } catch {
    return false;
  }
  if (parsed.origin !== 'https://grandprixpicks.com') {
    return false;
  }
  const path = parsed.pathname;

  const raceMatch = /^\/races\/([^/]+)$/.exec(path);
  if (raceMatch) {
    navigationRef.navigate('Tabs', {
      screen: 'PicksTab',
      params: {
        screen: 'RaceDetail',
        params: { raceSlug: raceMatch[1] },
      },
    });
    return true;
  }

  const feedEventMatch = /^\/feed\/([^/]+)$/.exec(path);
  if (feedEventMatch) {
    navigationRef.navigate('Tabs', {
      screen: 'HomeTab',
      params: {
        screen: 'FeedEventDetail',
        params: { feedEventId: feedEventMatch[1] },
      },
    });
    return true;
  }

  if (path === '/feed' || path === '/') {
    navigationRef.navigate('Tabs', {
      screen: 'HomeTab',
      params: { screen: 'HomeMain' },
    });
    return true;
  }

  // Preserve the weekend even when an old notification opens a mounted tab.
  if (path === '/leaderboard') {
    navigationRef.navigate('Tabs', {
      screen: 'LeaderboardTab',
      params: {
        screen: 'LeaderboardMain',
        params: {
          raceId: parsed.searchParams.get('raceId') ?? undefined,
          time:
            parsed.searchParams.get('time') === 'season' ? 'season' : 'weekend',
        },
      },
    });
    return true;
  }

  if (path === '/races' || path === '/predict') {
    navigationRef.navigate('Tabs', {
      screen: 'PicksTab',
      params: { screen: 'PicksMain' },
    });
    return true;
  }

  return false;
}

export function routePushUrl(url: string | undefined | null) {
  if (!url) {
    return;
  }
  if (navigationRef.isReady()) {
    navigateTo(url);
  } else {
    pendingUrl = url;
  }
}

/** Call from NavigationContainer onReady to deliver a cold-start tap. */
export function flushPendingPushRoute() {
  if (pendingUrl && navigationRef.isReady()) {
    const url = pendingUrl;
    pendingUrl = null;
    navigateTo(url);
  }
}
