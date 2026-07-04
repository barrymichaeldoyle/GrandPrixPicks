import { useEffect, useRef } from 'react';

/**
 * Auto-saves a picks form once, shortly after the user first completes it
 * (fills the 5th Top 5 slot / picks the last H2H matchup). Only applies to
 * first-time entries — edits to already-saved picks keep the explicit Save
 * button so users can experiment and discard.
 *
 * The delay gives the user room to keep adjusting: any picks change re-arms
 * the timer via the `picksSignature` dependency. Fires at most once per
 * mount; if the save fails, the user falls back to the manual button.
 */
export function useAutoSaveOnFirstComplete({
  enabled,
  complete,
  picksSignature,
  delayMs,
  save,
}: {
  /** False when editing existing picks, submitting, blocked, or pre-hydration. */
  enabled: boolean;
  /** True when the picks set is complete and valid to submit. */
  complete: boolean;
  /** Changes whenever the picks change — resets the pending timer. */
  picksSignature: string;
  delayMs: number;
  save: () => void;
}) {
  const firedRef = useRef(false);
  const interactedRef = useRef(false);
  const saveRef = useRef(save);
  saveRef.current = save;

  useEffect(() => {
    if (!enabled || !complete || firedRef.current || !interactedRef.current) {
      return;
    }
    const timer = setTimeout(() => {
      firedRef.current = true;
      saveRef.current();
    }, delayMs);
    return () => clearTimeout(timer);
  }, [enabled, complete, delayMs, picksSignature]);

  /** Call from user pick handlers so a restored draft alone never auto-saves. */
  function markInteraction() {
    interactedRef.current = true;
  }

  return { markInteraction };
}
