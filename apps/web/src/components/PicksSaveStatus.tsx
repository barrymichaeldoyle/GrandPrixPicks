import { Check, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';

import { Button } from './Button/Button';
import type { SaveState } from './PredictionForm';

const COPY: Record<SaveState, string> = {
  unsaved: 'Saving your changes',
  saving: 'Saving',
  saved: 'Saved',
  error: 'Not saved. Try again',
};

/**
 * The receipt for an auto-saving picks form.
 *
 * Auto-save is the right behaviour here (a session can lock while you are still
 * deciding, so a change you made must never depend on you finding a button),
 * but a silent write leaves the exit button ambiguous: with nothing on screen
 * saying the picks are safe, "Done" reads as "discard". This is the line that
 * makes leaving obviously free.
 *
 * `unsaved` and `saving` share a tone deliberately. From the player's side they
 * are one state, "in flight", and the distinction between a debounce timer and
 * an open request is ours, not theirs.
 */
export function PicksSaveStatus({ state }: { state: SaveState }) {
  const settled = state === 'saved';
  const failed = state === 'error';

  return (
    <p
      // Polite, not assertive: this narrates a background write, and a player
      // still reordering their picks should not be interrupted by it.
      aria-live="polite"
      data-testid="picks-save-status"
      className={`flex items-center gap-1.5 text-sm ${
        failed ? 'text-error' : 'text-text-muted'
      }`}
    >
      {settled ? (
        <Check size={16} className="shrink-0 text-accent" aria-hidden />
      ) : failed ? (
        <TriangleAlert size={16} className="shrink-0" aria-hidden />
      ) : null}
      {COPY[state]}
    </p>
  );
}

/**
 * The row under a Top 5 form: the next action, and the auto-save receipt.
 *
 * Completing the set used to mount this row from nothing, which shoved the
 * picker (and, in an overlay, the dialog itself) the moment the fifth driver
 * landed. The row is always in the layout; the button stays disabled until
 * the set is valid, and the receipt occupies its slot before it has anything
 * to say.
 */
export function PicksFormActionRow({
  complete,
  saveState,
  primaryLabel,
  onPrimary,
  primaryTestId,
  showSaveStatus = true,
  children,
}: {
  complete: boolean;
  saveState: SaveState;
  primaryLabel?: string;
  onPrimary?: () => void | Promise<void>;
  primaryTestId?: string;
  /**
   * Signed-out funnels still have to ask the player to submit; they are not
   * auto-saving, so the receipt would lie.
   */
  showSaveStatus?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className="mt-3 flex min-h-11 flex-wrap items-center gap-x-4 gap-y-2"
      data-testid="top5-handoff"
    >
      {children ??
        (primaryLabel ? (
          <Button
            variant="primary"
            size="md"
            className="w-full sm:w-auto"
            disabled={!complete}
            onClick={() => void onPrimary?.()}
            data-testid={primaryTestId}
          >
            {primaryLabel}
          </Button>
        ) : null)}
      {showSaveStatus ? (
        <div
          className={`min-h-5 ${complete ? '' : 'invisible'}`}
          aria-hidden={!complete}
        >
          <PicksSaveStatus state={complete ? saveState : 'saved'} />
        </div>
      ) : null}
    </div>
  );
}
