/**
 * Whether a visitor's country puts them under the GDPR, the UK GDPR or the
 * Swiss FADP, which is the line `src/lib/consent.ts` draws between cookie and
 * cookieless analytics.
 *
 * `country` is Cloudflare's `cf-ipcountry` header: an ISO code, `XX` when
 * unknown, `T1` for Tor, and absent in local dev. Unknown is in scope: a
 * wrong "outside" costs a visitor a cookie they were owed a choice on, a
 * wrong "inside" costs us a replay.
 */
const GDPR_COUNTRIES = new Set([
  // EU
  'AT',
  'BE',
  'BG',
  'HR',
  'CY',
  'CZ',
  'DK',
  'EE',
  'FI',
  'FR',
  'DE',
  'GR',
  'HU',
  'IE',
  'IT',
  'LV',
  'LT',
  'LU',
  'MT',
  'NL',
  'PL',
  'PT',
  'RO',
  'SK',
  'SI',
  'ES',
  'SE',
  // EEA beyond the EU
  'IS',
  'LI',
  'NO',
  // UK GDPR and the Swiss FADP
  'GB',
  'CH',
  // EU outermost regions and territories Cloudflare reports separately
  'GF',
  'GP',
  'MQ',
  'YT',
  'RE',
  'MF',
  'AX',
  'GI',
]);

export function gdprApplies(country: string | null): boolean {
  if (country === null) {
    return true;
  }
  const code = country.toUpperCase();
  if (code.length !== 2 || code === 'XX' || code === 'T1') {
    return true;
  }
  return GDPR_COUNTRIES.has(code);
}
