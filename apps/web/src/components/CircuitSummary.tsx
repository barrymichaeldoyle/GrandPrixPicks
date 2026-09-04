import { getCircuitForRace } from '@grandprixpicks/shared/circuits';
import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import { getCircuitGuide } from '@/lib/circuitGuides';

/**
 * Compact circuit note for pages that are about a session rather than about
 * the venue.
 *
 * The practice page used to render the full `CircuitGuide`, which made it the
 * second complete copy of the same 200 words (the race page has the other).
 * A crawler comparing the two had little to tell them apart. This keeps the
 * orientation a reader wants here — where am I, what kind of track is this —
 * and sends anyone who wants the rest to the one page that owns it.
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
      <Link
        to="/circuits/$circuitSlug"
        params={{ circuitSlug: circuit.slug }}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-accent hover:text-accent-hover"
      >
        What the lap demands, and how it races
        <ArrowRight className="h-4 w-4" aria-hidden />
      </Link>
    </section>
  );
}
