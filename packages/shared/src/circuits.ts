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
  /** WGS84 coordinates of the circuit, used for point forecasts. */
  latitude: number;
  longitude: number;
  /** Metres above sea level when a reliable circuit value is available. */
  elevation?: number;
};

const CIRCUITS = {
  'albert-park': {
    slug: 'albert-park',
    name: 'Albert Park Circuit',
    locality: 'Melbourne',
    country: 'Australia',
    timeZone: 'Australia/Melbourne',
    latitude: -37.8497,
    longitude: 144.968,
  },
  shanghai: {
    slug: 'shanghai',
    name: 'Shanghai International Circuit',
    locality: 'Shanghai',
    country: 'China',
    timeZone: 'Asia/Shanghai',
    latitude: 31.3389,
    longitude: 121.22,
  },
  suzuka: {
    slug: 'suzuka',
    name: 'Suzuka International Racing Course',
    locality: 'Suzuka',
    country: 'Japan',
    timeZone: 'Asia/Tokyo',
    latitude: 34.8431,
    longitude: 136.541,
  },
  sakhir: {
    slug: 'sakhir',
    name: 'Bahrain International Circuit',
    locality: 'Sakhir',
    country: 'Bahrain',
    timeZone: 'Asia/Bahrain',
    latitude: 26.0325,
    longitude: 50.5106,
  },
  jeddah: {
    slug: 'jeddah',
    name: 'Jeddah Corniche Circuit',
    locality: 'Jeddah',
    country: 'Saudi Arabia',
    timeZone: 'Asia/Riyadh',
    latitude: 21.6319,
    longitude: 39.1044,
  },
  miami: {
    slug: 'miami',
    name: 'Miami International Autodrome',
    locality: 'Miami',
    country: 'United States',
    timeZone: 'America/New_York',
    latitude: 25.9581,
    longitude: -80.2389,
  },
  imola: {
    slug: 'imola',
    name: 'Autodromo Enzo e Dino Ferrari',
    locality: 'Imola',
    country: 'Italy',
    timeZone: 'Europe/Rome',
    latitude: 44.3439,
    longitude: 11.7167,
  },
  'gilles-villeneuve': {
    slug: 'gilles-villeneuve',
    name: 'Circuit Gilles Villeneuve',
    locality: 'Montreal',
    country: 'Canada',
    timeZone: 'America/Toronto',
    latitude: 45.5,
    longitude: -73.5228,
  },
  monaco: {
    slug: 'monaco',
    name: 'Circuit de Monaco',
    locality: 'Monte Carlo',
    country: 'Monaco',
    timeZone: 'Europe/Monaco',
    latitude: 43.7347,
    longitude: 7.4206,
  },
  barcelona: {
    slug: 'barcelona',
    name: 'Circuit de Barcelona-Catalunya',
    locality: 'Barcelona',
    country: 'Spain',
    timeZone: 'Europe/Madrid',
    latitude: 41.57,
    longitude: 2.2611,
  },
  'red-bull-ring': {
    slug: 'red-bull-ring',
    name: 'Red Bull Ring',
    locality: 'Spielberg',
    country: 'Austria',
    timeZone: 'Europe/Vienna',
    latitude: 47.2197,
    longitude: 14.7647,
  },
  silverstone: {
    slug: 'silverstone',
    name: 'Silverstone Circuit',
    locality: 'Silverstone',
    country: 'United Kingdom',
    timeZone: 'Europe/London',
    latitude: 52.0786,
    longitude: -1.0169,
  },
  spa: {
    slug: 'spa',
    name: 'Circuit de Spa-Francorchamps',
    locality: 'Stavelot',
    country: 'Belgium',
    timeZone: 'Europe/Brussels',
    latitude: 50.4372,
    longitude: 5.9714,
  },
  hungaroring: {
    slug: 'hungaroring',
    name: 'Hungaroring',
    locality: 'Budapest',
    country: 'Hungary',
    timeZone: 'Europe/Budapest',
    latitude: 47.5789,
    longitude: 19.2486,
  },
  zandvoort: {
    slug: 'zandvoort',
    name: 'Circuit Zandvoort',
    locality: 'Zandvoort',
    country: 'Netherlands',
    timeZone: 'Europe/Amsterdam',
    latitude: 52.3888,
    longitude: 4.5409,
  },
  monza: {
    slug: 'monza',
    name: 'Autodromo Nazionale Monza',
    locality: 'Monza',
    country: 'Italy',
    timeZone: 'Europe/Rome',
    latitude: 45.6156,
    longitude: 9.2811,
  },
  madring: {
    slug: 'madring',
    name: 'Madring',
    locality: 'Madrid',
    country: 'Spain',
    timeZone: 'Europe/Madrid',
    latitude: 40.4653,
    longitude: -3.6153,
  },
  baku: {
    slug: 'baku',
    name: 'Baku City Circuit',
    locality: 'Baku',
    country: 'Azerbaijan',
    timeZone: 'Asia/Baku',
    latitude: 40.3725,
    longitude: 49.8533,
  },
  sepang: {
    slug: 'sepang',
    name: 'Sepang International Circuit',
    locality: 'Kuala Lumpur',
    country: 'Malaysia',
    timeZone: 'Asia/Kuala_Lumpur',
    latitude: 2.7608,
    longitude: 101.738,
  },
  'marina-bay': {
    slug: 'marina-bay',
    name: 'Marina Bay Street Circuit',
    locality: 'Singapore',
    country: 'Singapore',
    timeZone: 'Asia/Singapore',
    latitude: 1.2914,
    longitude: 103.864,
  },
  cota: {
    slug: 'cota',
    name: 'Circuit of the Americas',
    locality: 'Austin',
    country: 'United States',
    timeZone: 'America/Chicago',
    latitude: 30.1328,
    longitude: -97.6411,
  },
  'mexico-city': {
    slug: 'mexico-city',
    name: 'Autódromo Hermanos Rodríguez',
    locality: 'Mexico City',
    country: 'Mexico',
    timeZone: 'America/Mexico_City',
    latitude: 19.4042,
    longitude: -99.0907,
  },
  interlagos: {
    slug: 'interlagos',
    name: 'Autódromo José Carlos Pace',
    locality: 'São Paulo',
    country: 'Brazil',
    timeZone: 'America/Sao_Paulo',
    latitude: -23.7036,
    longitude: -46.6997,
  },
  'las-vegas': {
    slug: 'las-vegas',
    name: 'Las Vegas Strip Circuit',
    locality: 'Las Vegas',
    country: 'United States',
    timeZone: 'America/Los_Angeles',
    latitude: 36.1162,
    longitude: -115.174,
  },
  lusail: {
    slug: 'lusail',
    name: 'Lusail International Circuit',
    locality: 'Lusail',
    country: 'Qatar',
    timeZone: 'Asia/Qatar',
    latitude: 25.49,
    longitude: 51.4542,
  },
  'yas-marina': {
    slug: 'yas-marina',
    name: 'Yas Marina Circuit',
    locality: 'Abu Dhabi',
    country: 'United Arab Emirates',
    timeZone: 'Asia/Dubai',
    latitude: 24.4672,
    longitude: 54.6031,
  },
  portimao: {
    slug: 'portimao',
    name: 'Autódromo Internacional do Algarve',
    locality: 'Portimão',
    country: 'Portugal',
    timeZone: 'Europe/Lisbon',
    latitude: 37.227,
    longitude: -8.6267,
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
