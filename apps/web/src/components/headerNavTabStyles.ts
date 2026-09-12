/**
 * Shared chrome for signed-in header tabs (Home, Notifications, Me): icon over
 * label, full bar height, accent underline when selected.
 *
 * Tabs size to their own label with a floor rather than sharing one fixed
 * width, so "Home" and "Me" stay compact while "Notifications" is never
 * clipped.
 *
 * Inactive/active are mutually exclusive — pick one, never concatenate them.
 * TanStack Router's `activeProps.className` *appends* to `className`, which
 * would leave `border-transparent` and `border-accent` both on the element and
 * hand the result to CSS source order. Resolve active state yourself
 * (`useRouterState`) and swap the whole string.
 */
const HEADER_NAV_TAB_BASE =
  'flex h-full min-w-16 shrink-0 flex-col items-center justify-center gap-0.5 border-b-2 px-2 transition-colors sm:min-w-20 sm:px-3';

export const HEADER_NAV_TAB_CLASS = `${HEADER_NAV_TAB_BASE} border-transparent text-text-muted duration-150 ease-out hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset`;

export const HEADER_NAV_TAB_ACTIVE_CLASS = `${HEADER_NAV_TAB_BASE} border-accent text-accent`;

/**
 * Fixed-height icon row. The account tab's avatar is larger than the Lucide
 * glyphs beside it, so without a shared row height the three labels underneath
 * would sit on three different baselines.
 */
export const HEADER_NAV_TAB_ICON_CLASS =
  'flex h-6 shrink-0 items-center justify-center';

/**
 * Sentence case, so a tab reads as the destination it is. Dropping the caps and
 * the 0.12em tracking takes width out of the label, and the tab's `min-w-16`
 * floor holds the bar's rhythm either way.
 *
 * `text-xs` rather than the 11px this used to hardcode: navigation should not
 * be the smallest type on the page, and a bare px value is the one kind of size
 * that ignores a raised browser font setting.
 */
export const HEADER_NAV_TAB_LABEL_CLASS =
  'text-center text-xs font-medium whitespace-nowrap';
