import { ExternalLink } from 'lucide-react';
import { useState } from 'react';

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
export function RaceNewsItem({ event }: { event: FeedEvent }) {
  const [reactionsOpen, setReactionsOpen] = useState(false);
  const sessions = (event.newsAffectsSessions ?? []) as SessionType[];

  return (
    <>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-xs font-semibold tracking-label text-accent uppercase">
            Weekend news
          </p>
          <p className="mt-1 text-sm font-semibold text-text">
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
            <span className="tracking-label uppercase">Affects</span>
            {sessions.map((session) => (
              <span
                key={session}
                className="gpp-mono rounded-sm bg-surface-elevated px-1.5 py-0.5 text-[11px] text-text"
              >
                {SESSION_LABELS[session]}
              </span>
            ))}
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
        />
      )}
    </>
  );
}
