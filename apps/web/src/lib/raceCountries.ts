/** Map race slug prefix to ISO 3166-1 alpha-2 country code for flag images. */
const SLUG_TO_COUNTRY: Record<string, string> = {
  australia: 'au',
  australian: 'au',
  china: 'cn',
  chinese: 'cn',
  japan: 'jp',
  japanese: 'jp',
  bahrain: 'bh',
  'saudi-arabia': 'sa',
  'saudi-arabian': 'sa',
  saudi: 'sa',
  miami: 'us',
  canada: 'ca',
  monaco: 'mc',
  spain: 'es',
  madrid: 'es',
  austria: 'at',
  britain: 'gb',
  belgium: 'be',
  hungary: 'hu',
  netherlands: 'nl',
  italy: 'it',
  'emilia-romagna': 'it',
  imola: 'it',
  singapore: 'sg',
  usa: 'us',
  'united-states': 'us',
  mexico: 'mx',
  brazil: 'br',
  qatar: 'qa',
  'abu-dhabi': 'ae',
  uae: 'ae',
  portugal: 'pt',
  'las-vegas': 'us',
  azerbaijan: 'az',
};

export function getCountryCodeForRace(race: { slug: string }): string | null {
  const key = race.slug.replace(/-\d{4}$/, '').toLowerCase();
  return SLUG_TO_COUNTRY[key] ?? null;
}
