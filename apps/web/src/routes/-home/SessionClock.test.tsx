import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { SessionClock } from './SessionClock';

describe('SessionClock', () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
  });

  it('announces countdown units as words', () => {
    act(() => {
      root.render(
        <SessionClock
          raceName="Dutch Grand Prix"
          raceSlug="dutch-2026"
          sessionLabel="Qualifying"
          msRemaining={
            2 * 24 * 60 * 60 * 1000 + 1 * 60 * 60 * 1000 + 5 * 60 * 1000
          }
        />,
      );
    });

    expect(
      container.querySelector('[role="timer"]')?.getAttribute('aria-label'),
    ).toBe('Qualifying picks lock in 2 days, 1 hour, 5 minutes');
  });
});
