/**
 * The flag a race flies, keyed by race slug.
 *
 * Deliberately not in `circuits.ts`. A flag belongs to the Grand Prix, not to
 * the ground it is run on, and 2026 is exactly where the two come apart: the
 * Bahrain Grand Prix runs at Sepang and still flies the Bahraini flag. So this
 * is keyed off the race slug, and `circuits.ts` says why venue facts are not.
 *
 * Web and mobile both read this map. They used to keep one each, and mobile's
 * fell behind: it had never heard of `britain`, `madrid` or `abu-dhabi`, so
 * three rounds of 2026 showed no flag anywhere in the app. `raceCountries` in
 * the backend test suite asserts every slug on the calendar resolves here, so
 * adding a round to the schedule without a flag fails the build.
 */
const SLUG_TO_COUNTRY: Record<string, string> = {
  'abu-dhabi': 'ae',
  australia: 'au',
  australian: 'au',
  austria: 'at',
  azerbaijan: 'az',
  bahrain: 'bh',
  belgium: 'be',
  brazil: 'br',
  britain: 'gb',
  canada: 'ca',
  china: 'cn',
  chinese: 'cn',
  'emilia-romagna': 'it',
  france: 'fr',
  hungary: 'hu',
  imola: 'it',
  italy: 'it',
  japan: 'jp',
  japanese: 'jp',
  'las-vegas': 'us',
  madrid: 'es',
  mexico: 'mx',
  miami: 'us',
  monaco: 'mc',
  netherlands: 'nl',
  portugal: 'pt',
  qatar: 'qa',
  saudi: 'sa',
  'saudi-arabia': 'sa',
  'saudi-arabian': 'sa',
  singapore: 'sg',
  spain: 'es',
  uae: 'ae',
  'united-states': 'us',
  usa: 'us',
};

/** ISO 3166-1 alpha-2 code for a race slug, or null when it has no flag. */
export function getCountryCodeForRaceSlug(slug: string): string | null {
  const key = slug.replace(/-\d{4}$/, '').toLowerCase();
  return SLUG_TO_COUNTRY[key] ?? null;
}

/** Every slug prefix that resolves to a flag. Used by the calendar test. */
export function knownRaceCountrySlugs(): ReadonlyArray<string> {
  return Object.keys(SLUG_TO_COUNTRY);
}
