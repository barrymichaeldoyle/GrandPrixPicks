import { navigationRef } from '../navigation/navigationRef';

/**
 * Routes a push-notification tap to the right screen. The backend sends a
 * site path in `data.url` (shared contract with web push): `/races/{slug}`,
 * `/feed/{feedEventId}`, or `/feed`. Anything unrecognized is ignored rather
 * than guessed at.
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
    navigationRef.navigate('FeedTab', {
      screen: 'FeedEventDetail',
      params: { feedEventId: feedEventMatch[1] },
    });
    return true;
  }

  if (path === '/feed') {
    navigationRef.navigate('FeedTab', { screen: 'FeedMain' });
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
