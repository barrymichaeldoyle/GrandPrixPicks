/**
 * The two or three facts about a circuit that a search snippet can carry —
 * without the prose that states them.
 *
 * Same split, and same reason, as `circuitGuideSlugs.ts`: `circuitGuides.ts`
 * holds ~28 kB of venue writing, and TanStack keeps a route's `loader` and
 * `head` in the client entry rather than the component's chunk. A `head()`
 * that imported `CIRCUIT_GUIDES` to name a track's overtaking difficulty would
 * ship all 23 essays to every visitor on every page.
 *
 * So the snippet-sized facts are duplicated here on purpose, and
 * `circuitSeoFacts.test.ts` fails if they drift from the guides they were
 * copied from.
 *
 * `shortName` exists because titles get truncated around 60 characters and
 * several official circuit names spend 34 of them on their own
 * ("Suzuka International Racing Course"). It is the name a reader would
 * actually say out loud, and it is used in titles and meta descriptions only —
 * never in prose or structured data, which keep the full legal name.
 */

export type CircuitSeoFacts = {
  /** Speakable name, for titles and meta descriptions. */
  shortName: string;
  /** Lowercase track-type adjective, e.g. "permanent", "street". */
  trackType: string;
  /**
   * Optional qualifier that reads AFTER the noun, e.g. "at altitude". Keeping
   * it separate is what stops the snippet saying "a permanent, at altitude
   * circuit"; it composes as "a permanent circuit at altitude".
   */
  trackNote?: string;
  /** Lowercase overtaking difficulty, e.g. "hard", "very good". */
  overtaking: string;
  /** Lowercase upset-risk phrase, e.g. "low", "high (season opener)". */
  upsetRisk: string;
};

const CIRCUIT_SEO_FACTS: Record<string, CircuitSeoFacts> = {
  'albert-park': {
    shortName: 'Albert Park',
    trackType: 'temporary parkland',
    overtaking: 'moderate',
    upsetRisk: 'high (season opener)',
  },
  shanghai: {
    shortName: 'Shanghai',
    trackType: 'permanent',
    overtaking: 'good',
    upsetRisk: 'medium',
  },
  suzuka: {
    shortName: 'Suzuka',
    trackType: 'permanent',
    overtaking: 'hard',
    upsetRisk: 'low unless it rains',
  },
  miami: {
    shortName: 'Miami',
    trackType: 'temporary',
    overtaking: 'good',
    upsetRisk: 'medium',
  },
  'gilles-villeneuve': {
    shortName: 'Gilles Villeneuve',
    trackType: 'temporary parkland',
    overtaking: 'good',
    upsetRisk: 'high',
  },
  monaco: {
    shortName: 'Monaco',
    trackType: 'street',
    overtaking: 'very hard',
    upsetRisk: 'low, then sudden',
  },
  barcelona: {
    shortName: 'Barcelona-Catalunya',
    trackType: 'permanent',
    overtaking: 'moderate',
    upsetRisk: 'low',
  },
  'red-bull-ring': {
    shortName: 'Red Bull Ring',
    trackType: 'permanent',
    overtaking: 'good',
    upsetRisk: 'medium',
  },
  silverstone: {
    shortName: 'Silverstone',
    trackType: 'permanent',
    overtaking: 'good',
    upsetRisk: 'weather dependent',
  },
  spa: {
    shortName: 'Spa-Francorchamps',
    trackType: 'permanent',
    overtaking: 'very good',
    upsetRisk: 'high',
  },
  hungaroring: {
    shortName: 'Hungaroring',
    trackType: 'permanent',
    overtaking: 'hard',
    upsetRisk: 'low',
  },
  zandvoort: {
    shortName: 'Zandvoort',
    trackType: 'permanent',
    overtaking: 'hard',
    upsetRisk: 'medium',
  },
  monza: {
    shortName: 'Monza',
    trackType: 'permanent',
    overtaking: 'good',
    upsetRisk: 'medium',
  },
  madring: {
    shortName: 'Madring',
    trackType: 'street-and-permanent hybrid',
    overtaking: 'promising but unproven',
    upsetRisk: 'high (new circuit)',
  },
  baku: {
    shortName: 'Baku',
    trackType: 'street',
    overtaking: 'very good',
    upsetRisk: 'very high',
  },
  sepang: {
    shortName: 'Sepang',
    trackType: 'permanent',
    trackNote: 'in the tropics',
    overtaking: 'easy',
    upsetRisk: 'high',
  },
  'marina-bay': {
    shortName: 'Marina Bay',
    trackType: 'street',
    trackNote: 'under lights',
    overtaking: 'hard',
    upsetRisk: 'medium to high',
  },
  cota: {
    shortName: 'Circuit of the Americas',
    trackType: 'permanent',
    overtaking: 'good',
    upsetRisk: 'medium',
  },
  'mexico-city': {
    shortName: 'Hermanos Rodríguez',
    trackType: 'permanent',
    trackNote: 'at altitude',
    overtaking: 'good',
    upsetRisk: 'medium',
  },
  interlagos: {
    shortName: 'Interlagos',
    trackType: 'permanent',
    trackNote: 'run anticlockwise',
    overtaking: 'very good',
    upsetRisk: 'high',
  },
  'las-vegas': {
    shortName: 'Las Vegas Strip',
    trackType: 'street',
    trackNote: 'under lights',
    overtaking: 'very good',
    upsetRisk: 'high',
  },
  lusail: {
    shortName: 'Lusail',
    trackType: 'permanent',
    trackNote: 'under lights',
    overtaking: 'moderate',
    upsetRisk: 'medium',
  },
  'yas-marina': {
    shortName: 'Yas Marina',
    trackType: 'permanent',
    trackNote: 'starting at dusk',
    overtaking: 'moderate',
    upsetRisk: 'low',
  },
};

/** Snippet facts for a circuit slug, or undefined when it has no guide. */
export function getCircuitSeoFacts(
  circuitSlug: string,
): CircuitSeoFacts | undefined {
  return CIRCUIT_SEO_FACTS[circuitSlug.toLowerCase()];
}

/** Every slug with snippet facts. Exported for the drift test. */
export const CIRCUIT_SEO_FACT_SLUGS = Object.keys(CIRCUIT_SEO_FACTS);
