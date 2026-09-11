/**
 * Score-band class for a pick cell, matching web's `PickSlot` sector colours.
 *
 * A miss is `racing-red`, not `error` (amber here) and not `result-miss`
 * (the louder red used as text). Same map as `apps/web` PickSlot.tsx.
 */
export function pickScoreBandClass(points?: number): string {
  if (points === undefined) {
    return 'bg-border';
  }
  if (points === 5) {
    return 'bg-result-exact';
  }
  if (points === 3) {
    return 'bg-result-near';
  }
  if (points === 1) {
    return 'bg-result-top5';
  }
  return 'bg-racing-red';
}
