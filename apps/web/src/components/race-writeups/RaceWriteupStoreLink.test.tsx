import { act, type ReactElement } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  F1_STORE_LINK,
  F1StorePageLink,
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

  describe('guide store page', () => {
    const cap = {
      name: 'Haas New Era Esteban Ocon 9SEVENTY Team Cap - Black',
      imageUrl: 'https://feeds.frgimages.com/cap.jpg?_hv=2&w=2000',
      url: 'https://f1.pxf.io/c/1208040/865970/11910?prodsku=1',
      currentPrice: 28,
      originalPrice: 56,
      currency: 'USD',
    };

    afterEach(() => vi.unstubAllGlobals());

    async function renderWith(items: unknown[]) {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(Response.json({ items })),
      );
      const view = render(
        <F1StorePageLink page="esteban-ocon" text="Ocon kit" label="Shop" />,
      );
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      return view;
    }

    it("shows the visitor's products with the sale and original price", async () => {
      const view = await renderWith([cap]);
      const tile = view.querySelector(`a[href="${cap.url}"]`)!;

      expect(tile.getAttribute('rel')).toContain('sponsored');
      expect(tile.textContent).toContain('$28.00');
      expect(tile.querySelector('s')?.textContent).toBe('$56.00');
      expect(tile.querySelector('img')?.getAttribute('src')).toContain('w=240');
    });

    it('turns the news card into race merch when the race has some', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(Response.json({ items: [cap] })),
      );
      const view = render(<RaceWriteupStoreCard storePage="singapore-2026" />);
      expect(view.textContent).toContain('Team kit at the F1 Store');
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(view.textContent).toContain('Race merch at the F1 Store');
      expect(view.querySelector(`a[href="${cap.url}"]`)).not.toBeNull();
      expect(view.textContent).toContain('Affiliate links');
      expect(fetch).toHaveBeenCalledWith(
        '/api/f1-store/items?page=singapore-2026',
        expect.anything(),
      );
    });

    it('keeps the generic card, without asking, when there is no race', () => {
      vi.stubGlobal('fetch', vi.fn());
      const view = render(<RaceWriteupStoreCard />);
      expect(view.textContent).toContain('Team kit at the F1 Store');
      expect(fetch).not.toHaveBeenCalled();
    });

    it('drops a product whose link is not an Impact tracking link', async () => {
      const view = await renderWith([{ ...cap, url: 'https://evil.example/' }]);
      expect(view.querySelectorAll('li')).toHaveLength(0);
      // The plain link to the page is still there.
      expect(
        view.querySelector(`a[href="${F1_STORE_LINK}?page=esteban-ocon"]`),
      ).not.toBeNull();
    });
  });
});
