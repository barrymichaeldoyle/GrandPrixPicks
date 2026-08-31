import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it } from 'vitest';

import { RaceWriteupTrackMap } from './RaceWriteupTrackMap';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const CORNERS = [
  ['1–2', 'Rettifilo'],
  ['11', 'Parabolica'],
] as const;

describe('race write-up track map', () => {
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
        <RaceWriteupTrackMap
          src="/media/monza-track-map-1600.webp"
          srcSet="/media/monza-track-map-800.webp 800w"
          sizes="100vw"
          width={1600}
          height={893}
          alt="Monza lap map"
          corners={CORNERS}
          circuitName="Monza"
        />,
      ),
    );
  }

  function dialog() {
    return document.querySelector<HTMLElement>('[role="dialog"]');
  }

  function enlargeButton() {
    const button = document.querySelector<HTMLButtonElement>(
      '[aria-label="Enlarge the map"]',
    );
    if (!button) {
      throw new Error('no enlarge control rendered');
    }
    return button;
  }

  it('renders the map at intrinsic size so the figure reserves its space', () => {
    render();
    const img = container!.querySelector('img')!;
    expect(img.getAttribute('width')).toBe('1600');
    expect(img.getAttribute('height')).toBe('893');
  });

  it('names every corner alongside its turn numbers', () => {
    render();
    const caption = container!.querySelector('figcaption')!.textContent;
    expect(caption).toContain('1–2 Rettifilo');
    expect(caption).toContain('11 Parabolica');
  });

  it('opens the enlarged map in place rather than navigating away', () => {
    render();
    expect(dialog()).toBeNull();
    expect(container!.querySelector('a')).toBeNull();

    act(() => enlargeButton().click());

    expect(dialog()).not.toBeNull();
    expect(document.documentElement.hasAttribute('data-scroll-locked')).toBe(
      true,
    );
  });

  it('closes again, releasing the page', () => {
    render();
    act(() => enlargeButton().click());

    const close = dialog()!.querySelector<HTMLButtonElement>(
      '[aria-label="Close the lap map"]',
    )!;
    act(() => close.click());

    expect(dialog()).toBeNull();
    expect(document.documentElement.hasAttribute('data-scroll-locked')).toBe(
      false,
    );
  });

  it('closes on Escape', () => {
    render();
    act(() => enlargeButton().click());

    act(() => {
      document.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
      );
    });

    expect(dialog()).toBeNull();
  });

  /*
   * The whole reason the enlarged view exists: at a phone's width the turn
   * badges are unreadable, so the map holds a minimum width there and the
   * container scrolls instead of shrinking it. A `w-full` with no minimum
   * would render the same size as the inline map and buy nothing.
   */
  it('holds the enlarged map above the width its turn numbers need', () => {
    render();
    act(() => enlargeButton().click());

    const img = dialog()!.querySelector('img')!;
    expect(img.className).toContain('min-w-[52rem]');
    expect(img.className).toContain('max-w-none');
  });
});
