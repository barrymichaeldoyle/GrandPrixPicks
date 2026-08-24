/**
 * Which circuits have a written guide — the question, without the prose.
 *
 * `circuitGuides.ts` holds ~28 kB of venue writing, and a route loader that
 * imported it only to ask "is there a guide for this slug?" pulled all of it
 * into the client entry: TanStack splits a route's component into its own
 * chunk but keeps `loader` and `head` in the main bundle, so every visitor to
 * every page downloaded 23 circuit essays to render the landing hero.
 *
 * So the existence check lives here as literal slugs. The list is duplicated
 * on purpose — deriving it from `CIRCUIT_GUIDES` would import the object and
 * undo the split — and `circuitGuides.test.ts` fails if the two drift.
 */
export const CIRCUIT_GUIDE_SLUGS: readonly string[] = [
  'albert-park',
  'shanghai',
  'suzuka',
  'miami',
  'gilles-villeneuve',
  'monaco',
  'barcelona',
  'red-bull-ring',
  'silverstone',
  'spa',
  'hungaroring',
  'zandvoort',
  'monza',
  'madring',
  'baku',
  'sepang',
  'marina-bay',
  'cota',
  'mexico-city',
  'interlagos',
  'las-vegas',
  'lusail',
  'yas-marina',
];

const SLUG_SET = new Set(CIRCUIT_GUIDE_SLUGS);

/** Whether a circuit slug has a guide, without loading any of the writing. */
export function hasCircuitGuide(circuitSlug: string): boolean {
  return SLUG_SET.has(circuitSlug.toLowerCase());
}
