import { describe, expect, it } from 'vitest';

import { getCircuit } from '@grandprixpicks/shared/circuits';

import { listCircuitGuideSlugs, getCircuitGuideBySlug } from './circuitGuides';
import { CIRCUIT_SEO_FACT_SLUGS, getCircuitSeoFacts } from './circuitSeoFacts';

/**
 * `circuitSeoFacts.ts` duplicates a handful of values out of `circuitGuides.ts`
 * so that `head()` can name them without pulling 28 kB of prose into the client
 * entry. Duplication is the point; drift is the risk. These tests are what stop
 * a guide being reworded while the snippet keeps quoting the old judgement.
 */
/**
 * The snippet strings are lowercase and sometimes lightly reworded for
 * mid-sentence use ("low (unless it rains)" reads badly after a comma), so the
 * comparison is on the first word rather than an exact match.
 */
function firstWord(value: string | undefined) {
  return value?.toLowerCase().split(/[\s(,-]/)[0];
}

describe('circuit SEO facts', () => {
  it('covers exactly the circuits that have a guide', () => {
    expect([...CIRCUIT_SEO_FACT_SLUGS].sort()).toEqual(
      [...listCircuitGuideSlugs()].sort(),
    );
  });

  it('matches the overtaking and upset-risk traits in the guide', () => {
    for (const slug of CIRCUIT_SEO_FACT_SLUGS) {
      const facts = getCircuitSeoFacts(slug);
      const guide = getCircuitGuideBySlug(slug);
      expect(facts, slug).toBeDefined();
      expect(guide, slug).not.toBeNull();

      function trait(label: string) {
        return guide!.traits.find((t) => t.label === label)?.value;
      }

      expect(firstWord(facts!.overtaking), `${slug} overtaking`).toBe(
        firstWord(trait('Overtaking')),
      );
      expect(firstWord(facts!.upsetRisk), `${slug} upset risk`).toBe(
        firstWord(trait('Upset risk')),
      );
      expect(firstWord(facts!.trackType), `${slug} track type`).toBe(
        firstWord(trait('Track type')),
      );

      // The guides put a venue's qualifier in parentheses ("Permanent (high
      // altitude)"); the snippet reworks it into something that reads after a
      // noun ("a permanent circuit at altitude"), so the wording deliberately
      // differs. What must not drift is whether there is a qualifier at all —
      // a guide that gains or loses one should fail here.
      expect(
        facts!.trackNote !== undefined,
        `${slug} track note vs ${trait('Track type')}`,
      ).toBe((trait('Track type') ?? '').includes('('));
    }
  });

  it('uses a short name that fits inside a search-result title', () => {
    for (const slug of CIRCUIT_SEO_FACT_SLUGS) {
      const facts = getCircuitSeoFacts(slug)!;
      // The title template is `${shortName} | F1 Circuit Guide`, and titles are
      // truncated around 60 characters.
      expect(
        `${facts.shortName} | F1 Circuit Guide`.length,
        slug,
      ).toBeLessThanOrEqual(60);
    }
  });

  it('keeps the short name recognisable against the official name', () => {
    for (const slug of CIRCUIT_SEO_FACT_SLUGS) {
      const facts = getCircuitSeoFacts(slug)!;
      const circuit = getCircuit(slug);
      expect(circuit, slug).toBeDefined();
      // A short name is either a run of words lifted from the official name, or
      // the circuit's own slug — which is where a venue universally known by a
      // name its paperwork does not use lands (Interlagos is the Autódromo José
      // Carlos Pace). Anything else is a nickname nobody agreed to, and would
      // survive a rename of the circuit it claims to abbreviate.
      const short = facts.shortName.toLowerCase();
      const fromOfficialName = circuit!.name.toLowerCase().includes(short);
      const isOwnSlug = short === slug.replaceAll('-', ' ');
      expect(fromOfficialName || isOwnSlug, `${slug}: ${facts.shortName}`).toBe(
        true,
      );
    }
  });
});
