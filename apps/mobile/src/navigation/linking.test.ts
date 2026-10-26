import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
  it('opens the race calendar and a race', () => {
    expect(routeNames('/races')).toEqual(['Tabs', 'MoreTab', 'Races']);
    expect(routeNames('/races/singapore-2026')).toEqual([
      'Tabs',
      'HomeTab',
      'RaceDetail',
    ]);
  });
  // iOS hands the app every URL the web's association file claims. One the
  // app cannot route opens it on whatever it last showed, and the page the
  // link was for is gone: `/predict/*` and `/more/*` were claimed that way.
  it('can open every path the association file claims', () => {
    const association = JSON.parse(
      readFileSync(
        fileURLToPath(
          new URL(
            '../../../web/public/.well-known/apple-app-site-association',
            import.meta.url,
          ).href,
        ),
        'utf8',
      ),
    ) as { applinks: { details: { paths: string[] }[] } };
    const paths = association.applinks.details.flatMap((detail) =>
      detail.paths.map((path) => path.replace('*', 'sample')),
    );
    for (const path of paths) {
      expect(getStateFromPath(path, linking.config), path).toBeDefined();
    }
  });
});
