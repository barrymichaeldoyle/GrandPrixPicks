import type { Doc } from '@convex-generated/dataModel';

import { RaceFlag } from '@/components/RaceFlag';
import { getCountryCodeForRace } from '@/lib/raceCountries';

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
 * Shared deliberately, because on a signed-in load this shape is rendered from
 * *two* boundaries and they have to agree. SSR renders the dashboard, then
 * hydration hits the `lazy()` boundary in `routes/index.tsx` and React commits
 * that Suspense fallback over the server's markup — `React.lazy` suspends at
 * least once on hydration even when the chunk is already cached, so preloading
 * cannot prevent it. When the two boundaries rendered different things, the
 * page visibly emptied out mid-load and refilled.
 *
 * One component for both means the fallback is a continuation of what SSR drew
 * rather than a different screen, so there is nothing to see when React swaps
 * them.
 *
 * Which race this is, its round and whether it is a sprint weekend are facts
 * about the calendar, not the viewer, and the route loader already has them.
 * Rendering them here is what lets the race name (this page's LCP element)
 * paint with the first paint instead of waiting for Convex to re-answer
 * `getCurrentWeekend` for the authenticated viewer.
 *
 * It is not a way around `weekendReflectsViewer`. Everything the capability
 * flags govern — which sessions are open, the countdown, what may still be
 * edited, the picks themselves — stays behind the placeholder until the
 * authenticated payload lands. Only the weekend's identity paints early.
 *
 * Landing-page cost is just this markup: `RaceFlag` and `getCountryCodeForRace`
 * are already on that bundle via `SessionClock` and `LandingStickyBar`.
 */
export function WeekendCardSkeleton({
  race,
}: {
  /** Omit when even the calendar is unknown, and the header falls back to bars. */
  race?: Doc<'races'> | null;
}) {
  const countryCode = race ? getCountryCodeForRace(race) : null;

  return (
    <div
      className={WEEKEND_CARD_SHELL}
      aria-label="Loading current race weekend"
      aria-busy="true"
    >
      <div className="border-b border-border p-4 sm:p-5">
        {race ? (
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            {countryCode ? (
              <RaceFlag
                countryCode={countryCode}
                size="lg"
                className="overflow-hidden rounded-sm border border-border"
              />
            ) : null}
            <div className="min-w-0">
              <p className="gpp-label text-accent">
                Round {race.round}
                {race.hasSprint ? ' · Sprint weekend' : ''}
              </p>
              {/* Same classes as the live heading so the swap costs no reflow.
                  Not its id, though: two elements must never share one. */}
              <h2 className="mt-1 text-xl font-semibold tracking-tight text-text sm:text-2xl">
                {race.name}
              </h2>
            </div>
          </div>
        ) : (
          <>
            <div className="h-4 w-28 animate-pulse rounded bg-surface-muted" />
            <div className="mt-3 h-7 w-56 max-w-full animate-pulse rounded bg-surface-muted" />
          </>
        )}
      </div>
      <div className="p-4 sm:p-5">
        <div className="h-3 w-20 animate-pulse rounded bg-surface-muted" />
        <div className="mt-3 h-6 w-44 max-w-full animate-pulse rounded bg-surface-muted" />
        {/* Stands in for the two-column driver grid, at its real row count, so
            the card reserves close to the height the picker will occupy and the
            fill-in does not shove the feed below it down the page. */}
        <div className="mt-5 grid grid-cols-2 gap-2">
          {Array.from({ length: 22 }, (_, index) => (
            <div
              key={index}
              className="h-16 animate-pulse rounded bg-surface-muted"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
