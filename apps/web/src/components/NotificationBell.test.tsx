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
      getMyUnreadCount: 'getMyUnreadCount',
    },
  },
}));

vi.mock('convex/react', () => ({
  useQuery: vi.fn(() => ({ count: 0, hasMore: false })),
  useMutation: vi.fn(() => vi.fn()),
}));

vi.mock('@tanstack/react-router', () => ({
  Link: ({
    children,
    to,
    className,
    activeProps: _activeProps,
    activeOptions: _activeOptions,
    ...props
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    to?: string;
    activeProps?: Record<string, unknown>;
    activeOptions?: Record<string, unknown>;
  }) => (
    <a href={to} className={className} {...props}>
      {children}
    </a>
  ),
  useRouterState: (opts?: {
    select?: (state: { location: { pathname: string } }) => unknown;
  }) =>
    opts?.select?.({ location: { pathname: '/' } }) ?? {
      location: { pathname: '/' },
    },
}));

function renderNotificationBell() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);

  act(() => {
    root.render(<NotificationBell />);
  });

  return {
    link: () => container.querySelector('a[href="/notifications"]'),
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
    vi.mocked(useQuery).mockReturnValue({ count: 0, hasMore: false });
  });

  afterEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
  });

  it('links to the notifications page', () => {
    const view = renderNotificationBell();
    const link = view.link();

    expect(link).not.toBeNull();
    expect(link?.textContent).toContain('Notifications');
    view.unmount();
  });

  it('shows an unread badge when there are unread notifications', () => {
    vi.mocked(useQuery).mockReturnValue({ count: 3, hasMore: false });

    const view = renderNotificationBell();
    const link = view.link();

    expect(link?.getAttribute('aria-label')).toBe('Notifications (3 unread)');
    expect(link?.textContent).toContain('3');
    view.unmount();
  });

  it('caps the badge at 99+ when the backend stopped counting', () => {
    vi.mocked(useQuery).mockReturnValue({ count: 99, hasMore: true });

    const view = renderNotificationBell();
    const link = view.link();

    expect(link?.textContent).toContain('99+');
    expect(link?.getAttribute('aria-label')).toBe(
      'Notifications (more than 99 unread)',
    );
    view.unmount();
  });
});
