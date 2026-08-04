import { api } from '@convex-generated/api';
import { useQuery } from 'convex/react';
import { Bell } from 'lucide-react';

import type { AppNavTab, NavTabVariant } from './NavTab';
import { NavTab } from './NavTab';

const NOTIFICATIONS_TAB: AppNavTab = {
  to: '/notifications',
  label: 'Notifications',
  icon: Bell,
  exact: true,
};

/**
 * Notifications tab. Same chrome as every other tab (see {@link NavTab}); the
 * only difference is the unread badge, which is why it isn't just another entry
 * in `APP_NAV_TABS`. The slot mounts for signed-in viewers from first paint, so
 * the tab never pops in when the query resolves.
 */
export function NotificationBell({
  variant = 'header',
}: {
  variant?: NavTabVariant;
} = {}) {
  // The dedicated count query, not the paginated list: the badge only needs a
  // number, and the list is a page at a time now.
  const unread = useQuery(api.inAppNotifications.getMyUnreadCount);
  const count = unread?.count ?? 0;
  // The backend stops counting at 99 and reports `hasMore` rather than
  // guessing, so the badge says "99+" instead of a number nobody counted.
  const badgeText = unread?.hasMore ? '99+' : count > 9 ? '9+' : String(count);
  const ariaCount = unread?.hasMore ? 'more than 99' : String(count);

  return (
    <NavTab
      tab={NOTIFICATIONS_TAB}
      variant={variant}
      ariaLabel={`Notifications${count > 0 ? ` (${ariaCount} unread)` : ''}`}
      badge={
        count > 0 ? (
          <span
            aria-hidden
            className="absolute -top-1.5 -right-2.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-error px-0.5 text-[10px] leading-none font-semibold text-text-on-accent"
          >
            {badgeText}
          </span>
        ) : null
      }
    />
  );
}
