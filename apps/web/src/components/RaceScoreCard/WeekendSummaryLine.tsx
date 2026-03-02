import type { SessionType } from '../../lib/sessions';
import type { CardDisplayState } from './state';
import { getWeekendSummary } from './state';
import type { WeekendCardData } from './types';

interface WeekendSummaryLineProps {
  data: WeekendCardData;
  sessions: ReadonlyArray<SessionType>;
  cardState: CardDisplayState;
}

export function WeekendSummaryLine({
  data,
  sessions,
  cardState,
}: WeekendSummaryLineProps) {
  if (
    cardState === 'open_has_picks' ||
    cardState === 'open_no_picks_auth' ||
    cardState === 'open_no_picks_unauth'
  ) {
    return <span className="text-xs text-text-muted">Awaiting race</span>;
  }

  if (cardState === 'hidden_upcoming' || cardState === 'not_yet_open') {
    return null;
  }

  if (cardState === 'fully_locked') {
    return <span className="text-xs text-text-muted">Awaiting results</span>;
  }

  const { exact, close, inTop5, miss, hasScoredSessions } = getWeekendSummary(
    data,
    sessions,
  );

  if (!hasScoredSessions) {
    return <span className="text-xs text-text-muted">Awaiting results</span>;
  }

  const scoredCount = sessions.filter(
    (s) => data.sessions[s]?.points != null,
  ).length;
  const isPartial =
    cardState === 'partially_scored' || cardState === 'partially_locked';

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
      {exact > 0 && (
        <span className="flex items-center gap-1 text-xs text-text-muted">
          <span className="inline-block h-2 w-2 rounded-full bg-success" />
          {exact} exact
        </span>
      )}
      {close > 0 && (
        <span className="flex items-center gap-1 text-xs text-text-muted">
          <span className="inline-block h-2 w-2 rounded-full bg-warning" />
          {close} close
        </span>
      )}
      {inTop5 > 0 && (
        <span className="flex items-center gap-1 text-xs text-text-muted">
          <span className="inline-block h-2 w-2 rounded-full bg-text-muted/40" />
          {inTop5} in top 5
        </span>
      )}
      {miss > 0 && (
        <span className="flex items-center gap-1 text-xs text-text-muted">
          <span className="inline-block h-2 w-2 rounded-full bg-error/40" />
          {miss} miss
        </span>
      )}
      {isPartial && (
        <span className="text-xs text-text-muted/60">
          &middot; {scoredCount} of {sessions.length} sessions
        </span>
      )}
    </div>
  );
}
