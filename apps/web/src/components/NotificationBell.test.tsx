import { act } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

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
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href="/" {...props}>
      {children}
    </a>
  ),
}));

vi.mock('./Avatar', () => ({
  Avatar: () => null,
}));

vi.mock('./RaceCard', () => ({
  RaceFlag: () => null,
  getCountryCodeForRace: () => null,
}));

function dispatchPointerDown(target: Element) {
  const event =
    typeof window.PointerEvent === 'function'
      ? new window.PointerEvent('pointerdown', { bubbles: true, button: 0 })
      : Object.assign(new MouseEvent('pointerdown', { bubbles: true }), {
          button: 0,
        });
  target.dispatchEvent(event);
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
    isPanelOpen: () => container.textContent?.includes('No notifications yet'),
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('NotificationBell', () => {
  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('stays closed when pressing the bell while the panel is already open', () => {
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
});
