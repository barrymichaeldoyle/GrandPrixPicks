import { X } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { Flag } from '@/components/Flag';
import { PracticeResultsPanel } from '@/components/PracticeResultsCard';
import { useModalDialog } from '@/hooks/useModalDialog';
import { getCountryCodeForRace } from '@/lib/raceCountries';
import {
  practiceResultsHeading,
  type PracticeResults,
  type PracticeSessionType,
} from '@/lib/practiceSessions';

export function PracticeClassificationDialog({
  open,
  onClose,
  results,
  initialSession,
  raceName,
  raceSlug,
}: {
  open: boolean;
  onClose: () => void;
  results: PracticeResults;
  initialSession?: PracticeSessionType;
  raceName?: string;
  raceSlug?: string;
}) {
  const titleId = useId();
  const raceLabelId = `${titleId}-race`;
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useModalDialog<HTMLDivElement>({
    open,
    onClose,
    initialFocusRef: closeRef,
  });
  const [session, setSession] = useState<PracticeSessionType>(
    initialSession ?? 'fp1',
  );
  const heading = practiceResultsHeading(session);
  const countryCode = raceSlug
    ? getCountryCodeForRace({ slug: raceSlug })
    : null;
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
        className="flex max-h-[88dvh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border border-border bg-surface"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            {raceName ? (
              <p id={raceLabelId} className="flex items-center gap-1.5">
                {countryCode ? <Flag code={countryCode} size="xs" /> : null}
                <span className="gpp-mono text-[11px] text-text-muted">
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
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close practice results"
            className="gpp-touch-target flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded text-text-muted hover:text-text"
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto">
          <PracticeResultsPanel
            key={initialSession}
            results={results}
            initialSession={initialSession}
            layout="compact"
            onSessionChange={(next) => {
              if (next === 'fp1' || next === 'fp2' || next === 'fp3') {
                setSession(next);
              }
            }}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
