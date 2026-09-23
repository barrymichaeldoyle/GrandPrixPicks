import type { Id } from '@convex-generated/dataModel';
import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RaceWriteupFinish } from './RaceWriteupFinish';

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

vi.mock('./DeferredRaceWriteupPicks', () => ({
  DeferredRaceWriteupPicks: () => <div data-testid="picker" />,
}));

vi.mock('./RaceWriteupClosingPanel', () => ({
  RaceWriteupClosingPanel: () => <div data-testid="closing-panel" />,
}));

vi.mock('./RaceWriteupNextRound', () => ({
  RaceWriteupNextRound: () => <div data-testid="next-round" />,
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('RaceWriteupFinish', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    container = null;
    root = null;
  });

  function render(
    nextRace: { slug: string; name: string; round: number } | null,
  ) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() =>
      root!.render(
        <RaceWriteupFinish
          isLive
          phase="preview"
          raceId={'race' as Id<'races'>}
          round={16}
          season={2026}
          raceSlug="bahrain-2026"
          venueName="Sepang"
          nextRace={nextRace}
        />,
      ),
    );
    return container;
  }

  it('sends a reader to the open round when this one does not take picks yet', () => {
    const view = render({
      slug: 'azerbaijan-2026',
      name: 'Azerbaijan Grand Prix',
      round: 15,
    });

    expect(view.querySelector('[data-testid="picker"]')).toBeNull();
    expect(view.textContent).toContain(
      'Sepang picks open when the Azerbaijan Grand Prix starts',
    );
    expect(
      view.querySelector('a[href="/races/azerbaijan-2026"]')?.textContent,
    ).toBe('Make your Azerbaijan Grand Prix picks');
  });

  it('shows the picker when this is the round taking picks', () => {
    const view = render({
      slug: 'bahrain-2026',
      name: 'Bahrain Grand Prix',
      round: 16,
    });

    expect(view.querySelector('[data-testid="picker"]')).not.toBeNull();
  });

  it('shows the picker when the next round is unknown', () => {
    const view = render(null);

    expect(view.querySelector('[data-testid="picker"]')).not.toBeNull();
  });
});
