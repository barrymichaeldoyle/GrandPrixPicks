import { ArrowRight } from 'lucide-react';
import { useState } from 'react';

import { displayTeamName } from '@/lib/display';
import { FALLBACK_TEAM_COLOR, TEAM_COLORS } from '@/lib/teamColors';

import { ReactionButton } from '../ReactionButton';
import { formatRelativeTime } from './helpers';
import { ReactionsModal } from './ReactionsModal';
import type { FeedEvent } from './types';

/**
 * A mid-season driver swap, announced to everyone.
 *
 * The one feed item with no author. Every other event is a player's ("Barry
 * scored 18"), so the card deliberately drops the avatar-and-name row that
 * opens the others and leads with a label instead: a reader should be able to
 * tell at a glance that the site is talking, not somebody they follow.
 *
 * It is framed as seats changing hands rather than drivers moving because that
 * is what it does to a player's game. A duel pick backs one side of a garage,
 * so when the person in that seat changes the pick moves with them, and the
 * card says which seat so the reader can find their own picks in it.
 */
export function LineupChangeItem({ event }: { event: FeedEvent }) {
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const moves = event.seatMoves ?? [];

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-label text-accent uppercase">
            Grid change
          </p>
          <p className="mt-1 text-sm font-semibold text-text">
            {event.raceName
              ? `New line-up from the ${event.raceName}`
              : 'The line-up has changed'}
            <span className="ml-1.5 text-xs font-normal whitespace-nowrap text-text-muted/60">
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
        />
      </div>

      <ul className="mt-3 space-y-px">
        {moves.map((move) => {
          const teamColor = TEAM_COLORS[move.team] ?? FALLBACK_TEAM_COLOR;
          return (
            <li
              key={`${move.team}-${move.inDriverCode}`}
              className="flex items-center gap-2.5 bg-surface-elevated/40 py-2 pr-2 pl-0"
            >
              {/* The team's colour, 3px, as the only decoration on the row. It
                  is how a reader finds the garage they care about before
                  reading a word of it. */}
              <span
                className="h-8 w-[3px] shrink-0"
                style={{ backgroundColor: teamColor }}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-text-muted">
                  {displayTeamName(move.team)}
                </p>
                <p className="flex flex-wrap items-center gap-1.5 text-sm text-text">
                  {move.outDriverName ? (
                    <>
                      {/* Struck through rather than labelled "out": the row is
                          already read left to right as a handover, and a word
                          for it would just be a third thing to read. */}
                      <span className="text-text-muted line-through decoration-text-muted/50">
                        {move.outDriverName}
                      </span>
                      <ArrowRight
                        className="h-3.5 w-3.5 shrink-0 text-text-muted/60"
                        aria-hidden="true"
                      />
                    </>
                  ) : null}
                  <span className="font-semibold">{move.inDriverName}</span>
                </p>
              </div>
            </li>
          );
        })}
      </ul>

      {event.lineupNote ? (
        <p className="gpp-reading-copy mt-3 text-sm text-text-muted">
          {event.lineupNote}
        </p>
      ) : null}

      {reactionsOpen && (
        <ReactionsModal
          feedEventId={event._id}
          onClose={() => setReactionsOpen(false)}
        />
      )}
    </>
  );
}
