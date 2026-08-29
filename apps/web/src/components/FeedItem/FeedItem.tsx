import type { FeedEvent } from './types';
import { LineupChangeItem } from './LineupChangeItem';
import { RaceNewsItem } from './RaceNewsItem';
import { JoinedLeagueItem, ScorePublishedItem } from './ScorePublishedItem';

export function FeedItem({
  event,
  grouped,
  position,
}: {
  event: FeedEvent;
  grouped?: boolean;
  position?: 'first' | 'middle' | 'last';
}) {
  // Defensive fallback for stale cached responses from before streak events
  // were removed at the query boundary.
  if (event.type === 'streak_milestone') {
    return null;
  }

  const isSocialActivity = event.type === 'joined_league';
  const radiusClass =
    position === 'first'
      ? 'rounded-t-none'
      : position === 'middle'
        ? 'rounded-none'
        : position === 'last'
          ? 'rounded-b-sm rounded-t-none'
          : 'rounded-sm';

  const borderClass =
    position === 'first' || position === 'middle' || position === 'last'
      ? 'border-t-0'
      : '';

  return (
    <div
      className={
        isSocialActivity
          ? 'px-1 py-2.5'
          : // A grouped news card sits inside NewsGroup's own bordered block,
            // so it must not draw a second border inside it.
            grouped && event.type === 'race_news'
            ? ''
            : event.type === 'race_news'
              ? // No padding either way: the news card draws a team bar down
                // its own left edge, and padding out here would inset the bar
                // from the card's edge and stop it running the full height.
                `border border-border/80 bg-surface ${radiusClass} ${borderClass}`
              : `border border-border/80 bg-surface p-2.5 ${radiusClass} ${borderClass}`
      }
    >
      {event.type === 'lineup_change' ? (
        <LineupChangeItem event={event} />
      ) : event.type === 'race_news' ? (
        <RaceNewsItem event={event} grouped={grouped} />
      ) : event.type === 'score_published' ||
        event.type === 'results_amended' ||
        event.type === 'session_locked' ? (
        <ScorePublishedItem event={event} grouped={grouped} />
      ) : (
        <JoinedLeagueItem event={event} />
      )}
    </div>
  );
}
