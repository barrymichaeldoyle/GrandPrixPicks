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
      className="fixed inset-0 z-[70] flex items-stretch justify-center bg-surface md:items-center md:bg-black/60 md:p-3"
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
        className="flex h-dvh w-full flex-col overflow-hidden bg-surface md:h-auto md:max-h-[88dvh] md:max-w-3xl md:rounded-lg md:border md:border-border"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 pt-[max(0.75rem,env(safe-area-inset-top,0px))] pb-3 md:pt-3">
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
        <div className="min-h-0 overflow-y-auto pb-[env(safe-area-inset-bottom,0px)] md:pb-0">
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
