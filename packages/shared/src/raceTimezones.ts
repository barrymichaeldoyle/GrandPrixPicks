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

/**
 * Overrides keyed by the *full* slug, checked before the prefix map.
 *
 * A Grand Prix is named after its commercial host, not the ground it is run
 * on, so the two can come apart for a single season. When that happens the
 * prefix map would answer for the name rather than the venue, and every entry
 * here exists to stop that for exactly one season while leaving the prefix
 * correct for every other one.
 */
const SLUG_TO_TIMEZONE_OVERRIDES: Record<string, string> = {
  // The 2026 Bahrain GP is run at Sepang, Malaysia, after Bahrain's own round
  // was called off. A future Bahrain GP at Sakhir must still get Asia/Bahrain.
  'bahrain-2026': 'Asia/Kuala_Lumpur',
};

export function getRaceTimeZoneFromSlug(slug: string): string | undefined {
  const normalized = slug.toLowerCase();
  const override = SLUG_TO_TIMEZONE_OVERRIDES[normalized];
  if (override) {
    return override;
  }
  return SLUG_TO_TIMEZONE[normalized.replace(/-\d{4}$/, '')];
}
