import { Link, useRouterState } from '@tanstack/react-router';
import type { LucideIcon } from 'lucide-react';
import { House, Trophy, Users } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  HEADER_NAV_TAB_ACTIVE_CLASS,
  HEADER_NAV_TAB_CLASS,
  HEADER_NAV_TAB_ICON_CLASS,
  HEADER_NAV_TAB_LABEL_CLASS,
} from './headerNavTabStyles.ts';

export type AppNavTab = {
  to: string;
  label: string;
  icon: LucideIcon;
  /**
   * Match this path and nothing below it. Home needs it — `/` is a prefix of
   * every route, so without it Home would light up everywhere.
   */
  exact?: boolean;
};

/**
 * The signed-in destinations, in bar order. One list, two surfaces: the header
 * tabs from 844px up and the mobile tab bar below it. Notifications and Me are
 * rendered separately because neither is a plain link — one carries an unread
 * badge from a live query, the other is Clerk's UserButton.
 */
export const APP_NAV_TABS: AppNavTab[] = [
  { to: '/', label: 'Home', icon: House, exact: true },
  { to: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { to: '/leagues', label: 'Leagues', icon: Users },
];

/**
 * A tab is active for its whole subtree, so `/leagues/monaco-masters` keeps
 * Leagues lit. Resolved here rather than through TanStack's
 * `activeProps.className`, which appends to `className` instead of replacing
 * it and would leave both the active and inactive colours on the element.
 */
function useIsNavTabActive({ to, exact }: Pick<AppNavTab, 'to' | 'exact'>) {
  return useRouterState({
    select: (state) => {
      const { pathname } = state.location;
      return exact
        ? pathname === to
        : pathname === to || pathname.startsWith(`${to}/`);
    },
  });
}

/**
 * The mobile bar mirrors the header tab but flips the active rule to the top
 * edge, since the bar sits against the bottom of the viewport and a bottom
 * border there would be off-screen behind the home indicator.
 */
const BAR_TAB_BASE =
  'flex h-full min-w-0 flex-1 flex-col items-center justify-center gap-0.5 border-t-2 px-0.5 transition-colors min-[360px]:px-1';

const BAR_TAB_CLASS = `${BAR_TAB_BASE} border-transparent text-text-muted duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset`;

const BAR_TAB_ACTIVE_CLASS = `${BAR_TAB_BASE} border-accent text-accent`;

/**
 * Four tabs split the viewport, which leaves ~90px a tab on a 390px phone. The
 * header's 0.12em label tracking adds ~13px to a word like "Notifications" and
 * pushes it over that on its own, so the bar tracks tighter, and steps down
 * again below 360px where a quarter of the screen is only 72px. `truncate` is
 * the floor under both, not the plan.
 */
const BAR_TAB_LABEL_CLASS =
  'max-w-full truncate text-center text-[9px] font-medium tracking-normal uppercase min-[360px]:text-[10px] min-[360px]:tracking-[0.04em]';

export type NavTabVariant = 'header' | 'bar';

function navTabClass(variant: NavTabVariant, isActive: boolean) {
  if (variant === 'bar') {
    return isActive ? BAR_TAB_ACTIVE_CLASS : BAR_TAB_CLASS;
  }
  return isActive ? HEADER_NAV_TAB_ACTIVE_CLASS : HEADER_NAV_TAB_CLASS;
}

/**
 * One tab, either surface: icon over label, filled icon and accent underline
 * when active. `badge` is rendered against the icon rather than the tab so it
 * pins to the glyph and not to the label's wider box.
 */
export function NavTab({
  tab,
  variant,
  badge,
  ariaLabel,
}: {
  tab: AppNavTab;
  variant: NavTabVariant;
  badge?: ReactNode;
  ariaLabel?: string;
}) {
  const isActive = useIsNavTabActive(tab);
  const Icon = tab.icon;

  return (
    <Link
      to={tab.to}
      className={navTabClass(variant, isActive)}
      activeProps={{ 'aria-current': 'page' as const }}
      activeOptions={{ exact: tab.exact ?? false, includeSearch: false }}
      aria-label={ariaLabel ?? tab.label}
    >
      <span className={`${HEADER_NAV_TAB_ICON_CLASS} relative`}>
        <Icon
          className={`h-5 w-5 shrink-0 ${isActive ? 'fill-current' : ''}`}
          strokeWidth={isActive ? 0 : 1.75}
          aria-hidden="true"
        />
        {badge}
      </span>
      <span
        className={
          variant === 'bar' ? BAR_TAB_LABEL_CLASS : HEADER_NAV_TAB_LABEL_CLASS
        }
      >
        {tab.label}
      </span>
    </Link>
  );
}
