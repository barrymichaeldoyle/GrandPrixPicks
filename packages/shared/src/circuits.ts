/**
 * Circuits as first-class entities, and the mapping from a race to the ground
 * it is run on.
 *
 * This exists because a Grand Prix and a circuit are not the same thing, and
 * the app kept assuming they were. A race is named after its commercial host
 * ("Bahrain Grand Prix"); a circuit is a place. Those usually agree, so it was
 * tempting to key venue facts off the race slug's prefix and move on. Then the
 * 2026 Bahrain GP was reinstated at Sepang, in Malaysia, and every one of those
 * prefix lookups confidently answered "Sakhir" for a race being held 6,000km
 * away. Three separate override tables went in to patch that over.
 *
 * So: venue facts live here, keyed by circuit. A race points at a circuit.
 * Anything that varies with the *race* rather than the venue (its name, its
 * hashtag, the flag on its card) deliberately stays out of this file, because
 * the Bahrain case is exactly where the two come apart: that race flies the
 * Bahraini flag while running on Malaysian tarmac.
 *
 * Editorial prose about each circuit lives in the web app
 * (`apps/web/src/lib/circuitGuides.ts`), keyed by the circuit slugs below.
 */

export type Circuit = {
  /** URL-safe venue slug. Stable across seasons; this is a public URL. */
  slug: string;
  /** Full circuit name, as F1 uses it. */
  name: string;
  /** Town or city, for structured data. */
  locality: string;
  country: string;
  /** IANA timezone, for track-local session times. */
  timeZone: string;
};

const CIRCUITS = {
  'albert-park': {
    slug: 'albert-park',
    name: 'Albert Park Circuit',
    locality: 'Melbourne',
    country: 'Australia',
    timeZone: 'Australia/Melbourne',
  },
  shanghai: {
    slug: 'shanghai',
    name: 'Shanghai International Circuit',
    locality: 'Shanghai',
    country: 'China',
    timeZone: 'Asia/Shanghai',
  },
  suzuka: {
    slug: 'suzuka',
    name: 'Suzuka International Racing Course',
    locality: 'Suzuka',
    country: 'Japan',
    timeZone: 'Asia/Tokyo',
  },
  sakhir: {
    slug: 'sakhir',
    name: 'Bahrain International Circuit',
    locality: 'Sakhir',
    country: 'Bahrain',
    timeZone: 'Asia/Bahrain',
  },
  jeddah: {
    slug: 'jeddah',
    name: 'Jeddah Corniche Circuit',
    locality: 'Jeddah',
    country: 'Saudi Arabia',
    timeZone: 'Asia/Riyadh',
  },
  miami: {
    slug: 'miami',
    name: 'Miami International Autodrome',
    locality: 'Miami',
    country: 'United States',
    timeZone: 'America/New_York',
  },
  imola: {
    slug: 'imola',
    name: 'Autodromo Enzo e Dino Ferrari',
    locality: 'Imola',
    country: 'Italy',
    timeZone: 'Europe/Rome',
  },
  'gilles-villeneuve': {
    slug: 'gilles-villeneuve',
    name: 'Circuit Gilles Villeneuve',
    locality: 'Montreal',
    country: 'Canada',
    timeZone: 'America/Toronto',
  },
  monaco: {
    slug: 'monaco',
    name: 'Circuit de Monaco',
    locality: 'Monte Carlo',
    country: 'Monaco',
    timeZone: 'Europe/Monaco',
  },
  barcelona: {
    slug: 'barcelona',
    name: 'Circuit de Barcelona-Catalunya',
    locality: 'Barcelona',
    country: 'Spain',
    timeZone: 'Europe/Madrid',
  },
  'red-bull-ring': {
    slug: 'red-bull-ring',
    name: 'Red Bull Ring',
    locality: 'Spielberg',
    country: 'Austria',
    timeZone: 'Europe/Vienna',
  },
  silverstone: {
    slug: 'silverstone',
    name: 'Silverstone Circuit',
    locality: 'Silverstone',
    country: 'United Kingdom',
    timeZone: 'Europe/London',
  },
  spa: {
    slug: 'spa',
    name: 'Circuit de Spa-Francorchamps',
    locality: 'Stavelot',
    country: 'Belgium',
    timeZone: 'Europe/Brussels',
  },
  hungaroring: {
    slug: 'hungaroring',
    name: 'Hungaroring',
    locality: 'Budapest',
    country: 'Hungary',
    timeZone: 'Europe/Budapest',
  },
  zandvoort: {
    slug: 'zandvoort',
    name: 'Circuit Zandvoort',
    locality: 'Zandvoort',
    country: 'Netherlands',
    timeZone: 'Europe/Amsterdam',
  },
  monza: {
    slug: 'monza',
    name: 'Autodromo Nazionale Monza',
    locality: 'Monza',
    country: 'Italy',
    timeZone: 'Europe/Rome',
  },
  madring: {
    slug: 'madring',
    name: 'Madring',
    locality: 'Madrid',
    country: 'Spain',
    timeZone: 'Europe/Madrid',
  },
  baku: {
    slug: 'baku',
    name: 'Baku City Circuit',
    locality: 'Baku',
    country: 'Azerbaijan',
    timeZone: 'Asia/Baku',
  },
  sepang: {
    slug: 'sepang',
    name: 'Sepang International Circuit',
    locality: 'Kuala Lumpur',
    country: 'Malaysia',
    timeZone: 'Asia/Kuala_Lumpur',
  },
  'marina-bay': {
    slug: 'marina-bay',
    name: 'Marina Bay Street Circuit',
    locality: 'Singapore',
    country: 'Singapore',
    timeZone: 'Asia/Singapore',
  },
  cota: {
    slug: 'cota',
    name: 'Circuit of the Americas',
    locality: 'Austin',
    country: 'United States',
    timeZone: 'America/Chicago',
  },
  'mexico-city': {
    slug: 'mexico-city',
    name: 'Autódromo Hermanos Rodríguez',
    locality: 'Mexico City',
    country: 'Mexico',
    timeZone: 'America/Mexico_City',
  },
  interlagos: {
    slug: 'interlagos',
    name: 'Autódromo José Carlos Pace',
    locality: 'São Paulo',
    country: 'Brazil',
    timeZone: 'America/Sao_Paulo',
  },
  'las-vegas': {
    slug: 'las-vegas',
    name: 'Las Vegas Strip Circuit',
    locality: 'Las Vegas',
    country: 'United States',
    timeZone: 'America/Los_Angeles',
  },
  lusail: {
    slug: 'lusail',
    name: 'Lusail International Circuit',
    locality: 'Lusail',
    country: 'Qatar',
    timeZone: 'Asia/Qatar',
  },
  'yas-marina': {
    slug: 'yas-marina',
    name: 'Yas Marina Circuit',
    locality: 'Abu Dhabi',
    country: 'United Arab Emirates',
    timeZone: 'Asia/Dubai',
  },
  portimao: {
    slug: 'portimao',
    name: 'Autódromo Internacional do Algarve',
    locality: 'Portimão',
    country: 'Portugal',
    timeZone: 'Europe/Lisbon',
  },
} as const satisfies Record<string, Circuit>;

export type CircuitSlug = keyof typeof CIRCUITS;

/**
 * Races whose venue does not follow from their name. Checked before the prefix
 * map below, and keyed by the *full* race slug so it only ever claims the one
 * season it is talking about.
 */
const CIRCUIT_BY_RACE_SLUG: Record<string, CircuitSlug> = {
  // Bahrain's own round was called off and the Grand Prix was reinstated at
  // Sepang, keeping the Bahrain name. A future Bahrain GP falls through to the
  // prefix map and correctly lands back at Sakhir.
  'bahrain-2026': 'sepang',
};

/**
 * Race-slug prefix (the slug with its season stripped) to circuit, for the
 * ordinary case where a Grand Prix is held where its name suggests. Aliases
 * are kept for slugs the app has used across seasons.
 */
const CIRCUIT_BY_RACE_PREFIX: Record<string, CircuitSlug> = {
  australia: 'albert-park',
  australian: 'albert-park',
  china: 'shanghai',
  chinese: 'shanghai',
  japan: 'suzuka',
  japanese: 'suzuka',
  bahrain: 'sakhir',
  'saudi-arabia': 'jeddah',
  'saudi-arabian': 'jeddah',
  saudi: 'jeddah',
  miami: 'miami',
  emilia: 'imola',
  'emilia-romagna': 'imola',
  imola: 'imola',
  canada: 'gilles-villeneuve',
  monaco: 'monaco',
  spain: 'barcelona',
  austria: 'red-bull-ring',
  britain: 'silverstone',
  belgium: 'spa',
  hungary: 'hungaroring',
  netherlands: 'zandvoort',
  italy: 'monza',
  madrid: 'madring',
  azerbaijan: 'baku',
  singapore: 'marina-bay',
  usa: 'cota',
  'united-states': 'cota',
  mexico: 'mexico-city',
  brazil: 'interlagos',
  'las-vegas': 'las-vegas',
  qatar: 'lusail',
  'abu-dhabi': 'yas-marina',
  uae: 'yas-marina',
  portugal: 'portimao',
};

/** Every circuit, ordered by name. */
export function listCircuits(): readonly Circuit[] {
  return Object.values(CIRCUITS).sort((a, b) => a.name.localeCompare(b.name));
}

export function getCircuit(circuitSlug: string): Circuit | null {
  return (
    (CIRCUITS as Record<string, Circuit>)[circuitSlug.toLowerCase()] ?? null
  );
}

/**
 * The circuit a race is run on, from its slug (with or without season suffix).
 * Returns null for a slug the app has never seen, which is a real case: an
 * admin can create a race with any slug they like.
 */
export function getCircuitForRace(raceSlug: string): Circuit | null {
  const normalized = raceSlug.toLowerCase();
  const exact = CIRCUIT_BY_RACE_SLUG[normalized];
  if (exact) {
    return CIRCUITS[exact];
  }
  const prefix = CIRCUIT_BY_RACE_PREFIX[normalized.replace(/-\d{4}$/, '')];
  return prefix ? CIRCUITS[prefix] : null;
}
