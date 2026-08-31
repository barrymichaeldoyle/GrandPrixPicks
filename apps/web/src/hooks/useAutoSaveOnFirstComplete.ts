import { useEffect, useEffectEvent, useRef } from 'react';

/**
 * Keeps a completed picks form saved, without making the user hunt for a
 * button.
 *
 * The first save fires the moment the set is completed, on the same beat as
 * the celebration, so "I finished" and "it is saved" are one event. Later
 * edits are debounced instead, because a player reordering their Top 5 would
 * otherwise write once per tap.
 *
 * Firing immediately on completion is the point, not a tuning choice. That
 * first save used to sit behind a 2.5s timer while the UI offered a "Continue"
 * button the instant the set completed. Tapping it unmounted the form,
 * cancelled the pending timer, and the picks were never written; the next step
 * then failed against a backend with no Top 5 to attach them to. A save the
 * user can outrun is not a save.
 *
 * `dirty` is what keeps this cheap. It is false whenever the picks already
 * match what the server has, so remounts, re-renders and edits that land back
 * on the saved set cost nothing.
 */
export function useAutoSaveOnFirstComplete({
  enabled,
  complete,
  dirty = true,
  picksSignature,
  delayMs,
  subsequentDelayMs,
  save,
}: {
  /** False when submitting, blocked, or pre-hydration. */
  enabled: boolean;
  /** True when the picks set is complete and valid to submit. */
  complete: boolean;
  /**
   * True when the picks differ from what is saved. Guards every write, so an
   * identical payload is never re-submitted.
   */
  dirty?: boolean;
  /** Changes whenever the picks change — resets the pending timer. */
  picksSignature: string;
  /** Delay for the first save of a set. Zero means "on completion". */
  delayMs: number;
  /** Delay for saves after the first, so a burst of edits writes once. */
  subsequentDelayMs?: number;
  save: () => void;
}) {
  const firedRef = useRef(false);
  const interactedRef = useRef(false);
  const saveLatest = useEffectEvent(save);

  useEffect(() => {
    if (!enabled || !complete || !dirty || !interactedRef.current) {
      return;
    }

    // Only the first save of a set is immediate. Once something is on the
    // server there is no race left to lose, so later edits wait for the player
    // to stop moving.
    const wait = firedRef.current ? (subsequentDelayMs ?? delayMs) : delayMs;
    const timer = setTimeout(() => {
      firedRef.current = true;
      saveLatest();
    }, wait);
    return () => clearTimeout(timer);
  }, [enabled, complete, dirty, delayMs, subsequentDelayMs, picksSignature]);

  /** Call from user pick handlers so a restored draft alone never auto-saves. */
  function markInteraction() {
    interactedRef.current = true;
  }

  return { markInteraction };
}
