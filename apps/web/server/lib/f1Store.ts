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

/**
 * Store pages a link may ask for with `?page=`, each under its own Impact ad so
 * the dashboard reports it separately from the front-page link.
 *
 * An allowlist rather than a path from the query string: the redirect sits on
 * our domain, and one that forwarded any path would be an open redirect into
 * a shop with our click id on it. The paths are the same on every regional
 * shop (checked 2026-10-01), so the shop is still chosen per visitor.
 */
export const F1_STORE_PAGES = {
  'esteban-ocon': {
    path: 'esteban-ocon/a-2384886157+z-977991-74467561',
    trackingUrl: 'https://f1.pxf.io/c/1208040/866088/11910',
  },
} as const;

type F1StorePage = keyof typeof F1_STORE_PAGES;

function storePageFor(page: string | null) {
  return page && Object.hasOwn(F1_STORE_PAGES, page)
    ? F1_STORE_PAGES[page as F1StorePage]
    : undefined;
}

type Shop = {
  origin: string;
  /** Path prefixes the shop serves, in the store's own order. */
  languages: readonly string[];
  /**
   * The shop's Impact product catalogs by language, read by the store-page
   * product tiles (`apps/backend/convex/storeProducts.ts`). The first is the
   * fallback for a language with no catalog. Absent for the US shop, which
   * has no catalog: its "US" catalog is really the international one.
   */
  catalogs?: Record<string, string>;
};

const UK: Shop = {
  origin: 'https://f1store.formula1.com',
  languages: ['en', 'de', 'es', 'fr'],
  catalogs: { en: '6648' },
};
const EU: Shop = {
  origin: 'https://f1store2.formula1.com',
  languages: ['en', 'de', 'es', 'fr'],
  // French first: it is the shop's own default, and there is no English
  // catalog for the EU.
  catalogs: { fr: '6649', es: '6650', de: '6651' },
};
const AUSTRALIA: Shop = {
  origin: 'https://f1store3.formula1.com',
  languages: ['en', 'es', 'fr'],
  catalogs: { en: '6652' },
};
const US: Shop = {
  origin: 'https://usf1store.formula1.com',
  languages: ['en'],
};
/** Everywhere else, in US dollars: South Africa, Canada, Latin America, Asia. */
const INTERNATIONAL: Shop = {
  origin: 'https://f1store4.formula1.com',
  languages: ['en', 'es', 'fr'],
  catalogs: { en: '6653' },
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
 *
 * `page` is a key of {@link F1_STORE_PAGES}. Anything else, including a
 * mistyped key, falls back to the shop's front page rather than failing: a
 * reader who clicked a store link should still reach the store.
 */
export function f1StoreUrlFor(
  country: string | null,
  acceptLanguage: string | null,
  page: string | null = null,
): string {
  const shop = shopFor(country);
  const storePage = storePageFor(page);
  const destination = `${shop.origin}/${languageFor(shop, acceptLanguage)}/${storePage?.path ?? ''}`;
  const tracking = storePage?.trackingUrl ?? F1_STORE_TRACKING_URL;
  return `${tracking}?u=${encodeURIComponent(destination)}`;
}

/**
 * The Impact catalog whose products this visitor should see: their shop's,
 * in their language where the shop has a catalog for it. Null for a shop with
 * no catalog, and the caller shows the plain link instead.
 */
export function f1StoreCatalogFor(
  country: string | null,
  acceptLanguage: string | null,
): string | null {
  const { catalogs } = shopFor(country);
  if (!catalogs) {
    return null;
  }
  return (
    catalogs[languageFor(shopFor(country), acceptLanguage)] ??
    Object.values(catalogs)[0] ??
    null
  );
}
