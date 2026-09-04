import { act } from 'react';
import type { Id } from '@convex-generated/dataModel';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DeferredRaceWriteupPicks,
  RACE_WRITEUP_PICKS_ANCHOR,
} from './DeferredRaceWriteupPicks';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    params,
    to,
  }: {
    children: React.ReactNode;
    params?: { raceSlug: string };
    to: string;
  }) => (
    <a href={params ? to.replace('$raceSlug', params.raceSlug) : to}>
      {children}
    </a>
  ),
}));

vi.mock('./RaceWriteupPicksForm', () => ({
  RaceWriteupPicksForm: () => <div data-testid="prediction-form" />,
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let observerCallback: IntersectionObserverCallback | null = null;

class IntersectionObserverMock implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = '700px';
  readonly scrollMargin = '0px';
  readonly thresholds = [0];
  disconnect = vi.fn();
  observe = vi.fn();
  takeRecords = vi.fn(() => []);
  unobserve = vi.fn();

  constructor(callback: IntersectionObserverCallback) {
    observerCallback = callback;
  }
}

describe('deferred race write-up picks', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    observerCallback = null;
    vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    vi.unstubAllGlobals();
    container = null;
    root = null;
  });

  function render() {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() =>
      root!.render(
        <DeferredRaceWriteupPicks
          phase="preview"
          raceId={'race-id' as Id<'races'>}
          round={13}
          season={2026}
          raceSlug="italy-2026"
          venueName="Monza"
        />,
      ),
    );
  }

  it('server-shaped markup gives the CTA an accessible same-page target', () => {
    render();
    const section = container!.querySelector('section')!;

    expect(section.id).toBe(RACE_WRITEUP_PICKS_ANCHOR);
    expect(section.getAttribute('aria-labelledby')).toBe(
      'race-writeup-picks-heading',
    );
    expect(section.textContent).toContain('Make your Monza picks');
    expect(section.querySelector('[data-testid="prediction-form"]')).toBeNull();
    expect(section.querySelector('[role="status"]')).not.toBeNull();
  });

  // The picker replaces the hero's race-page button with a same-page anchor,
  // so without these the page a crawler reads has no link to the round it is
  // written about and none to the board the picks feed.
  it('links out to the race page and the leaderboard before the picker loads', () => {
    render();
    const hrefs = [...container!.querySelectorAll('section > div a')].map(
      (link) => link.getAttribute('href'),
    );

    expect(hrefs).toContain('/races/italy-2026');
    expect(hrefs).toContain('/leaderboard');
  });

  it('loads the interactive picker as the section approaches the viewport', async () => {
    render();

    await act(async () => {
      observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
      await Promise.resolve();
    });

    expect(
      container!.querySelector('[data-testid="prediction-form"]'),
    ).not.toBeNull();
  });
});
