import { getCircuitForRace } from '@grandprixpicks/shared/circuits';

import { getCircuitGuide } from '@/lib/circuitGuides';

/**
 * Compact circuit note for pages that are about a session rather than about
 * the venue.
 *
 * The practice page used to render the full `CircuitGuide`, which made it the
 * second complete copy of the same 200 words (the race page has the other).
 * A crawler comparing the two had little to tell them apart. This keeps the
 * orientation a reader wants here — where am I, what kind of track is this —
 * and nothing more. It used to end on a link to the circuit page; that page is
 * gone, and the practice page already links to the race this session belongs
 * to, which is where the rest of the venue writing lives.
 */
export function CircuitSummary({ raceSlug }: { raceSlug: string }) {
  const circuit = getCircuitForRace(raceSlug);
  const guide = getCircuitGuide(raceSlug);
  if (!circuit || !guide) {
    return null;
  }

  return (
    <section
      aria-labelledby="circuit-summary-heading"
      className="mt-10 border-t border-border pt-8"
    >
      <h2
        id="circuit-summary-heading"
        className="font-title text-xl font-semibold text-text"
      >
        {circuit.name}
      </h2>
      <p className="mt-1 text-sm text-text-muted">
        {circuit.locality}, {circuit.country}
      </p>
      <p className="gpp-reading-copy mt-4 max-w-3xl text-text-muted">
        {guide.character}
      </p>
    </section>
  );
}
