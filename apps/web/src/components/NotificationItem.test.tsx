import { act, type ComponentProps } from 'react';
import type { Root } from 'react-dom/client';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { NotificationItem } from './NotificationItem';

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

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

vi.mock('@/lib/raceCountries', () => ({
  getCountryCodeForRace: () => null,
}));

function renderItem(
  notification: ComponentProps<typeof NotificationItem>['notification'],
) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root: Root = createRoot(container);
  const onMarkRead = vi.fn();

  act(() => {
    root.render(
      <NotificationItem notification={notification} onMarkRead={onMarkRead} />,
    );
  });

  return {
    container,
    onMarkRead,
    unmount: () => {
      act(() => {
        root.unmount();
      });
      container.remove();
    },
  };
}

describe('NotificationItem', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('links result notifications to the published result session', () => {
    const view = renderItem({
      _id: 'notification_1' as never,
      type: 'results_published',
      createdAt: Date.now(),
      raceId: 'race_1' as never,
      raceName: 'Canadian Grand Prix',
      raceSlug: 'canadian-grand-prix-2026',
      sessionType: 'sprint_quali',
      points: 14,
    });

    const link = view.container.querySelector<HTMLAnchorElement>(
      'a[href="/races/canadian-grand-prix-2026"]',
    );

    expect(link).not.toBeNull();
    expect(link?.dataset.search).toBe('{"session":"sprint_quali"}');
    expect(view.container.textContent).toContain('Sprint Quali results are in');
    view.unmount();
  });

  it('uses picks-focused copy for locked session notifications', () => {
    const view = renderItem({
      _id: 'notification_2' as never,
      type: 'session_locked',
      createdAt: Date.now(),
      raceId: 'race_1' as never,
      raceName: 'Canadian Grand Prix',
      raceSlug: 'canadian-grand-prix-2026',
      sessionType: 'quali',
    });

    expect(view.container.textContent).toContain('Qualifying picks are locked');
    expect(
      view.container.querySelector('a[href="/races/canadian-grand-prix-2026"]'),
    ).not.toBeNull();
    view.unmount();
  });

  it('lets an announcement with no link be marked read on its own', () => {
    const view = renderItem({
      _id: 'notification_3' as never,
      type: 'announcement',
      createdAt: Date.now(),
      title: 'Season pass is live',
    });

    // Nothing to navigate to, so the row itself must not be a link.
    expect(view.container.querySelector('a')).toBeNull();

    const markRead = view.container.querySelector<HTMLButtonElement>('button');
    expect(markRead?.textContent).toContain('Mark as read');

    act(() => {
      markRead?.click();
    });
    expect(view.onMarkRead).toHaveBeenCalledWith('notification_3', undefined);
    view.unmount();
  });

  it('drops the mark-as-read control once a notification is read', () => {
    const view = renderItem({
      _id: 'notification_4' as never,
      type: 'announcement',
      createdAt: Date.now(),
      readAt: Date.now(),
      title: 'Season pass is live',
    });

    expect(view.container.querySelector('button')).toBeNull();
    view.unmount();
  });
});
