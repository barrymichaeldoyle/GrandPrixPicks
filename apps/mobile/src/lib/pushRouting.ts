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

function pathnameOf(url: string): string {
  // `url` may be a bare path or a full https URL; strip origin and query.
  const withoutOrigin = url.replace(/^https?:\/\/[^/]+/, '');
  const [pathname] = withoutOrigin.split(/[?#]/);
  return pathname || '/';
}

function navigateTo(url: string): boolean {
  const path = pathnameOf(url);

  const raceMatch = /^\/races\/([^/]+)$/.exec(path);
  if (raceMatch) {
    navigationRef.navigate('PicksTab', {
      screen: 'RaceDetail',
      params: { raceSlug: raceMatch[1] },
    });
    return true;
  }

  const feedEventMatch = /^\/feed\/([^/]+)$/.exec(path);
  if (feedEventMatch) {
    navigationRef.navigate('HomeTab', {
      screen: 'FeedEventDetail',
      params: { feedEventId: feedEventMatch[1] },
    });
    return true;
  }

  if (path === '/feed') {
    navigationRef.navigate('HomeTab', { screen: 'HomeMain' });
    return true;
  }

  // Results pushes land here: "how did I do" is a standings question, and the
  // web link carries `?time=weekend&raceId=…` to say which round. The mobile
  // screen takes no params, but a results push fires as the results publish,
  // so the weekend it opens on is already the one the push is about.
  if (path === '/leaderboard') {
    navigationRef.navigate('LeaderboardTab', { screen: 'LeaderboardMain' });
    return true;
  }

  if (path === '/races' || path === '/' || path === '/predict') {
    navigationRef.navigate('PicksTab', { screen: 'PicksMain' });
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
