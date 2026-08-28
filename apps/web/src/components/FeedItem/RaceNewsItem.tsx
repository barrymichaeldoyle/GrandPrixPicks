import { Link } from '@tanstack/react-router';
import { ExternalLink } from 'lucide-react';
import { useState } from 'react';
import type { CSSProperties } from 'react';

import { DriverBadge } from '@/components/DriverBadge';
import { TEAM_COLORS } from '@/lib/teamColors';
import { SESSION_LABELS } from '@/lib/sessions';
import type { SessionType } from '@/lib/sessions';

import { ReactionButton } from '../ReactionButton';
import { formatRelativeTime } from './helpers';
import { ReactionsModal } from './ReactionsModal';
import type { FeedEvent } from './types';

/**
 * A piece of weekend news that changes a pick.
 *
 * The second authorless card, after `LineupChangeItem`, and it borrows that
 * card's opening for the same reason: every other item in the feed is a
 * player's ("Barry scored 18"), so dropping the avatar row and leading with a
 * label is what tells a reader at a glance that this is the site talking.
 *
 * The sessions line is the part that earns the card its place. A grid penalty
 * moves a race start and leaves the qualifying classification alone, so naming
 * the sessions it changes turns a headline into something a player can act on:
 * they know which of their two Top 5s to go back to. That is also why the field
 * is required when publishing — see `docs/race-news.md`.
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
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const sessions = (event.newsAffectsSessions ?? []) as SessionType[];
  // The item's own colour, from the driver it is about. Same 3px the badges
  // and `LineupChangeItem` use, so a run of news reads as a Williams story
  // then a Mercedes one rather than two grey blocks.
  const team = event.newsDrivers?.[0]?.team ?? null;
  const teamColour = (team && TEAM_COLORS[team]) || null;

  return (
    <div
      className={teamColour ? 'gpp-team-bar pl-3' : undefined}
      style={
        teamColour
          ? ({ '--team-colour': teamColour } as CSSProperties)
          : undefined
      }
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {grouped ? null : (
            <p className="flex items-center gap-1.5 text-xs font-semibold tracking-label text-accent uppercase">
              Weekend news
            </p>
          )}
          {/* Same badge the write-up cards carry, from the same published
              codes, so one news item does not look like two different things
              depending on where you meet it. */}
          {event.newsDrivers && event.newsDrivers.length > 0 ? (
            <p className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {event.newsDrivers.map((driver) => (
                <DriverBadge
                  key={driver.code}
                  code={driver.code}
                  team={driver.team}
                  displayName={driver.displayName}
                  number={driver.number}
                  nationality={driver.nationality}
                  size="sm"
                  prerenderTooltip={false}
                />
              ))}
            </p>
          ) : null}
          <p className="mt-1.5 text-sm font-semibold text-text">
            {event.newsHeadline}
            <span className="ml-1.5 text-xs font-normal whitespace-nowrap text-text-muted">
              · {formatRelativeTime(event.createdAt)}
            </span>
          </p>
        </div>
        <ReactionButton
          feedEventId={event._id}
          reactionCount={event.reactionCount}
          reactionCounts={event.reactionCounts}
          viewerReaction={event.viewerReaction}
          onCountClick={() => setReactionsOpen(true)}
          context="news"
        />
      </div>

      {event.newsBody ? (
        <p className="gpp-reading-copy mt-2 text-sm text-text-muted">
          {event.newsBody}
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5">
        {sessions.length > 0 ? (
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-text-muted">
            {/* "Revisit", not "Affects". A grid penalty does not change the
                qualifying classification, and a chip reading "Affects
                Qualifying" is exactly how a reader concludes that it does. */}
            <span className="tracking-label uppercase">Revisit</span>
            {sessions.map((session) => (
              <span
                key={session}
                className="gpp-mono rounded-sm bg-surface-elevated px-1.5 py-0.5 text-[11px] text-text"
              >
                {SESSION_LABELS[session]}
              </span>
            ))}
            {/* The chips say which picks to look at again. This says what they
                are scored against, which is the half that gets misread: a grid
                penalty moves a start, it does not rewrite a classification.
                Grouped, the block says it once at the bottom instead. */}
            {grouped ? null : (
              <Link
                to="/results-policy"
                hash="sessions-heading"
                className="underline decoration-border-strong underline-offset-4 hover:text-text"
              >
                How these are scored
              </Link>
            )}
          </p>
        ) : null}

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
      </div>

      {reactionsOpen && (
        <ReactionsModal
          feedEventId={event._id}
          onClose={() => setReactionsOpen(false)}
          context="news"
        />
      )}
    </div>
  );
}
