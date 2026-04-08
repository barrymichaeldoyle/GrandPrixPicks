const SLUG_TO_COUNTRY: Record<string, string> = {
  australia: 'au',
  austria: 'at',
  azerbaijan: 'az',
  bahrain: 'bh',
  belgium: 'be',
  brazil: 'br',
  canada: 'ca',
  china: 'cn',
  'emilia-romagna': 'it',
  france: 'fr',
  hungary: 'hu',
  italy: 'it',
  japan: 'jp',
  'las-vegas': 'us',
  mexico: 'mx',
  miami: 'us',
  monaco: 'mc',
  netherlands: 'nl',
  portugal: 'pt',
  qatar: 'qa',
  saudi: 'sa',
  'saudi-arabia': 'sa',
  singapore: 'sg',
  spain: 'es',
  'united-states': 'us',
  usa: 'us',
};

export function getCountryCodeForRaceSlug(slug: string): string | null {
  const key = slug.replace(/-\d{4}$/, '').toLowerCase();
  return SLUG_TO_COUNTRY[key] ?? null;
}
