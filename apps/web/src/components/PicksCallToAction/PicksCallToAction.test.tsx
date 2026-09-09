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
    onClick,
  }: {
    children: React.ReactNode;
    params?: { raceSlug: string };
    to: string;
    onClick?: (event: React.MouseEvent<HTMLAnchorElement>) => void;
  }) => (
    <a
      href={params ? to.replace('$raceSlug', params.raceSlug) : to}
      onClick={onClick}
    >
      {children}
    </a>
  ),
}));

/**
 * The overlay portals to the document, so a test asserting on the panel's own
 * container would never see it. Rendering it inline keeps the assertions about
 * whether the picker opened, not about where a portal lands.
 */
vi.mock('@/components/PicksFocusOverlay', () => ({
  PicksFocusOverlay: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="picks-overlay">{children}</div>
  ),
}));

/**
 * What `races.getQuickPickRace` resolves to. `undefined` is the first paint and
 * the server rendering: the panel has to read correctly there too, because that
 * is the markup the edge caches and a crawler sees.
 */
const weekend = vi.hoisted<{
  race:
    | {
        name: string;
        slug: string;
        status?: string;
        round?: number;
        season?: number;
        hasSprint?: boolean;
        qualiLockAt?: number;
        predictionLockAt: number;
        raceStartAt?: number;
      }
    | undefined;
}>(() => ({ race: undefined }));

vi.mock('@/integrations/convex/query', () => ({
  useQuery: (_query: unknown, args: unknown) =>
    args === 'skip' ? undefined : weekend.race,
}));

vi.mock('@convex-generated/api', () => ({
  api: { races: { getQuickPickRace: 'races:getQuickPickRace' } },
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
    weekend.race = undefined;
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

  it('names the weekend it resolved, once the round arrives', () => {
    // A Saturday lock two days out, so the line is a real deadline rather than
    // one that has already passed.
    const lockAt = Date.now() + 2 * 24 * 60 * 60 * 1000;
    weekend.race = {
      name: 'Spanish Grand Prix',
      slug: 'spain-2026',
      qualiLockAt: lockAt,
      predictionLockAt: lockAt + 60 * 60 * 1000,
    };
    render({ placement: 'guide' });

    expect(container!.textContent).toContain('Make your Spanish GP picks');
    expect(container!.textContent).toContain('Qualifying picks lock');
  });

  it('reads generically until the round resolves', () => {
    // The cached SSR markup and the first paint. Naming a round here is the
    // bug this panel must not have: the edge holds the HTML for an hour.
    render({ placement: 'guide' });

    expect(container!.textContent).toContain("This weekend's picks");
    expect(container!.textContent).not.toContain('picks lock');
  });

  it('asks for no weekend when the page already named one', () => {
    // The query is skipped, so nothing resolves even though a race is set.
    weekend.race = {
      name: 'Spanish Grand Prix',
      slug: 'spain-2026',
      predictionLockAt: Date.now() + 60 * 60 * 1000,
    };
    render({
      placement: 'guide',
      raceSlug: 'azerbaijan-2026',
      venueName: 'Baku',
    });

    expect(container!.textContent).toContain('Make your Baku picks');
    expect(container!.textContent).not.toContain('Spanish');
  });

  it('drops the deadline line once the weekend is fully locked', () => {
    const lockedAt = Date.now() - 60 * 60 * 1000;
    weekend.race = {
      name: 'Spanish Grand Prix',
      slug: 'spain-2026',
      qualiLockAt: lockedAt,
      predictionLockAt: lockedAt,
    };
    render({ placement: 'guide' });

    expect(container!.textContent).toContain('Make your Spanish GP picks');
    expect(container!.textContent).not.toContain('picks lock');
  });

  it('opens the picker in place instead of leaving the page', () => {
    // A weekend still open for picks: quali has not locked.
    const lockAt = Date.now() + 2 * 24 * 60 * 60 * 1000;
    weekend.race = {
      name: 'Spanish Grand Prix',
      slug: 'spain-2026',
      status: 'upcoming',
      round: 14,
      season: 2026,
      qualiLockAt: lockAt,
      predictionLockAt: lockAt + 60 * 60 * 1000,
      raceStartAt: lockAt + 2 * 60 * 60 * 1000,
    };
    const el = render({ placement: 'guide' });
    const cta = el.querySelector('a[href="/f1-predictions-this-weekend"]');

    act(() => {
      cta!.dispatchEvent(
        new MouseEvent('click', { bubbles: true, cancelable: true }),
      );
    });

    expect(el.querySelector('[data-testid="picks-overlay"]')).not.toBeNull();
  });

  it('leaves a modified click to the browser', () => {
    const lockAt = Date.now() + 2 * 24 * 60 * 60 * 1000;
    weekend.race = {
      name: 'Spanish Grand Prix',
      slug: 'spain-2026',
      status: 'upcoming',
      round: 14,
      season: 2026,
      qualiLockAt: lockAt,
      predictionLockAt: lockAt + 60 * 60 * 1000,
      raceStartAt: lockAt + 2 * 60 * 60 * 1000,
    };
    const el = render({ placement: 'guide' });
    const cta = el.querySelector('a[href="/f1-predictions-this-weekend"]');

    // Cmd-click is "open this in a tab", not "start picking here".
    const event = new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      metaKey: true,
    });
    act(() => {
      cta!.dispatchEvent(event);
    });

    expect(el.querySelector('[data-testid="picks-overlay"]')).toBeNull();
    expect(event.defaultPrevented).toBe(false);
  });

  it('stays a link once the weekend can take no more picks', () => {
    // Race locked: the overlay would open on a picker that can save nothing.
    const lockedAt = Date.now() - 60 * 60 * 1000;
    weekend.race = {
      name: 'Spanish Grand Prix',
      slug: 'spain-2026',
      status: 'locked',
      round: 14,
      season: 2026,
      qualiLockAt: lockedAt,
      predictionLockAt: lockedAt,
      raceStartAt: lockedAt,
    };
    const el = render({ placement: 'guide' });
    const cta = el.querySelector('a[href="/f1-predictions-this-weekend"]');

    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    act(() => {
      cta!.dispatchEvent(event);
    });

    expect(el.querySelector('[data-testid="picks-overlay"]')).toBeNull();
    expect(event.defaultPrevented).toBe(false);
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
