import { InlineLoader } from '@/components/InlineLoader';

/**
 * The weekend card's outer shell, shared by the live card and this skeleton.
 *
 * Shared because the two swap places mid-load and any difference between them
 * shows up as a layout shift. That swap is already the page's single largest
 * remaining CLS contributor, so the shell is defined once rather than copied.
 *
 * On a phone the card goes edge to edge. It is the page's one real job and the
 * only full-bleed surface on it, which is what makes the bleed read as
 * hierarchy rather than as a broken container: everything below it stays
 * inset. Practically it also buys back the horizontal room the 22-driver grid
 * wants, and the ~20px strip above it, which mattered because at 320px the
 * card header alone used to fill the viewport and push every driver row below
 * the fold.
 *
 * Three details make the bleed look deliberate rather than clipped:
 *
 * - The side borders and the corner radius go. Rounded corners flush to a
 *   viewport edge always read as a clipping bug, and square is truer to the
 *   flat direction anyway.
 * - The top border goes too. The sticky header already ends in a
 *   `border-b`, so keeping both would stack two hairlines; the header's
 *   border becomes this card's top edge.
 * - The negative top margin matches the page frame's own padding at each
 *   breakpoint (`py-5`, then `sm:py-7`), so the card meets the header exactly
 *   rather than approximately.
 *
 * Inner padding is untouched: the container bleeds, the content never touches
 * the glass.
 */
export const WEEKEND_CARD_SHELL =
  'gpp-stripe overflow-hidden border-b border-border bg-surface ' +
  '-mt-5 max-md:-mx-4 sm:-mt-7 md:mt-0 md:rounded-lg md:border';

/**
 * The weekend picks card while its data is still in flight.
 *
 * A spinner on the bare page, not a stand-in card. Earlier versions drew the
 * card shell at roughly the height the picker would take, on the theory that
 * reserving the space was worth it: the swap is this page's largest CLS
 * contributor, and collapsing it moves the feed underneath.
 *
 * In practice the reserve was the worse of the two. The shell carries a border
 * and the full-height accent stripe, so the placeholder read as a real card,
 * and every step of the load resized it — the guess is never the height the
 * picker actually lands at, and on a signed-in reload the outline visibly
 * jumped around before the content arrived. A line that moves twice draws far
 * more attention than content appearing once.
 *
 * So the loading state commits to being a loading state: nothing but a
 * spinner, and the card pops in whole. What moves now moves once.
 *
 * This is rendered from two boundaries on a signed-in load — the `lazy()`
 * Suspense fallback in `routes/index.tsx` and the dashboard's own pre-viewer
 * state — and they must agree, which is why it stays one shared component.
 * `React.lazy` suspends at least once on hydration even with the chunk cached,
 * so both are on the normal path, and rendering different things from them is
 * what used to make the page empty out and refill.
 *
 * It is not a way around `weekendReflectsViewer`: everything the capability
 * flags govern — which sessions are open, the countdown, what may still be
 * edited, the picks themselves — stays behind this until the authenticated
 * payload lands.
 */
export function WeekendCardSkeleton() {
  return (
    <div aria-busy="true">
      <InlineLoader
        label="Loading your race weekend"
        className="py-24 sm:py-28"
      />
    </div>
  );
}
