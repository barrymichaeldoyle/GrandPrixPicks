import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  F1_STORE_AFFILIATE_URL,
  RaceWriteupStoreLink,
} from './RaceWriteupStoreLink';

const captureAnalyticsEvent = vi.fn();
vi.mock('@/lib/analytics', () => ({
  captureAnalyticsEvent: (...args: unknown[]) =>
    captureAnalyticsEvent(...args) as unknown,
}));

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

describe('race write-up store link', () => {
  let container: HTMLDivElement | null = null;
  let root: Root | null = null;

  afterEach(() => {
    act(() => root?.unmount());
    container?.remove();
    captureAnalyticsEvent.mockClear();
    container = null;
    root = null;
  });

  function render() {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root!.render(<RaceWriteupStoreLink />));
    return container;
  }

  it('marks the affiliate link as sponsored and discloses the commission', () => {
    const view = render();
    const link = view.querySelector('a')!;

    expect(link.getAttribute('href')).toBe(F1_STORE_AFFILIATE_URL);
    expect(link.getAttribute('rel')).toContain('sponsored');
    expect(view.textContent).toContain('We earn a commission');
  });

  it('records the click', () => {
    const view = render();
    act(() => view.querySelector('a')!.click());

    expect(captureAnalyticsEvent).toHaveBeenCalledWith(
      'race_writeup_store_link_clicked',
    );
  });
});
