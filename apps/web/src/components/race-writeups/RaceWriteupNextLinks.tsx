import { Link } from '@tanstack/react-router';

import { captureAnalyticsEvent } from '@/lib/analytics';

const LINK_CLASS =
  'font-semibold text-text underline decoration-border-strong underline-offset-4 hover:text-accent';

/**
 * Where the picks section sits, and so which links it owes the reader.
 *
 * The closing panel's primary action already goes to the race page, so
 * repeating that link beside it would say the same thing twice. The in-page
 * picker replaces that button with a same-page anchor, which is why the picks
 * sections carry both: without it the page a crawler reads has no link to the
 * round it is written about.
 *
 * The two picks placements are the same links from different pages, kept apart
 * only so the funnel can tell an editorial reader from someone who arrived on
 * the predictions hub.
 */
type RaceWriteupNextLinksPlacement =
  | 'closing_panel'
  | 'picks_section'
  | 'hub_picks_section';

/**
 * Where a reader goes when the write-up runs out: this round's picks, and the
 * board those picks feed.
 *
 * The write-ups are the pages search sends people to, and they were terminal.
 * A reader who finished one could reach the race page (the closing panel's
 * button) and nothing else: the leaderboard, which is the reason to make picks
 * at all, was not linked from any of the five.
 *
 * The clicks are measured because the reason for the change is a claim about
 * acquisition — that a reader who arrives from a search for "monza
 * predictions" will go on to the game — and that claim is worth more as a
 * funnel than as an opinion. Route pageviews already carry the write-up path,
 * so this event is the only missing step between landing on the piece and
 * signing up.
 */
export function RaceWriteupNextLinks({
  placement,
  raceSlug,
  venueName,
}: {
  placement: RaceWriteupNextLinksPlacement;
  raceSlug: string;
  venueName: string;
}) {
  /*
   * The hub links out to every write-up and none of them linked back, so the
   * one page built to own the "f1 picks" searches was reachable from the
   * pieces search actually lands people on only through the site footer.
   *
   * Not on the hub's own picks section, where it would be a link to the page
   * the reader is standing on.
   */
  const showHub = placement !== 'hub_picks_section';

  function track(destination: 'leaderboard' | 'race_page' | 'weekend_hub') {
    captureAnalyticsEvent('race_writeup_next_link_clicked', {
      destination,
      placement,
      race_slug: raceSlug,
    });
  }

  return (
    <p className="mt-4 text-sm leading-6 text-text-muted">
      {placement === 'closing_panel' ? null : (
        <>
          Duels and results are on the{' '}
          <Link
            to="/races/$raceSlug"
            params={{ raceSlug }}
            className={LINK_CLASS}
            onClick={() => track('race_page')}
          >
            {venueName} race page
          </Link>
          .{' '}
        </>
      )}
      {/* One sentence for both links. It was two, each describing the page
          behind its link ("The leaderboard shows the current standings"),
          which is narration: the link text can say what the reader does. */}
      See where players stand on the{' '}
      <Link
        to="/leaderboard"
        className={LINK_CLASS}
        onClick={() => track('leaderboard')}
      >
        leaderboard
      </Link>
      {showHub ? (
        <>
          , or{' '}
          <Link
            to="/f1-predictions-this-weekend"
            className={LINK_CLASS}
            onClick={() => track('weekend_hub')}
          >
            make picks for this weekend
          </Link>
        </>
      ) : null}
      .
    </p>
  );
}
