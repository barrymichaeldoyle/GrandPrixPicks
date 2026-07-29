import { api } from '@convex-generated/api';
import type { Id } from '@convex-generated/dataModel';
import { Link } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { BarChart3, ExternalLink, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

import { Button } from '@/components/Button/Button';
import { PracticeResultsPanel } from '@/components/PracticeResultsCard';
import { captureAnalyticsEvent } from '@/lib/analytics';
import type { SessionType } from '@/lib/sessions';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

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
  predictionSession,
  hasSprint,
}: {
  open: boolean;
  onClose: () => void;
  raceId: Id<'races'>;
  raceSlug: string;
  predictionSession: SessionType;
  hasSprint: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
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
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    captureAnalyticsEvent('session_results_modal_opened', {
      race_id: raceId,
      race_slug: raceSlug,
      prediction_session: predictionSession,
      has_sprint: hasSprint,
    });
    closeButtonRef.current?.focus();
    return () => {
      returnFocusRef.current?.focus();
    };
  }, [hasSprint, open, predictionSession, raceId, raceSlug]);

  useEffect(() => {
    if (!open) {
      return;
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
        ).filter((element) => element.offsetParent !== null);
        if (focusable.length === 0) {
          return;
        }
        const currentIndex = focusable.indexOf(
          document.activeElement as HTMLElement,
        );
        if (event.shiftKey && currentIndex <= 0) {
          event.preventDefault();
          focusable.at(-1)?.focus();
        } else if (!event.shiftKey && currentIndex === focusable.length - 1) {
          event.preventDefault();
          focusable[0]?.focus();
        }
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [onClose, open]);

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
        aria-labelledby="practice-results-title"
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-surface"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <p className="text-xs font-semibold tracking-label text-text-muted uppercase">
              Form guide
            </p>
            <h2
              id="practice-results-title"
              className="text-lg font-semibold text-text"
            >
              Session Results
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
              competitiveResults={{
                sprint_quali: sprintQualifyingResult ?? undefined,
                sprint: sprintResult ?? undefined,
                quali: qualifyingResult ?? undefined,
              }}
            />
          )}
        </div>
        <div className="border-t border-border px-4 py-3 text-right">
          <Link
            to="/races/$raceSlug/practice"
            params={{ raceSlug }}
            onClick={onClose}
            className="inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-accent-hover"
          >
            Open full results page
            <ExternalLink className="h-3 w-3" />
          </Link>
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
