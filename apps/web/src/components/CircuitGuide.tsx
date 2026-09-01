import { getCircuitForRace } from '@grandprixpicks/shared/circuits';
import { Link } from '@tanstack/react-router';
import { ArrowRight } from 'lucide-react';

import type { CircuitGuide as CircuitGuideContent } from '@/lib/circuitGuides';
import { getCircuitGuide } from '@/lib/circuitGuides';
import { getRaceWriteup } from '@/lib/raceWriteups';

/** Prose fields in reading order. `character` is shown above as the intro. */
type ProseKey = Exclude<keyof CircuitGuideContent, 'traits' | 'character'>;

const SECTIONS: readonly { key: ProseKey; heading: string }[] = [
  { key: 'layout', heading: 'What the lap demands' },
  { key: 'racing', heading: 'How the racing unfolds' },
  { key: 'predicting', heading: 'Picking a Top 5 here' },
];

type CircuitGuideProps = {
  raceSlug: string;
  raceName: string;
};

/**
 * Circuit briefing rendered on every race page, server-side and independent of
 * auth. It is the page's substantive content before a weekend has run: without
 * it a future race is a schedule table and a "not yet open" line.
 *
 * This runs the guide in full. It is tempting to trim it because the circuit
 * page covers the same ground, but that trades content on pages that already
 * rank for content on pages with no authority yet, and these guides are the
 * thin-content fix that AdSense has still to re-review. The overlap is a
 * section of two substantial pages, not two near-identical pages, so it is the
 * newer circuit page that carries the redundancy risk: the answer there is to
 * give it more of its own material, not to take any away from here.
 */
export function CircuitGuide({ raceSlug, raceName }: CircuitGuideProps) {
  const guide = getCircuitGuide(raceSlug);
  if (!guide) {
    return null;
  }
  const circuit = getCircuitForRace(raceSlug);
  // From the registry, not a hardcoded slug. This read `raceSlug ===
  // 'italy-2026'` and had already fallen behind: the Madring write-up shipped
  // and this nav never learned about it.
  const writeup = getRaceWriteup(raceSlug);

  return (
    <section
      aria-labelledby="circuit-guide-heading"
      className="mt-10 border-t border-border pt-8"
    >
      {/*
        Muted, not accent. DESIGN.md gives the eyebrow the accent only when the
        section is a step in the picks flow; reference material is not, and on
        a scored race page this was one of the loudest chartreuse elements
        below the fold while the page's actual call to action had none.
      */}
      <p className="gpp-label">Circuit guide</p>
      {/*
        Headline role, matching "Session Results" above it. At `2xl`/600 this
        heading outweighed both of them and, before the race name was given
        its display role, it was the largest text on the page.
      */}
      <h2
        id="circuit-guide-heading"
        className="mt-2 text-2xl leading-tight font-normal tracking-tight text-text sm:text-3xl"
      >
        {circuit ? circuit.name : raceName}
      </h2>
      {circuit && (
        <p className="mt-1 text-sm text-text-muted">
          {circuit.locality}, {circuit.country}
        </p>
      )}

      <p className="gpp-reading-copy mt-4 max-w-3xl text-text-muted">
        {guide.character}
      </p>

      <dl className="mt-6 grid gap-px border border-border bg-border sm:grid-cols-3">
        {guide.traits.map((trait) => (
          <div key={trait.label} className="bg-surface px-4 py-3">
            <dt className="gpp-label">{trait.label}</dt>
            <dd className="gpp-mono mt-1 text-sm text-text">{trait.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-8 grid gap-8 md:grid-cols-3">
        {SECTIONS.map((section) => (
          <div key={section.key}>
            <h3 className="text-xl leading-tight font-medium tracking-tight text-text">
              {section.heading}
            </h3>
            <p className="gpp-reading-copy mt-2 text-text-muted">
              {guide[section.key]}
            </p>
          </div>
        ))}
      </div>

      {(writeup || circuit) && (
        <nav
          aria-label={`${raceName} guides`}
          className="mt-6 flex flex-col items-start gap-3 sm:flex-row sm:flex-wrap sm:gap-x-6"
        >
          {writeup && (
            <Link
              to={writeup.to}
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-accent underline decoration-accent/40 underline-offset-4 hover:text-accent-hover hover:decoration-current"
            >
              {writeup.cta}
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
          {circuit && (
            <Link
              to="/circuits/$circuitSlug"
              params={{ circuitSlug: circuit.slug }}
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-text-muted underline decoration-border-strong underline-offset-4 hover:text-text hover:decoration-current"
            >
              Explore {circuit.name} and its race history
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}
