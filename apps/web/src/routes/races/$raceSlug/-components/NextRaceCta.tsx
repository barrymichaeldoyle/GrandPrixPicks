import { api } from '@convex-generated/api';
import type { Doc } from '@convex-generated/dataModel';
import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import { primaryButtonStyles } from '@/components/Button/Button';
import { useQuery } from '@/integrations/convex/query';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { useUserDateFormat } from '@/lib/useUserDateFormat';

type NextRaceCtaProps = {
  nextRace: Doc<'races'>;
};

/**
 * The hand-off at the end of a finished race weekend.
 *
 * A scored race page ran to roughly 4,000px on a phone without a single call
 * to action in its body: the only way to start playing was the header button,
 * and the two loudest accent elements below the fold were a link to the
 * circuit page and a disclosure toggle. For the visitor this product is
 * actually trying to reach — arriving cold from search, on a phone, reading
 * about a race they can no longer pick — that is the whole conversion step,
 * missing.
 *
 * The section and its link render from loader data, never from the query
 * below, so the internal link is in the SSR HTML rather than appearing only
 * after the client subscriptions boot. Only the button's wording waits on the
 * viewer, and it has a correct default while it does.
 */
export function NextRaceCta({ nextRace }: NextRaceCtaProps) {
  const { formatDateLong } = useUserDateFormat();
  const nextWeekendPicks = useQuery(api.predictions.myWeekendPredictions, {
    raceId: nextRace._id,
  });
  const hasPicksForNextRace = Object.values(
    nextWeekendPicks?.predictions ?? {},
  ).some((picks) => (picks?.length ?? 0) > 0);

  return (
    <section
      data-testid="next-race-cta"
      className="mt-10 flex flex-col gap-5 border-t border-border pt-6 sm:flex-row sm:items-end sm:justify-between sm:gap-8"
    >
      <div className="min-w-0">
        <span className="gpp-label block">Next up</span>
        <p className="mt-2 text-2xl leading-tight font-normal tracking-tight text-text">
          {nextRace.name}
        </p>
        <p className="mt-1.5 text-sm text-text-muted" suppressHydrationWarning>
          Round {nextRace.round}
          <span aria-hidden="true"> · </span>
          {formatDateLong(nextRace.raceStartAt)}
        </p>
      </div>
      <Link
        to="/races/$raceSlug"
        params={{ raceSlug: nextRace.slug }}
        className={`${primaryButtonStyles('md')} shrink-0 whitespace-nowrap`}
        onClick={() =>
          captureAnalyticsEvent('next_race_cta_clicked', {
            race_slug: nextRace.slug,
            has_picks: hasPicksForNextRace,
          })
        }
      >
        <span>
          {hasPicksForNextRace ? 'View your picks' : 'Make your picks'}
        </span>
        <ArrowRight size={16} aria-hidden="true" />
      </Link>
    </section>
  );
}
