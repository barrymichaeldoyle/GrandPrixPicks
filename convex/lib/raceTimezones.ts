/** Map race slug prefix to IANA timezone for track-local time display. */
const SLUG_TO_TIMEZONE: Record<string, string> = {
  australia: 'Australia/Melbourne',
  australian: 'Australia/Melbourne',
  china: 'Asia/Shanghai',
  chinese: 'Asia/Shanghai',
  japan: 'Asia/Tokyo',
  japanese: 'Asia/Tokyo',
  bahrain: 'Asia/Bahrain',
  'saudi-arabia': 'Asia/Riyadh',
  'saudi-arabian': 'Asia/Riyadh',
  saudi: 'Asia/Riyadh',
  miami: 'America/New_York',
  canada: 'America/Toronto',
  monaco: 'Europe/Monaco',
  spain: 'Europe/Madrid',
  madrid: 'Europe/Madrid',
  austria: 'Europe/Vienna',
  britain: 'Europe/London',
  belgium: 'Europe/Brussels',
  hungary: 'Europe/Budapest',
  netherlands: 'Europe/Amsterdam',
  italy: 'Europe/Rome',
  'emilia-romagna': 'Europe/Rome',
  imola: 'Europe/Rome',
  singapore: 'Asia/Singapore',
  usa: 'America/Chicago',
  'united-states': 'America/Chicago',
  mexico: 'America/Mexico_City',
  brazil: 'America/Sao_Paulo',
  qatar: 'Asia/Qatar',
  'abu-dhabi': 'Asia/Dubai',
  uae: 'Asia/Dubai',
  portugal: 'Europe/Lisbon',
  'las-vegas': 'America/Los_Angeles',
  azerbaijan: 'Asia/Baku',
};

export function getRaceTimeZoneFromSlug(slug: string): string | undefined {
  const key = slug.replace(/-\d{4}$/, '').toLowerCase();
  return SLUG_TO_TIMEZONE[key];
}
