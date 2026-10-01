import { act, type ReactElement } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  F1_STORE_LINK,
  RaceWriteupStoreCard,
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

  function render(element: ReactElement) {
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    act(() => root!.render(element));
    return container;
  }

  it.each([
    ['footer', <RaceWriteupStoreLink key="footer" />],
    ['news', <RaceWriteupStoreCard key="news" />],
  ] as const)(
    'the %s placement goes through the regional redirect, marked sponsored and disclosed',
    (placement, element) => {
      const view = render(element);
      const link = view.querySelector('a')!;

      // Never the Impact link itself: that always opened the EU shop.
      expect(link.getAttribute('href')).toBe(F1_STORE_LINK);
      expect(link.getAttribute('rel')).toContain('sponsored');
      expect(view.textContent).toContain('We earn a commission');

      // Clicking must not navigate jsdom away; the handler runs first.
      link.addEventListener('click', (event) => event.preventDefault());
      act(() => link.click());
      expect(captureAnalyticsEvent).toHaveBeenCalledWith(
        'race_writeup_store_link_clicked',
        { placement },
      );
    },
  );

  it('says the card is an affiliate link before its headline', () => {
    const view = render(<RaceWriteupStoreCard />);
    const text = view.textContent ?? '';

    expect(text.indexOf('Affiliate link')).toBeLessThan(
      text.indexOf('Team kit at the F1 Store'),
    );
  });
});
