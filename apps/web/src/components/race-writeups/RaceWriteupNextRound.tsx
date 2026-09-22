import { Link } from '@tanstack/react-router';

import { RACE_WRITEUP_SECTION_HEADING } from './RaceWriteupSection';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { getRaceWriteup } from '@/lib/raceWriteups';

/**
 * Where the season goes after this weekend, on a finished write-up.
 *
 * `race-writeup-lifecycle.md` asks an archived page to link the next round,
 * and it was the one instruction the finished pages did not follow: a reader
 * who arrived from search for a race that has already run reached the bottom
 * of the piece and found links to this round's picks and the leaderboard, both
 * of which are now closed to them. The round they can still play is the one
 * thing the page did not offer.
 *
 * Prefers the next round's own write-up and falls back to its race page, so a
 * weekend nobody has written a piece for still gets a link rather than being
 * skipped. Renders nothing at the end of a season, which is the honest answer
 * when there is no next round.
 *
 * Loader data, like everything else on these pages that is a link: a
 * `useQuery` here would be absent from the SSR HTML and the forward link would
 * exist for readers and not for crawlers, which is the failure that orphaned
 * the practice pages.
 */
export function RaceWriteupNextRound({
  nextRace,
}: {
  nextRace: { slug: string; name: string; round: number } | null;
}) {
  if (!nextRace) {
    return null;
  }
  const writeup = getRaceWriteup(nextRace.slug);

  return (
    <section className="max-w-3xl py-8 sm:py-16">
      <h2 className={RACE_WRITEUP_SECTION_HEADING}>Next round</h2>
      <p className="gpp-reading-copy mt-4 text-text-muted">
        Round {nextRace.round} is the {nextRace.name}.{' '}
        <Link
          to={writeup ? writeup.to : '/races/$raceSlug'}
          params={writeup ? undefined : { raceSlug: nextRace.slug }}
          className="font-semibold text-text underline decoration-border-strong underline-offset-4 hover:text-accent"
          onClick={() =>
            captureAnalyticsEvent('race_writeup_next_round_clicked', {
              race_slug: nextRace.slug,
              has_writeup: writeup != null,
            })
          }
        >
          {writeup ? writeup.cta : `See the ${nextRace.name} race page`}
        </Link>
        .
      </p>
    </section>
  );
}
