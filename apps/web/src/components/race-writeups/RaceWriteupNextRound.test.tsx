import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RaceWriteupNextRound } from './RaceWriteupNextRound';

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

describe('race write-up next round', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    captureAnalyticsEvent.mockClear();
    container = null;
    root = null;
  });

  function render(
    nextRace: { slug: string; name: string; round: number } | null,
  ) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root!.render(<RaceWriteupNextRound nextRace={nextRace} />));
    return container;
  }

  it('sends the reader to the next round’s own write-up when it has one', () => {
    const link = render({
      slug: 'madrid-2026',
      name: 'Spanish Grand Prix',
      round: 14,
    }).querySelector('a');

    expect(link?.getAttribute('href')).toBe(
      '/f1-2026-madrid-grand-prix-predictions',
    );
    expect(link?.textContent).toBe('Read the Madrid preview');
  });

  // A weekend nobody has written a piece for still gets a link, rather than
  // being the one round the archive skips.
  it('falls back to the race page for a round with no write-up', () => {
    const link = render({
      slug: 'monaco-2026',
      name: 'Monaco Grand Prix',
      round: 8,
    }).querySelector('a');

    expect(link?.getAttribute('href')).toBe('/races/monaco-2026');
    expect(link?.textContent).toBe('See the Monaco Grand Prix race page');
  });

  it('renders nothing at the end of a season', () => {
    expect(render(null).textContent).toBe('');
  });

  it('reports the click with whether it led to a write-up', () => {
    const link = render({
      slug: 'madrid-2026',
      name: 'Spanish Grand Prix',
      round: 14,
    }).querySelector('a')!;

    // jsdom would otherwise try to follow the href and log a navigation error.
    container!.addEventListener('click', (event) => event.preventDefault());
    act(() => link.click());

    expect(captureAnalyticsEvent.mock.calls).toEqual([
      [
        'race_writeup_next_round_clicked',
        { race_slug: 'madrid-2026', has_writeup: true },
      ],
    ]);
  });
});
