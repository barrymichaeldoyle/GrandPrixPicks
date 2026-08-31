import type { ReactNode } from 'react';

import { useStickyWhenItFits } from '@/hooks/useStickyWhenItFits';

/**
 * Tailwind needs whole class names, so the orders are a lookup rather than a
 * template. Ten is well past what any rail has needed.
 */
const mobileOrderClass = [
  'max-md:order-1',
  'max-md:order-2',
  'max-md:order-3',
  'max-md:order-4',
  'max-md:order-5',
  'max-md:order-6',
  'max-md:order-7',
  'max-md:order-8',
  'max-md:order-9',
  'max-md:order-10',
] as const;

/**
 * One card in a rail, and where it lands when the rails collapse.
 *
 * Below `md` the rails dissolve (see `railClassName`) and every card becomes a
 * direct item of the page grid, so the single-column order is no longer "left
 * rail then right rail" — it is whatever `order` says, across both rails. That
 * is the whole point: the mobile sequence is rarely the desktop one read top to
 * bottom, and expressing it here means it is stated once instead of maintained
 * as a duplicate list of the same cards.
 *
 * `order` is 1-based and page-wide: number the rail cards in the order a phone
 * should meet them, counting both rails together. Ties fall back to DOM order.
 */
export function RailItem({
  order,
  hideOnMobile = false,
  children,
}: {
  /** Omit when `hideOnMobile` is set: there is no stack position to give. */
  order?: number;
  /**
   * Keep this card off the single-column stack.
   *
   * For cards that only earn their place as rail furniture — the profile card
   * repeats identity the header already shows, and a page's filter nav has its
   * own mobile treatment. Still mounted, just not shown, so use it for chrome
   * rather than anything expensive.
   */
  hideOnMobile?: boolean;
  children: ReactNode;
}) {
  const orderClass =
    order === undefined
      ? undefined
      : (mobileOrderClass[order - 1] ?? mobileOrderClass.at(-1));

  // `empty:hidden` matters more than it looks. Cards that opt out of the mobile
  // stack render null rather than an element (see `hideWhenEmpty`), which would
  // otherwise leave this wrapper as a zero-height grid item — still separated
  // from its neighbours by the grid gap on both sides. Three of those is ~48px
  // of dead space in the middle of the stack with nothing to show for it.
  // Taking the empty wrapper out of layout removes the item, and its gaps with
  // it.
  return (
    <div
      className={`empty:hidden ${hideOnMobile ? 'max-md:hidden' : (orderClass ?? '')}`}
    >
      {children}
    </div>
  );
}

/**
 * The signed-in three-column page frame: rails either side of a centre column,
 * collapsing to a single column with the rail cards stacked underneath.
 *
 * Extracted so every app page wears the same frame — the dashboard, the
 * notifications page, the leaderboard and leagues all had (or were about to
 * have) their own copy of this grid, the sticky-rail wiring and the mobile
 * stack. The point of the layout is that the app feels like one place, which it
 * only does if the columns land on the same pixels everywhere.
 *
 * The rails are decoration around the page, not the page: pass `left`/`right`
 * as null on public routes and the centre column simply takes the full width.
 */
export function AppPageLayout({
  left,
  leftLabel,
  right,
  rightLabel,
  children,
  centerClassName = 'space-y-5',
}: {
  /** Desktop left rail. */
  left?: ReactNode;
  /** Names the left rail for screen readers — say what is in it, not "left". */
  leftLabel?: string;
  /** Desktop right rail. */
  right?: ReactNode;
  /** Names the right rail for screen readers. */
  rightLabel?: string;
  children: ReactNode;
  /** Vertical rhythm of the centre column; pages with denser rows tighten it. */
  centerClassName?: string;
}) {
  // Rails never get their own scroller: the page scroll is the only one. A rail
  // that fits under the header pins as you scroll; a taller one stays in normal
  // flow so its tail is still reachable.
  //
  // Pinning is deliberately `lg`-only. In the two-column stage both rails share
  // one grid column, so a sticky rail would ride up over the one below it.
  const [leftRailRef, leftRailIsSticky] = useStickyWhenItFits<HTMLElement>();
  const [rightRailRef, rightRailIsSticky] = useStickyWhenItFits<HTMLElement>();
  // `max-md:contents` is what lets the rails render once instead of twice.
  //
  // The rails used to be `hidden` below `md` while a second copy of the same
  // cards was rendered inline for the single-column stage. Hidden is not
  // unmounted: on a phone that meant every rail card mounted twice, ran its
  // hooks twice and put its subtree in the DOM twice (measured: 96 of 573
  // nodes were the invisible copy), and it left two hand-maintained lists that
  // could quietly drift apart.
  //
  // `display: contents` dissolves the `<aside>` box below `md` so its cards
  // become direct grid items of the page, free to be ordered into the
  // single-column stack by `RailItem`. From `md` the asides are real boxes
  // again and stack their own children as before. Sticky is `lg`-only, so it
  // never overlaps with this.
  const railClassName = 'max-md:contents space-y-4';
  const stickyRailClassName = `${railClassName} lg:sticky lg:top-[calc(var(--nav-height)+1rem)]`;

  const hasLeft = Boolean(left);
  const hasRight = Boolean(right);
  const hasBothRails = hasLeft && hasRight;

  // Three stages, not two. Going straight from three columns to one wasted the
  // 768–1023px band, which is every tablet in portrait and a big share of
  // resized desktop windows.
  //
  // The middle stage keeps both rails by stacking them into a single column
  // beside the centre — same DOM, re-placed with explicit grid coordinates, so
  // nothing is rendered twice, no card self-fetches twice, and no landmark is
  // duplicated. The centre spans both rail rows so it keeps the full height.
  //
  // Collapse to whichever columns actually have content: a page with no rails
  // is centred rather than crammed against an empty gutter.
  // `auto 1fr` matters: with two auto rows, the centre column's height is
  // distributed across both, which inflates row 1 and leaves a gap between the
  // stacked rails. Pinning row 1 to its content sends the slack to row 2.
  const gridRows = hasBothRails ? 'md:grid-rows-[auto_1fr] lg:grid-rows-1' : '';

  const gridColumns = hasBothRails
    ? 'md:grid-cols-[minmax(0,1fr)_260px] lg:grid-cols-[220px_minmax(0,1fr)_280px] xl:grid-cols-[240px_minmax(0,1fr)_300px]'
    : hasLeft
      ? 'md:grid-cols-[220px_minmax(0,1fr)] xl:grid-cols-[240px_minmax(0,1fr)]'
      : hasRight
        ? 'md:grid-cols-[minmax(0,1fr)_280px] xl:grid-cols-[minmax(0,1fr)_300px]'
        : '';

  // Only the both-rails case needs explicit placement; with one rail the DOM
  // order already lands the columns correctly.
  const leftPlacement = hasBothRails
    ? 'md:col-start-2 md:row-start-1 lg:col-start-1 lg:row-start-1'
    : '';
  const centerPlacement = hasBothRails
    ? 'md:col-start-1 md:row-start-1 md:row-span-2 lg:col-start-2 lg:row-span-1'
    : '';
  const rightPlacement = hasBothRails
    ? 'md:col-start-2 md:row-start-2 lg:col-start-3 lg:row-start-1'
    : '';

  return (
    <div className="min-h-full bg-page">
      <div className="mx-auto w-full max-w-(--page-max) px-4 py-5 sm:py-7">
        <div
          className={`grid gap-4 md:items-start md:gap-6 lg:gap-7 xl:gap-8 ${gridRows} ${gridColumns}`}
        >
          {hasLeft ? (
            <aside
              ref={leftRailRef}
              aria-label={leftLabel}
              className={`${leftRailIsSticky ? stickyRailClassName : railClassName} ${leftPlacement}`}
            >
              {left}
            </aside>
          ) : null}

          {/* No order class: the default 0 puts the page's own content above
              every `RailItem`, whose orders start at 1. */}
          <div className={`min-w-0 ${centerPlacement} ${centerClassName}`}>
            {children}
          </div>

          {hasRight ? (
            <aside
              ref={rightRailRef}
              aria-label={rightLabel}
              className={`${rightRailIsSticky ? stickyRailClassName : railClassName} ${rightPlacement}`}
            >
              {right}
            </aside>
          ) : null}
        </div>
      </div>
    </div>
  );
}
