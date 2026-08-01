import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LandingStickyBar } from './LandingStickyBar';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let observedRootMargin = '';

class IntersectionObserverMock implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin: string;
  readonly scrollMargin = '0px';
  readonly thresholds = [0];

  constructor(
    _callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.rootMargin = options?.rootMargin ?? '0px';
    observedRootMargin = this.rootMargin;
  }

  disconnect() {}
  observe() {}
  takeRecords() {
    return [];
  }
  unobserve() {}
}

vi.mock('@/lib/analytics', () => ({ captureAnalyticsEvent: () => {} }));

describe('LandingStickyBar', () => {
  let container: HTMLDivElement;
  let header: HTMLElement;
  let root: Root;

  beforeEach(() => {
    observedRootMargin = '';
    globalThis.IntersectionObserver = IntersectionObserverMock;

    header = document.createElement('header');
    header.setAttribute('data-app-header', '');
    header.style.position = 'sticky';
    header.style.top = '36px';
    header.style.height = '64px';
    document.body.appendChild(header);

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    header.remove();
  });

  it('stacks below a header shifted by a top overlay', async () => {
    await act(async () => {
      root.render(
        <LandingStickyBar
          raceName="Dutch GP"
          raceSlug="dutch-2026"
          msRemaining={60_000}
          targetId="picks"
        />,
      );
    });

    const sticky = container.querySelector<HTMLElement>(
      '[data-landing-sticky-visible]',
    );
    expect(sticky?.style.top).toBe('calc(var(--nav-height) + 36px)');
    expect(observedRootMargin).toBe('-100px 0px 0px 0px');
  });

  it('tracks a header shift applied after mount', async () => {
    header.style.top = '0px';
    await act(async () => {
      root.render(
        <LandingStickyBar
          raceName="Dutch GP"
          raceSlug="dutch-2026"
          msRemaining={60_000}
          targetId="picks"
        />,
      );
    });

    header.style.top = '36px';
    await act(async () => {
      await Promise.resolve();
    });

    const sticky = container.querySelector<HTMLElement>(
      '[data-landing-sticky-visible]',
    );
    expect(sticky?.style.top).toBe('calc(var(--nav-height) + 36px)');
    expect(observedRootMargin).toBe('-100px 0px 0px 0px');
  });
});
