import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RaceWriteupNextLinks } from './RaceWriteupNextLinks';

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    onClick,
    params,
    to,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    params?: { raceSlug: string };
    to: string;
  }) => (
    <a
      href={params ? to.replace('$raceSlug', params.raceSlug) : to}
      onClick={onClick}
    >
      {children}
    </a>
  ),
}));

const captureAnalyticsEvent = vi.fn();
vi.mock('@/lib/analytics', () => ({
  captureAnalyticsEvent: (...args: unknown[]) =>
    captureAnalyticsEvent(...args) as unknown,
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('race write-up next links', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    captureAnalyticsEvent.mockClear();
    container = null;
    root = null;
  });

  function render(placement: 'closing_panel' | 'picks_section') {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() =>
      root!.render(
        <RaceWriteupNextLinks
          placement={placement}
          raceSlug="italy-2026"
          venueName="Monza"
        />,
      ),
    );
    return [...container.querySelectorAll('a')];
  }

  it('adds the race page beside the leaderboard only where nothing else links to it', () => {
    expect(
      render('picks_section').map((link) => link.getAttribute('href')),
    ).toEqual(['/races/italy-2026', '/leaderboard']);

    act(() => root?.unmount());
    container?.remove();

    // The closing panel's own button is that link, so repeating it here would
    // put the same destination twice in one panel.
    expect(
      render('closing_panel').map((link) => link.getAttribute('href')),
    ).toEqual(['/leaderboard']);
  });

  it('reports which link was taken and from where', () => {
    const [racePage, leaderboard] = render('picks_section');

    // jsdom would otherwise try to follow the href and log a navigation error.
    container!.addEventListener('click', (event) => event.preventDefault());

    act(() => {
      racePage.click();
      leaderboard.click();
    });

    expect(captureAnalyticsEvent.mock.calls).toEqual([
      [
        'race_writeup_next_link_clicked',
        {
          destination: 'race_page',
          placement: 'picks_section',
          race_slug: 'italy-2026',
        },
      ],
      [
        'race_writeup_next_link_clicked',
        {
          destination: 'leaderboard',
          placement: 'picks_section',
          race_slug: 'italy-2026',
        },
      ],
    ]);
  });
});
