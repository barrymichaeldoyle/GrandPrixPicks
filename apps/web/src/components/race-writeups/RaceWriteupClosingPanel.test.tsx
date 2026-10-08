import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RaceWriteupClosingPanel } from './RaceWriteupClosingPanel';

const inAppView = vi.hoisted(() => ({ value: false }));
vi.mock('@/hooks/useInAppView', () => ({
  useInAppView: () => inAppView.value,
}));

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

const predictions = vi.hoisted(() => ({
  value: undefined as { predictions: Record<string, unknown> } | undefined,
}));
vi.mock('@/integrations/convex/query', () => ({
  useQuery: () => predictions.value,
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('race write-up closing panel', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  beforeEach(() => {
    viewerSession.isSignedIn = false;
    predictions.value = undefined;
  });

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
  });

  function render() {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() =>
      root!.render(
        <RaceWriteupClosingPanel
          phase="preview"
          raceSlug="azerbaijan-2026"
          venueName="Baku"
        />,
      ),
    );
  }

  it('ends the write-up on the round and the standings', () => {
    render();
    const hrefs = [...container!.querySelectorAll('a')].map((link) =>
      link.getAttribute('href'),
    );

    expect(hrefs).toContain('/races/azerbaijan-2026');
    expect(hrefs).toContain('/leaderboard');
  });

  it('tells a signed-out reader that saving needs an account', () => {
    render();

    expect(container!.textContent).toContain('Make your Baku picks');
    expect(container!.textContent).toContain('needs a free account');
  });

  it('drops the account line once the reader is signed in', () => {
    viewerSession.isSignedIn = true;
    render();

    expect(container!.textContent).toContain('Make your Baku picks');
    expect(container!.textContent).not.toContain('needs a free account');
  });

  it('reports picks already made rather than asking for them again', () => {
    viewerSession.isSignedIn = true;
    predictions.value = { predictions: { quali: ['a'], race: null } };
    render();

    expect(container!.textContent).toContain('Your Baku picks are in');
    expect(container!.textContent).not.toContain('Make your Baku picks');
    expect(container!.textContent).toContain('Review your picks');
  });
});
