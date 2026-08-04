import { Check, TriangleAlert } from 'lucide-react';

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
