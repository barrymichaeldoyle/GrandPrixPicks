import { Link } from '@tanstack/react-router';

import { captureAnalyticsEvent } from '@/lib/analytics';

const LINK_CLASS =
  'font-semibold text-text underline decoration-border-strong underline-offset-4 hover:text-accent';

/**
 * Where the write-up sits on the page, and so which links it owes the reader.
 *
 * The closing panel's primary action already goes to the race page, so
 * repeating that link beside it would say the same thing twice. The in-page
 * picker replaces that button with a same-page anchor, which is why the picks
 * section carries both: without it the page a crawler reads has no link to the
 * round it is written about.
 */
type RaceWriteupNextLinksPlacement = 'closing_panel' | 'picks_section';

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
  function track(destination: 'leaderboard' | 'race_page') {
    captureAnalyticsEvent('race_writeup_next_link_clicked', {
      destination,
      placement,
      race_slug: raceSlug,
    });
  }

  return (
    <p className="mt-4 text-sm leading-6 text-text-muted">
      {placement === 'picks_section' ? (
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
      ) : null}
      <Link
        to="/leaderboard"
        className={LINK_CLASS}
        onClick={() => track('leaderboard')}
      >
        The leaderboard
      </Link>{' '}
      shows the current standings.
    </p>
  );
}
