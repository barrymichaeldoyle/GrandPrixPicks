import { Link } from '@tanstack/react-router';
import { ExternalLink } from 'lucide-react';
import type { CSSProperties } from 'react';

import { StartingGridTable } from '@/components/StartingGridTable';
import { newsMentionsGridPenalty } from '@/lib/newsGridPenalty';
import { TEAM_COLORS } from '@/lib/teamColors';

import { formatRelativeTime } from './helpers';
import type { FeedEvent } from './types';

/**
 * A piece of weekend news that changes a pick.
 *
 * The second authorless card, after `LineupChangeItem`, and it borrows that
 * card's opening for the same reason: every other item in the feed is a
 * player's ("Barry scored 18"), so dropping the avatar row and leading with a
 * label is what tells a reader at a glance that this is the site talking.
 *
 * A card is a headline, the story, and where it came from. It also carried
 * driver badges and a row of REVISIT session chips, and in a feed that is two
 * labelled rows above two sentences: the badges repeated codes the headline had
 * already named, and the chips read "Qualifying, Race" on nearly every item.
 * The driver survives as the team colour on the edge, which is the one thing
 * the headline cannot say at a glance.
 *
 * `affectsSessions` is still required when publishing — see `docs/race-news.md`
 * — and still drives the write-up page. This surface stops repeating it.
 *
 * The card owns its own padding rather than taking it from `FeedItem`, because
 * the team bar is drawn on this element: with the padding outside, the bar was
 * inset from the block's edge and short of its neighbours, and a run of leaning
 * bars only lines up if each one runs the full height of its row.
 */
export function RaceNewsItem({
  event,
  grouped = false,
}: {
  event: FeedEvent;
  /**
   * True when a `NewsGroup` already carries the label and the scoring link for
   * the whole run. Two consecutive news cards each repeated the eyebrow, the
   * chips and the same policy link, which is three identical things stacked and
   * the reason the feed read as a wall.
   */
  grouped?: boolean;
}) {
  // The item's own colour, from the driver it is about. Same colour the badges
  // and `LineupChangeItem` use, so a run of news reads as a Williams story
  // then a Mercedes one rather than two grey blocks. With the badges gone it is
  // the only thing saying whose story this is before the headline.
  const team = event.newsDrivers?.[0]?.team ?? null;
  const teamColour = (team && TEAM_COLORS[team]) || 'var(--accent)';

  return (
    <div
      className={
        // pl-4, not pl-3: the leaning bar is 8px across at its thick end, and
        // 12px of padding left 4px between colour and copy on that end only,
        // which reads as the text drifting rather than the bar tapering.
        teamColour ? 'gpp-team-bar gpp-team-bar-lean p-2.5 pl-4' : 'p-2.5'
      }
      style={
        teamColour
          ? ({ '--team-colour': teamColour } as CSSProperties)
          : undefined
      }
    >
      {grouped ? null : (
        <p className="flex items-center gap-1.5 text-xs font-medium text-accent">
          Weekend news
        </p>
      )}

      {/* Full-width headline so it wraps consistently with the body copy. */}
      <p className="text-sm font-semibold text-text not-first:mt-1.5">
        {event.newsHeadline}
        <span className="ml-1.5 text-xs font-normal whitespace-nowrap text-text-muted">
          · {formatRelativeTime(event.createdAt)}
        </span>
      </p>

      {event.newsBody ? (
        <p className="gpp-reading-copy mt-2 text-sm text-text-muted">
          {event.newsBody}
        </p>
      ) : null}

      {/* Closed on the top ten, which is the part of a grid that decides a Top
          5, with the rest a tap away. A feed card that opens twenty-two rows
          tall buries the sessions either side of it. */}
      {event.newsStartingGrid && event.newsStartingGrid.length > 0 ? (
        <StartingGridTable
          entries={event.newsStartingGrid}
          collapsedRows={10}
        />
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1.5">
          {event.newsSourceUrl && event.newsSourceName ? (
            // Attribution rather than decoration: the card states something as
            // fact, so where it came from travels with it, the same standard the
            // write-up pages hold.
            <a
              href={event.newsSourceUrl}
              target="_blank"
              rel="noreferrer"
              className="gpp-touch-target inline-flex items-center gap-1 text-xs text-text-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-text"
            >
              {event.newsSourceName}
              <ExternalLink className="size-3 shrink-0" aria-hidden />
            </a>
          ) : null}

          {/* The one thing the chips carried that was worth keeping: what these
            picks are scored against, which is the half readers get wrong about
            a grid penalty. It moves a start, it does not rewrite a
            classification. Only when this card is itself a penalty: a livery
            or a pit-lane start has no scoring question to answer. Grouped,
            `NewsGroup` says it once for the whole run instead. */}
          {grouped || !newsMentionsGridPenalty(event) ? null : (
            <Link
              to="/results-policy"
              hash="sessions-heading"
              className="text-xs whitespace-nowrap text-text-muted underline decoration-border-strong underline-offset-4 hover:text-text"
            >
              How these are scored
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
