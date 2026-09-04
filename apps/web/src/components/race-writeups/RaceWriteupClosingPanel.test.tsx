import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RaceWriteupClosingPanel } from './RaceWriteupClosingPanel';

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

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('race write-up closing panel', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

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
});
