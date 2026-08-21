import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useQuery } from '@/integrations/convex/query';
import { UNREAD_FAVICON_HREF } from '@/lib/faviconBadge';

import { UnreadTabIndicator } from './UnreadTabIndicator';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@convex-generated/api', () => ({
  api: {
    inAppNotifications: {
      getMyUnreadCount: 'getMyUnreadCount',
    },
  },
}));

vi.mock('convex/react', () => ({
  useQuery: vi.fn(() => ({ count: 0, hasMore: false })),
}));

const mockUseQuery = vi.mocked(useQuery);

function unreadCount(count: number, hasMore = false) {
  mockUseQuery.mockReturnValue({ count, hasMore });
}

function render() {
  const container = document.createElement('div');
  document.body.append(container);
  const root: Root = createRoot(container);

  act(() => {
    root.render(<UnreadTabIndicator />);
  });

  return {
    rerender: () =>
      act(() => {
        root.render(<UnreadTabIndicator />);
      }),
    unmount: () =>
      act(() => {
        root.unmount();
        container.remove();
      }),
  };
}

function tabIcon() {
  const links = Array.from(
    document.head.querySelectorAll<HTMLLinkElement>('link[rel="icon"]'),
  );
  // The browser reads the last one; so does this test.
  return links.at(-1)?.getAttribute('href') ?? null;
}

/** Head mutations are delivered on a microtask, same as in a browser. */
async function settle() {
  await act(async () => {
    await Promise.resolve();
  });
}

describe('UnreadTabIndicator', () => {
  beforeEach(() => {
    document.title = 'Grand Prix Picks';
    document.head
      .querySelectorAll('link[rel="icon"]')
      .forEach((l) => l.remove());
    unreadCount(0);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('leaves the tab alone when nothing is unread', () => {
    const view = render();

    expect(document.title).toBe('Grand Prix Picks');
    expect(tabIcon()).not.toBe(UNREAD_FAVICON_HREF);

    view.unmount();
  });

  it('puts the count in the title and the dot on the icon', () => {
    unreadCount(3);
    const view = render();

    expect(document.title).toBe('(3) Grand Prix Picks');
    expect(tabIcon()).toBe(UNREAD_FAVICON_HREF);

    view.unmount();
  });

  it('reports a count it did not finish as 99+', () => {
    unreadCount(99, true);
    const view = render();

    expect(document.title).toBe('(99+) Grand Prix Picks');

    view.unmount();
  });

  it('puts the prefix back when the router retitles the page', async () => {
    unreadCount(2);
    const view = render();

    // What a navigation does: the router owns the title and overwrites it.
    document.title = 'Leaderboard | Grand Prix Picks';
    await settle();

    expect(document.title).toBe('(2) Leaderboard | Grand Prix Picks');

    view.unmount();
  });

  it('does not stack prefixes as the count climbs', () => {
    unreadCount(1);
    const view = render();
    unreadCount(2);
    view.rerender();

    expect(document.title).toBe('(2) Grand Prix Picks');

    view.unmount();
  });

  it('clears the title and the icon once everything is read', () => {
    unreadCount(4);
    const view = render();
    unreadCount(0);
    view.rerender();

    expect(document.title).toBe('Grand Prix Picks');
    expect(tabIcon()).not.toBe(UNREAD_FAVICON_HREF);

    view.unmount();
  });

  it('hands the title back on unmount', () => {
    unreadCount(5);
    const view = render();
    view.unmount();

    expect(document.title).toBe('Grand Prix Picks');
  });

  it('badges an installed app with the count, and clears it when read', async () => {
    const setAppBadge = vi.fn(() => Promise.resolve());
    const clearAppBadge = vi.fn(() => Promise.resolve());
    Object.assign(navigator, { setAppBadge, clearAppBadge });

    unreadCount(7);
    const view = render();
    expect(setAppBadge).toHaveBeenCalledWith(7);

    unreadCount(0);
    view.rerender();
    expect(clearAppBadge).toHaveBeenCalled();

    view.unmount();
    Reflect.deleteProperty(navigator, 'setAppBadge');
    Reflect.deleteProperty(navigator, 'clearAppBadge');
  });

  it('survives a browser with no Badging API', () => {
    unreadCount(1);
    expect(() => render().unmount()).not.toThrow();
  });
});
