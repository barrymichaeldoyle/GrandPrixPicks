import type { Doc } from '@convex-generated/dataModel';

import { RaceFlag } from '@/components/RaceFlag';
import { getCountryCodeForRace } from '@/lib/raceCountries';

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
      className="gpp-stripe overflow-hidden rounded-lg border border-border bg-surface"
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
