import { X } from 'lucide-react';
import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';

import { PracticeResultsPanel } from '@/components/PracticeResultsCard';
import { useModalDialog } from '@/hooks/useModalDialog';
import type {
  PracticeResults,
  PracticeSessionType,
} from '@/lib/practiceSessions';

export function PracticeClassificationDialog({
  open,
  onClose,
  results,
  initialSession,
}: {
  open: boolean;
  onClose: () => void;
  results: PracticeResults;
  initialSession?: PracticeSessionType;
}) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useModalDialog<HTMLDivElement>({
    open,
    onClose,
    initialFocusRef: closeRef,
  });
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
        aria-labelledby={titleId}
        className="flex max-h-[88dvh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-border bg-surface"
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 id={titleId} className="text-lg font-semibold text-text">
            Practice results
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close practice results"
            className="gpp-touch-target flex min-h-11 min-w-11 items-center justify-center rounded text-text-muted hover:text-text"
          >
            <X size={20} aria-hidden />
          </button>
        </div>
        <div className="min-h-0 overflow-y-auto">
          <PracticeResultsPanel
            key={initialSession}
            results={results}
            initialSession={initialSession}
          />
        </div>
      </div>
    </div>,
    document.body,
  );
}
