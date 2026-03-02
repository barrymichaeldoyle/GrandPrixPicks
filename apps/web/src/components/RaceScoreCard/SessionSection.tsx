import { Lock } from 'lucide-react';

import type { SessionType } from '../../lib/sessions';
import { SESSION_LABELS } from '../../lib/sessions';
import { Badge } from '../Badge';
import { Tooltip } from '../Tooltip';
import { SessionPicksGrid } from './SessionPicksGrid';
import { SessionResultsTable } from './SessionResultsTable';
import type { SessionCardData } from './types';

interface SessionSectionProps {
  sessionType: SessionType;
  sessionData: SessionCardData;
  variant: 'full' | 'compact';
  onEditSession?: (session: SessionType) => void;
}

export function SessionSection({
  sessionType,
  sessionData,
  variant,
  onEditSession,
}: SessionSectionProps) {
  // Hidden session (visitor before lock)
  if (sessionData.isHidden) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-surface-muted/40 px-3 py-2.5">
        <span className="text-sm font-medium text-text-muted">
          {SESSION_LABELS[sessionType]}
        </span>
        <span className="text-text-muted/30">&middot;</span>
        <Lock className="h-3 w-3 text-text-muted/40" />
        <span className="text-xs text-text-muted/60">Hidden until lock</span>
      </div>
    );
  }

  const showEditButton =
    !sessionData.isLocked && !sessionData.hasResults && onEditSession;
  const showResultsTable =
    variant === 'full' &&
    sessionData.fullClassification &&
    sessionData.hasResults;
  const showSessionHeader = variant === 'compact';

  return (
    <div>
      {showSessionHeader && (
        <div className="mb-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text">
              {SESSION_LABELS[sessionType]}
            </span>
            {sessionData.isLocked && !sessionData.hasResults && (
              <Tooltip content="This session has started — predictions can't be changed">
                <span className="shrink-0">
                  <Badge variant="locked" />
                </span>
              </Tooltip>
            )}
            {showEditButton && (
              <button
                type="button"
                onClick={() => onEditSession(sessionType)}
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium text-accent transition-colors hover:bg-accent-muted/50"
                title={`Edit ${SESSION_LABELS[sessionType]}`}
              >
                <span className="hidden sm:inline">Edit</span>
              </button>
            )}
          </div>
          {sessionData.points != null && (
            <span className="text-sm font-bold text-accent">
              {sessionData.points} pts
            </span>
          )}
        </div>
      )}

      {/* Picks grid */}
      {sessionData.picks.length > 0 && (
        <SessionPicksGrid
          picks={sessionData.picks}
          breakdown={sessionData.breakdown}
          compact={variant === 'compact'}
        />
      )}

      {/* No picks message */}
      {sessionData.picks.length === 0 && (
        <p className="text-sm text-text-muted">No prediction submitted</p>
      )}

      {/* Full results table (full variant only) */}
      {showResultsTable && (
        <div className="mt-3">
          <SessionResultsTable
            classification={sessionData.fullClassification!}
            breakdown={sessionData.breakdown}
          />
        </div>
      )}
    </div>
  );
}
