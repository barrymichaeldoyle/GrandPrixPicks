import { createPortal } from 'react-dom';

import { Button } from './Button/Button';

export function DraftRestoredNotice({
  target,
  onDiscard,
}: {
  target?: HTMLElement | null;
  onDiscard: () => void;
}) {
  if (target) {
    return createPortal(
      <div
        className="ml-auto flex items-center gap-3 text-xs text-text-muted"
        data-testid="draft-restored-notice"
      >
        <span>Draft restored</span>
        <Button
          variant="danger"
          size="sm"
          aria-label="Discard restored draft"
          onClick={onDiscard}
        >
          Discard
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
      <span className="text-xs text-text-muted">Unsaved draft restored</span>
      <Button variant="danger" size="sm" onClick={onDiscard}>
        Discard draft
      </Button>
    </div>
  );
}
