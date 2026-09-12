import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { useQuery } from '@/integrations/convex/query';
import { BarChart3, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/Button/Button';
import { Flag } from '@/components/Flag';
import {
  PracticeResultsPanel,
  resultsSheetHeading,
} from '@/components/PracticeResultsCard';
import { useModalDialog } from '@/hooks/useModalDialog';
import { captureAnalyticsEvent } from '@/lib/analytics';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import type { SessionType } from '@/lib/sessions';

type CompetitiveSessionType = 'sprint_quali' | 'sprint' | 'quali';

export function getVisibleCompetitiveSessions(
  predictionSession: SessionType,
  hasSprint: boolean,
): CompetitiveSessionType[] {
  if (!hasSprint) {
    return predictionSession === 'race' ? ['quali'] : [];
  }
  if (predictionSession === 'sprint') {
    return ['sprint_quali'];
  }
  if (predictionSession === 'quali') {
    return ['sprint_quali', 'sprint'];
  }
  if (predictionSession === 'race') {
    return ['sprint_quali', 'sprint', 'quali'];
  }
  return [];
}

export function PracticeResultsModal({
  open,
  onClose,
  raceId,
  raceSlug,
  raceName,
  predictionSession,
  hasSprint,
}: {
  open: boolean;
  onClose: () => void;
  raceId: Id<'races'>;
  raceSlug: string;
  raceName?: string;
  predictionSession: SessionType;
  hasSprint: boolean;
}) {
  const titleId = useId();
  const raceLabelId = `${titleId}-race`;
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useModalDialog<HTMLDivElement>({
    open,
    onClose,
    initialFocusRef: closeButtonRef,
  });
  const results = useQuery(
    api.practiceResults.getPracticeResultsForRace,
    open ? { raceId } : 'skip',
  );
  const visibleCompetitiveSessions = getVisibleCompetitiveSessions(
    predictionSession,
    hasSprint,
  );
  const includeSprintQualifying =
    visibleCompetitiveSessions.includes('sprint_quali');
  const includeSprint = visibleCompetitiveSessions.includes('sprint');
  const includeQualifying = visibleCompetitiveSessions.includes('quali');
  const sprintQualifyingResult = useQuery(
    api.results.getResultForRace,
    open && includeSprintQualifying
      ? { raceId, sessionType: 'sprint_quali' }
      : 'skip',
  );
  const sprintResult = useQuery(
    api.results.getResultForRace,
    open && includeSprint ? { raceId, sessionType: 'sprint' } : 'skip',
  );
  const qualifyingResult = useQuery(
    api.results.getResultForRace,
    open && includeQualifying ? { raceId, sessionType: 'quali' } : 'skip',
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    captureAnalyticsEvent('session_results_modal_opened', {
      race_id: raceId,
      race_slug: raceSlug,
      prediction_session: predictionSession,
      has_sprint: hasSprint,
    });
  }, [hasSprint, open, predictionSession, raceId, raceSlug]);

  const [heading, setHeading] = useState('Session results');
  const countryCode = getCountryCodeForRace({ slug: raceSlug });

  if (!open) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-3"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={raceName ? `${raceLabelId} ${titleId}` : titleId}
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-surface"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            {raceName ? (
              <p id={raceLabelId} className="flex items-center gap-1.5">
                {countryCode ? <Flag code={countryCode} size="xs" /> : null}
                <span className="gpp-mono text-xs text-text-muted">
                  {raceName}
                </span>
              </p>
            ) : null}
            <h2
              id={titleId}
              className={`font-title text-lg font-medium text-text ${raceName ? 'mt-0.5' : ''}`}
            >
              {heading}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded p-1 text-text-muted hover:text-text"
            aria-label="Close practice results"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto">
          {results === undefined ||
          (includeSprintQualifying && sprintQualifyingResult === undefined) ||
          (includeSprint && sprintResult === undefined) ||
          (includeQualifying && qualifyingResult === undefined) ? (
            <p className="px-4 py-10 text-center text-sm text-text-muted">
              Loading practice results…
            </p>
          ) : (
            <PracticeResultsPanel
              results={results}
              layout="compact"
              onSessionChange={(session) =>
                setHeading(resultsSheetHeading(session))
              }
              competitiveResults={{
                sprint_quali: sprintQualifyingResult ?? undefined,
                sprint: sprintResult ?? undefined,
                quali: qualifyingResult ?? undefined,
              }}
            />
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function PracticeResultsButton({
  onClick,
  raceId,
}: {
  onClick: () => void;
  raceId: Id<'races'>;
}) {
  const results = useQuery(api.practiceResults.getPracticeResultsForRace, {
    raceId,
  });
  const hasResults = (results?.length ?? 0) > 0;

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      leftIcon={BarChart3}
      onClick={onClick}
      onPointerUp={() =>
        captureAnalyticsEvent('session_results_button_pressed', {
          race_id: raceId,
        })
      }
      disabled={!hasResults}
    >
      {results === undefined
        ? 'Checking Results…'
        : hasResults
          ? 'View Session Results'
          : 'Results Pending'}
    </Button>
  );
}
