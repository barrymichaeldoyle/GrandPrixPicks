import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { picksCtaCopy } from '@/lib/picksCta';

import { PicksCallToAction } from './PicksCallToAction';

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

const viewerSession = vi.hoisted(() => ({ isSignedIn: false }));
vi.mock('@/integrations/clerk/useViewerSession', () => ({
  useViewerSession: () => ({
    isSignedIn: viewerSession.isSignedIn,
    confirmedSignedIn: viewerSession.isSignedIn,
    isLoaded: true,
  }),
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('picks call to action', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    viewerSession.isSignedIn = false;
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
  });

  function render(props: Parameters<typeof PicksCallToAction>[0]) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root!.render(<PicksCallToAction {...props} />));
    return container!;
  }

  function hrefs() {
    return [...container!.querySelectorAll('a')].map((link) =>
      link.getAttribute('href'),
    );
  }

  it('sends a reader with no round in context to the predictions hub', () => {
    render({ placement: 'f1_standings' });

    expect(hrefs()).toContain('/f1-predictions-this-weekend');
  });

  it('links the round directly when the page already knows it', () => {
    render({
      placement: 'guide',
      raceSlug: 'azerbaijan-2026',
      venueName: 'Baku',
    });

    expect(hrefs()).toContain('/races/azerbaijan-2026');
    expect(container!.textContent).toContain('Make your Baku picks');
  });

  it('says an account is needed to save, and only to a signed-out reader', () => {
    render({ placement: 'about' });
    expect(container!.textContent).toContain('needs a free account');

    act(() => root!.unmount());
    container!.remove();
    viewerSession.isSignedIn = true;
    render({ placement: 'about' });
    expect(container!.textContent).not.toContain('needs a free account');
  });

  it('offers scoring to a newcomer and nothing extra to a player', () => {
    render({ placement: 'about' });
    expect(hrefs()).toContain('/how-to-play');
    expect(hrefs()).not.toContain('/leaderboard');

    act(() => root!.unmount());
    container!.remove();
    viewerSession.isSignedIn = true;
    render({ placement: 'about' });
    // A signed-in reader already has the leaderboard in the header and the
    // footer, so the panel leaves its one button alone.
    expect(hrefs()).toEqual(['/f1-predictions-this-weekend']);
  });

  it('names the viewer’s existing picks instead of asking again', () => {
    viewerSession.isSignedIn = true;
    render({ hasPicks: true, placement: 'guide', venueName: 'Baku' });

    expect(container!.textContent).toContain('Your Baku picks are in');
    expect(container!.textContent).toContain('Review your picks');
  });
});

describe('picks call to action copy', () => {
  it('never repeats the button text as the heading', () => {
    for (const state of ['signed-out', 'no-picks', 'has-picks'] as const) {
      for (const venue of [undefined, 'Baku']) {
        const copy = picksCtaCopy(state, venue);
        expect(copy.heading).not.toBe(copy.action);
      }
    }
  });
});
