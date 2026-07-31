import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { formatViewerLockDate } from '@/lib/raceLockTime';

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

  it('keeps the countdown inside race week', () => {
    const lockAt = Date.parse('2026-08-22T13:00:00Z');
    act(() => {
      root.render(
        <SessionClock
          raceName="Dutch Grand Prix"
          raceSlug="netherlands-2026"
          sessionLabel="Qualifying"
          msRemaining={3 * 24 * 60 * 60 * 1000}
          lockAt={lockAt}
        />,
      );
    });

    expect(container.querySelector('[role="timer"]')).not.toBeNull();
    expect(container.textContent).toContain('Next deadline · Qualifying picks');
  });

  it('shows the date instead of digits while the deadline is weeks out', () => {
    const lockAt = Date.parse('2026-08-22T13:00:00Z');
    act(() => {
      root.render(
        <SessionClock
          raceName="Dutch Grand Prix"
          raceSlug="netherlands-2026"
          sessionLabel="Qualifying"
          msRemaining={21 * 24 * 60 * 60 * 1000}
          lockAt={lockAt}
        />,
      );
    });

    // A three-week countdown reads as "no rush"; a date reads as a fixture.
    expect(container.querySelector('[role="timer"]')).toBeNull();
    expect(container.textContent).toContain('Next deadline · Qualifying picks');
    // ...but a bare date never changes, so the distance keeps it tied to now.
    expect(container.textContent).toContain('locks in 21 days');
  });

  it('swaps the date into the viewer timezone once mounted', () => {
    const lockAt = Date.parse('2026-08-22T13:00:00Z');
    act(() => {
      root.render(
        <SessionClock
          raceName="Dutch Grand Prix"
          raceSlug="netherlands-2026"
          sessionLabel="Qualifying"
          msRemaining={21 * 24 * 60 * 60 * 1000}
          lockAt={lockAt}
        />,
      );
    });

    // Derived rather than hardcoded so the assertion holds wherever CI runs.
    // The point is that the circuit's zone lost to the reader's, not that any
    // particular abbreviation appears.
    const viewer = formatViewerLockDate(lockAt);
    expect(viewer).not.toBeNull();
    expect(container.textContent).toContain(viewer?.time);
    expect(container.textContent).toContain(viewer?.date);
  });

  it('renders the track-local date on the server so hydration matches', () => {
    // The viewer's zone is only knowable in a browser. If this ever renders the
    // host's idea of "local" it will emit UTC from Cloudflare and mismatch
    // every hydration, so the server output has to stay circuit-local.
    const html = renderToString(
      <SessionClock
        raceName="Dutch Grand Prix"
        raceSlug="netherlands-2026"
        sessionLabel="Qualifying"
        msRemaining={21 * 24 * 60 * 60 * 1000}
        lockAt={Date.parse('2026-08-22T13:00:00Z')}
      />,
    );

    expect(html).toContain('Sat 22 Aug');
    expect(html).toContain('15:00 CEST');
  });

  it('falls back to the countdown when the circuit timezone is unknown', () => {
    act(() => {
      root.render(
        <SessionClock
          raceName="Atlantis Grand Prix"
          raceSlug="atlantis-2026"
          sessionLabel="Qualifying"
          msRemaining={21 * 24 * 60 * 60 * 1000}
          lockAt={Date.parse('2026-08-22T13:00:00Z')}
        />,
      );
    });

    expect(container.querySelector('[role="timer"]')).not.toBeNull();
  });
});
