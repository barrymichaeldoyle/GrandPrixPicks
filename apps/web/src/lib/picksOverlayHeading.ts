/**
 * The picks overlay's heading for each step.
 *
 * Declared once because the overlay is drawn before the picker exists: the
 * banner's loading shell shows it while the picker's code and data arrive, and
 * a shell headed with the race name that then became "Your Top 5" read as a
 * second dialog replacing the first.
 */
export function picksOverlayHeading(step: 'top5' | 'h2h') {
  return step === 'h2h'
    ? { title: 'Team-mate picks', subtitle: 'Step 2 of 2' }
    : {
        title: 'Your Top 5',
        subtitle: 'Step 1 of 2 · applies to every open session',
      };
}
