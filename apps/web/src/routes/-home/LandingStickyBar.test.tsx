import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LandingStickyBar } from './LandingStickyBar';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let observedRootMargin = '';
let observerCallback: IntersectionObserverCallback | null = null;
let observedElements: Element[] = [];

class IntersectionObserverMock implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin: string;
  readonly scrollMargin = '0px';
  readonly thresholds = [0];

  constructor(
    callback: IntersectionObserverCallback,
    options?: IntersectionObserverInit,
  ) {
    this.rootMargin = options?.rootMargin ?? '0px';
    observedRootMargin = this.rootMargin;
    observerCallback = callback;
  }

  disconnect() {}
  observe(element: Element) {
    observedElements.push(element);
  }
  takeRecords() {
    return [];
  }
  unobserve() {}
}

vi.mock('@/lib/analytics', () => ({ captureAnalyticsEvent: () => {} }));

describe('LandingStickyBar', () => {
  let container: HTMLDivElement;
  let header: HTMLElement;
  let anchor: HTMLElement;
  let root: Root;

  beforeEach(() => {
    observedRootMargin = '';
    observerCallback = null;
    observedElements = [];
    globalThis.IntersectionObserver = IntersectionObserverMock;

    header = document.createElement('header');
    header.setAttribute('data-app-header', '');
    header.style.position = 'sticky';
    header.style.top = '36px';
    header.style.height = '64px';
    document.body.appendChild(header);

    anchor = document.createElement('p');
    anchor.setAttribute('data-landing-sticky-anchor', 'true');
    document.body.appendChild(anchor);

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    anchor.remove();
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
    expect(observedElements).toContain(anchor);
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

  it('appears as the visible race-name row leaves behind the header', async () => {
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
    expect(sticky?.dataset.landingStickyVisible).toBe('false');

    await act(async () => {
      observerCallback?.(
        [
          {
            target: anchor,
            isIntersecting: false,
            intersectionRatio: 0,
            boundingClientRect: {
              top: 80,
              bottom: 96,
              left: 0,
              right: 200,
              width: 200,
              height: 16,
              x: 0,
              y: 80,
              toJSON: () => ({}),
            },
            intersectionRect: {
              top: 0,
              bottom: 0,
              left: 0,
              right: 0,
              width: 0,
              height: 0,
              x: 0,
              y: 0,
              toJSON: () => ({}),
            },
            rootBounds: null,
            time: 0,
          },
        ],
        {} as IntersectionObserver,
      );
    });

    expect(sticky?.dataset.landingStickyVisible).toBe('true');
  });
});
