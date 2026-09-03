import { createPortal } from 'react-dom';

import { Button } from './Button/Button';

function StartOverIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

export function DraftRestoredNotice({
  target,
  onDiscard,
}: {
  target?: HTMLElement | null;
  onDiscard: () => void;
}) {
  if (target) {
    return createPortal(
      // One quiet row, not a stacked outlined box. This is housekeeping for a
      // returning visitor, and as a bordered danger button in the top-right
      // corner it out-shouted the picks it refers to and the primary action at
      // the foot of the card. Same treatment as the card's other inline
      // affordance ("Edit"), so the two read as a pair.
      <div
        className="flex h-0 items-center justify-end gap-2 text-xs text-text-muted"
        data-testid="draft-restored-notice"
      >
        <span>We kept your last picks</span>
        <Button
          variant="text"
          size="inline"
          aria-label="Start over with empty picks"
          onClick={onDiscard}
        >
          <StartOverIcon />
          Start over
        </Button>
      </div>,
      target,
    );
  }

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface px-3 py-2"
      data-testid="draft-restored-notice"
    >
      <span className="text-xs text-text-muted">
        We kept the picks you hadn't saved yet
      </span>
      <Button
        variant="danger"
        size="sm"
        aria-label="Start over with empty picks"
        onClick={onDiscard}
      >
        Start over
      </Button>
    </div>
  );
}
