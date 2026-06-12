import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useQuery } from 'convex/react';

import { NotificationBell } from './NotificationBell';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

vi.mock('@convex-generated/api', () => ({
  api: {
    inAppNotifications: {
      getMyNotifications: 'getMyNotifications',
      markAllRead: 'markAllRead',
      markRead: 'markRead',
    },
  },
}));

vi.mock('convex/react', () => ({
  useQuery: vi.fn(() => ({ notifications: [], unreadCount: 0 })),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    params,
    search,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    to?: string;
    params?: Record<string, string>;
    search?: Record<string, unknown>;
  }) => (
    <a
      href={to === '/races/$raceSlug' ? `/races/${params?.raceSlug}` : to}
      data-search={search ? JSON.stringify(search) : undefined}
      {...props}
    >
      {children}
    </a>
  ),
}));

vi.mock('./Avatar', () => ({
  Avatar: () => null,
}));

vi.mock('./RaceFlag', () => ({
  RaceFlag: () => null,
}));

vi.mock('../lib/raceCountries', () => ({
  getCountryCodeForRace: () => null,
}));

function dispatchPointerDown(target: Element) {
  const event =
    typeof window.PointerEvent === 'function'
      ? new window.PointerEvent('pointerdown', {
          bubbles: true,
          cancelable: true,
          button: 0,
        })
      : Object.assign(
          new MouseEvent('pointerdown', { bubbles: true, cancelable: true }),
          {
            button: 0,
          },
        );
  return target.dispatchEvent(event);
}

function renderNotificationBell() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  act(() => {
    root.render(<NotificationBell />);
  });

  return {
    button: () => container.querySelector('button[aria-expanded]'),
    backdrop: () =>
      document.body.querySelector('button[aria-label="Close notifications"]'),
    isPanelOpen: () =>
      document.body.querySelector(
        'button[aria-label="Close notifications"]',
      ) !== null,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('NotificationBell', () => {
  beforeEach(() => {
    vi.mocked(useQuery).mockReturnValue({ notifications: [], unreadCount: 0 });
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('toggles closed when pressing the bell while the panel is already open', () => {
    const view = renderNotificationBell();
    const button = view.button();

    expect(button).not.toBeNull();

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(view.isPanelOpen()).toBe(true);

    act(() => {
      if (button) {
        dispatchPointerDown(button);
        button.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    });

    expect(view.isPanelOpen()).toBe(false);
    view.unmount();
  });

  it('closes from the backdrop tap sequence', () => {
    const view = renderNotificationBell();
    const button = view.button();

    expect(button).not.toBeNull();

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(view.isPanelOpen()).toBe(true);

    const backdrop = view.backdrop();

    expect(backdrop).not.toBeNull();

    let pointerResult = true;
    act(() => {
      if (backdrop) {
        pointerResult = dispatchPointerDown(backdrop);
        backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      }
    });

    expect(pointerResult).toBe(false);
    expect(view.isPanelOpen()).toBe(false);
    view.unmount();
  });

  it('renders a full-screen backdrop in the portal and consumes pointerdown', () => {
    const view = renderNotificationBell();
    const button = view.button();

    expect(button).not.toBeNull();

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const backdrop = view.backdrop();

    expect(backdrop).not.toBeNull();
    expect(backdrop?.parentElement).toBe(document.body);
    expect(view.isPanelOpen()).toBe(true);

    let pointerResult = true;
    act(() => {
      if (backdrop) {
        pointerResult = dispatchPointerDown(backdrop);
      }
    });

    expect(pointerResult).toBe(false);
    expect(view.isPanelOpen()).toBe(true);
    view.unmount();
  });

  it('links result notifications to the published result session', () => {
    vi.mocked(useQuery).mockReturnValue({
      notifications: [
        {
          _id: 'notification_1',
          type: 'results_published',
          createdAt: Date.now(),
          raceId: 'race_1',
          raceName: 'Canadian Grand Prix',
          raceSlug: 'canadian-grand-prix-2026',
          sessionType: 'sprint_quali',
          points: 14,
        },
      ],
      unreadCount: 1,
    });

    const view = renderNotificationBell();
    const button = view.button();

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const link = document.body.querySelector<HTMLAnchorElement>(
      'a[href="/races/canadian-grand-prix-2026"]',
    );

    expect(link).not.toBeNull();
    expect(link?.dataset.search).toBe('{"session":"sprint_quali"}');
    expect(document.body.textContent).toContain('Sprint Quali results are in');
    view.unmount();
  });

  it('shows a race calendar CTA when there are no notifications', () => {
    const view = renderNotificationBell();
    const button = view.button();

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    const link =
      document.body.querySelector<HTMLAnchorElement>('a[href="/races"]');

    expect(link).not.toBeNull();
    expect(link?.textContent).toBe('View race calendar');
    view.unmount();
  });

  it('uses picks-focused copy for locked session notifications', () => {
    vi.mocked(useQuery).mockReturnValue({
      notifications: [
        {
          _id: 'notification_2',
          type: 'session_locked',
          createdAt: Date.now(),
          raceId: 'race_1',
          raceName: 'Canadian Grand Prix',
          raceSlug: 'canadian-grand-prix-2026',
          sessionType: 'quali',
        },
      ],
      unreadCount: 1,
    });

    const view = renderNotificationBell();
    const button = view.button();

    act(() => {
      button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(document.body.textContent).toContain('Qualifying picks are locked');
    view.unmount();
  });
});
