import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { formatViewerLockDate } from '@/lib/raceLockTime';

import { SessionClock, SessionClockChip } from './SessionClock';

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

  it('keeps the countdown inside the urgency window', () => {
    const lockAt = Date.parse('2026-08-22T13:00:00Z');
    act(() => {
      root.render(
        <SessionClock
          raceName="Dutch Grand Prix"
          raceSlug="netherlands-2026"
          sessionLabel="Qualifying"
          msRemaining={48 * 60 * 60 * 1000}
          lockAt={lockAt}
        />,
      );
    });

    expect(container.querySelector('[role="timer"]')).not.toBeNull();
    expect(container.textContent).toContain('Next deadline · Qualifying picks');
  });

  it('shows the date and picks-open framing while the deadline is weeks out', () => {
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

    // A three-week countdown reads as "no rush"; a date plus invitation does not.
    expect(container.querySelector('[role="timer"]')).toBeNull();
    expect(container.textContent).toContain('Next deadline · Qualifying picks');
    expect(container.textContent).toContain('Picks open now');
    expect(container.textContent).not.toContain('locks in');
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
    expect(html).toContain('Picks open now');
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

describe('SessionClockChip', () => {
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

  it('compresses a far-out deadline into one line without a countdown', () => {
    const lockAt = Date.parse('2026-08-22T13:00:00Z');
    act(() => {
      root.render(
        <SessionClockChip
          raceName="Dutch Grand Prix"
          raceSlug="netherlands-2026"
          sessionLabel="Sprint Quali"
          msRemaining={21 * 24 * 60 * 60 * 1000}
          lockAt={lockAt}
        />,
      );
    });

    const text = container.textContent ?? '';
    expect(text).toContain('Dutch GP');
    expect(text).toContain('Sprint Quali locks');
    expect(text).not.toContain('locks in');
    expect(text).not.toContain('Picks open now');
    expect(text).not.toContain('Next deadline');

    const viewer = formatViewerLockDate(lockAt);
    expect(viewer).not.toBeNull();
    expect(text).toContain(viewer!.date);
    expect(text).toContain(viewer!.time);
  });

  it('switches to a countdown once the urgency window opens', () => {
    act(() => {
      root.render(
        <SessionClockChip
          raceName="Dutch Grand Prix"
          raceSlug="netherlands-2026"
          sessionLabel="Qualifying"
          msRemaining={36 * 60 * 60 * 1000}
          lockAt={Date.parse('2026-08-22T13:00:00Z')}
        />,
      );
    });

    expect(container.textContent).toContain('Qualifying locks in');
    expect(container.textContent).toContain('01d');
  });
});
