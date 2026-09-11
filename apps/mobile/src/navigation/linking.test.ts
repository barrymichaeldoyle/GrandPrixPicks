import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
// Load the pure parser without importing the native rendering entry point.
const navigationRequire = createRequire(
  import.meta.resolve('@react-navigation/native'),
);
const parserUrl = new URL(
  './getStateFromPath.js',
  pathToFileURL(navigationRequire.resolve('@react-navigation/core')),
);
const { getStateFromPath } = await import(parserUrl.href);
import { linking } from './linking';

function routeNames(path: string) {
  let state = getStateFromPath(path, linking.config);
  const names: string[] = [];
  while (state) {
    const route = state.routes[state.index ?? state.routes.length - 1];
    names.push(route.name);
    state = route.state as typeof state;
  }
  return names;
}

describe('mobile links', () => {
  it('opens Home for existing prediction links', () => {
    expect(routeNames('/predict')).toEqual(['Tabs', 'HomeTab', 'HomeMain']);
  });
  it('opens the notifications tab', () => {
    expect(routeNames('/notifications')).toEqual(['Tabs', 'NotificationsTab']);
  });
  it('preserves feed detail links', () => {
    expect(routeNames('/feed/event123')).toEqual([
      'Tabs',
      'HomeTab',
      'FeedEventDetail',
    ]);
  });
});
