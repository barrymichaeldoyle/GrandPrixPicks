import * as WebBrowser from 'expo-web-browser';

import { navigationRef } from '../navigation/navigationRef';
import { siteUrl } from './siteUrl';

/**
 * Routes a push-notification tap to the right screen. The backend sends a
 * site path in `data.url` (shared contract with web push): `/races/{slug}`,
 * `/races`, `/leaderboard`, `/feed/{feedEventId}`, or `/feed`. Anything unrecognized is
 * ignored rather than guessed at.
 *
 * A site path the app has no screen for (an announcement linking to
 * `/results-policy`, say) opens in the in-app browser instead. It used to be
 * dropped, which made those taps do nothing. A new push destination that
 * deserves a native screen still has to be added here in the same change.
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
      screen: 'HomeTab',
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

  if (path === '/races') {
    navigationRef.navigate('Tabs', {
      screen: 'MoreTab',
      params: { screen: 'Races' },
    });
    return true;
  }

  if (path === '/predict') {
    navigationRef.navigate('Tabs', {
      screen: 'HomeTab',
      params: { screen: 'HomeMain' },
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
    routeOrOpen(url);
  } else {
    pendingUrl = url;
  }
}

function routeOrOpen(url: string) {
  if (navigateTo(url)) {
    return;
  }
  // Only this site's own pages: anything else is not a link we sent.
  try {
    const parsed = new URL(url, 'https://grandprixpicks.com');
    if (parsed.origin === 'https://grandprixpicks.com') {
      void WebBrowser.openBrowserAsync(
        siteUrl(`${parsed.pathname}${parsed.search}${parsed.hash}`),
      );
    }
  } catch {
    // Not a URL; nothing to open.
  }
}

/** Call from NavigationContainer onReady to deliver a cold-start tap. */
export function flushPendingPushRoute() {
  if (pendingUrl && navigationRef.isReady()) {
    const url = pendingUrl;
    pendingUrl = null;
    routeOrOpen(url);
  }
}
