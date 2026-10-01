/**
 * Which regional F1 Store a visitor is sent to, wrapped in our Impact tracking
 * link.
 *
 * The store is five shops, not one, and the bare tracking link always landed
 * on the EU shop, which opens in French and prices in euros: a visitor from
 * South Africa was sent there. Each shop is a different host, and the store's
 * own `hreflang` links say which countries each one serves. That map is copied
 * here, so this file is the place to change when it moves.
 *
 * One Impact campaign covers every shop: a deep link (`?u=`) to any of these
 * hosts arrives with the click id attached, checked 2026-10-01. A host the
 * campaign did not allow would silently fall back to the EU shop instead.
 */
export const F1_STORE_TRACKING_URL = 'https://f1.pxf.io/c/1208040/852471/11910';

type Shop = {
  origin: string;
  /** Path prefixes the shop serves, in the store's own order. */
  languages: readonly string[];
};

const UK: Shop = {
  origin: 'https://f1store.formula1.com',
  languages: ['en', 'de', 'es', 'fr'],
};
const EU: Shop = {
  origin: 'https://f1store2.formula1.com',
  languages: ['en', 'de', 'es', 'fr'],
};
const AUSTRALIA: Shop = {
  origin: 'https://f1store3.formula1.com',
  languages: ['en', 'es', 'fr'],
};
const US: Shop = {
  origin: 'https://usf1store.formula1.com',
  languages: ['en'],
};
/** Everywhere else, in US dollars: South Africa, Canada, Latin America, Asia. */
const INTERNATIONAL: Shop = {
  origin: 'https://f1store4.formula1.com',
  languages: ['en', 'es', 'fr'],
};

const UK_COUNTRIES = new Set(['GB', 'GG', 'JE', 'IM']);
// The EU and EEA, Switzerland, and the microstates inside them.
const EU_COUNTRIES = new Set(
  (
    'AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK ' +
    'SI ES SE IS LI NO CH MC AD SM VA'
  ).split(' '),
);
const AUSTRALIA_COUNTRIES = new Set(['AU', 'NZ']);

function shopFor(country: string | null): Shop {
  const code = country?.toUpperCase() ?? '';
  if (UK_COUNTRIES.has(code)) {
    return UK;
  }
  if (EU_COUNTRIES.has(code)) {
    return EU;
  }
  if (AUSTRALIA_COUNTRIES.has(code)) {
    return AUSTRALIA;
  }
  if (code === 'US') {
    return US;
  }
  return INTERNATIONAL;
}

/**
 * The visitor's first browser language the shop offers, else English.
 *
 * Language comes from the browser, not the country, because a country does
 * not have one: the EU shop sends Belgium and Switzerland to German by
 * default, and a Dutch visitor to French.
 */
function languageFor(shop: Shop, acceptLanguage: string | null): string {
  for (const part of (acceptLanguage ?? '').split(',')) {
    const primary = part.split(';')[0].trim().split('-')[0].toLowerCase();
    if (shop.languages.includes(primary)) {
      return primary;
    }
  }
  return 'en';
}

/**
 * `country` is Cloudflare's `cf-ipcountry` header: an ISO code, `XX` when
 * unknown, `T1` for Tor, and absent in local dev. All three of those land on
 * the international shop.
 */
export function f1StoreUrlFor(
  country: string | null,
  acceptLanguage: string | null,
): string {
  const shop = shopFor(country);
  const destination = `${shop.origin}/${languageFor(shop, acceptLanguage)}/`;
  return `${F1_STORE_TRACKING_URL}?u=${encodeURIComponent(destination)}`;
}
