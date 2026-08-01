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
        className="flex flex-col items-end gap-1 text-xs text-text-muted"
        data-testid="draft-restored-notice"
      >
        <span>We kept your last picks</span>
        <Button
          variant="danger"
          size="inline"
          aria-label="Start over with empty picks"
          onClick={onDiscard}
        >
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
