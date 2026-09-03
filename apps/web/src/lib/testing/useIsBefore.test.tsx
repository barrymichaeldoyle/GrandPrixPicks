import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useIsBefore } from './now';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement | null = null;
let root: Root | null = null;

function Probe({ timestamp }: { timestamp: number | null }) {
  return <span>{String(useIsBefore(timestamp))}</span>;
}

function render(timestamp: number | null) {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root?.render(<Probe timestamp={timestamp} />);
  });
  return container;
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-06T15:00:00Z'));
});

afterEach(() => {
  act(() => {
    root?.unmount();
  });
  container?.remove();
  container = null;
  root = null;
  vi.useRealTimers();
});

describe('useIsBefore', () => {
  it('is true up to the boundary and false once it passes', () => {
    const view = render(Date.now() + 60_000);
    expect(view.textContent).toBe('true');

    act(() => {
      vi.advanceTimersByTime(61_000);
    });
    expect(view.textContent).toBe('false');
  });

  it('does not re-render on a tick before the boundary', () => {
    const view = render(Date.now() + 8 * 60 * 60 * 1000);

    act(() => {
      vi.advanceTimersByTime(60 * 60 * 1000);
    });
    expect(view.textContent).toBe('true');
    // One pending timeout, scheduled for the boundary itself: this hook must
    // not put a minute-by-minute re-render on the dashboard.
    expect(vi.getTimerCount()).toBe(1);
  });

  it('is false for a boundary that has already passed', () => {
    expect(render(Date.now() - 1).textContent).toBe('false');
  });

  it('is false when there is no boundary', () => {
    expect(render(null).textContent).toBe('false');
  });
});
