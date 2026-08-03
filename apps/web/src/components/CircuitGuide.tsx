import type { CircuitGuide as CircuitGuideContent } from '@/lib/circuitGuides';
import { getCircuitGuide } from '@/lib/circuitGuides';
import { getRaceLocation } from '@/lib/raceLocations';

type CircuitGuideProps = {
  raceSlug: string;
  raceName: string;
};

/** Prose fields, in reading order. Excludes `character` (shown as the intro). */
type ProseKey = Exclude<keyof CircuitGuideContent, 'traits' | 'character'>;

const SECTIONS: ReadonlyArray<{ key: ProseKey; heading: string }> = [
  { key: 'layout', heading: 'What the lap demands' },
  { key: 'racing', heading: 'How the racing unfolds' },
  { key: 'predicting', heading: 'Picking a Top 5 here' },
];

/**
 * Circuit briefing rendered on every race page, server-side and independent of
 * auth. It is the page's substantive content before a weekend has run: without
 * it a future race is a schedule table and a "not yet open" line.
 */
export function CircuitGuide({ raceSlug, raceName }: CircuitGuideProps) {
  const guide = getCircuitGuide(raceSlug);
  if (!guide) {
    return null;
  }
  const location = getRaceLocation(raceSlug);

  return (
    <section
      aria-labelledby="circuit-guide-heading"
      className="mt-10 border-t border-border pt-8"
    >
      <p className="text-xs font-semibold tracking-label text-accent uppercase">
        Circuit guide
      </p>
      <h2
        id="circuit-guide-heading"
        className="font-title mt-1 text-2xl font-semibold text-text"
      >
        {location ? location.circuit : raceName}
      </h2>
      {location && (
        <p className="mt-1 text-sm text-text-muted">
          {location.locality}, {location.country}
        </p>
      )}

      <p className="gpp-reading-copy mt-4 max-w-3xl text-text-muted">
        {guide.character}
      </p>

      <dl className="mt-6 grid gap-px border border-border bg-border sm:grid-cols-3">
        {guide.traits.map((trait) => (
          <div key={trait.label} className="bg-surface px-4 py-3">
            <dt className="text-xs font-semibold tracking-label text-text-muted uppercase">
              {trait.label}
            </dt>
            <dd className="mt-1 text-sm font-semibold text-text">
              {trait.value}
            </dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 grid gap-8 md:grid-cols-3">
        {SECTIONS.map((section) => (
          <div key={section.key}>
            <h3 className="font-title text-base font-semibold text-text">
              {section.heading}
            </h3>
            <p className="gpp-reading-copy mt-2 text-text-muted">
              {guide[section.key]}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
