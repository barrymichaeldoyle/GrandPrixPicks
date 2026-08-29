/**
 * Site-wide config and derived values.
 * ogBaseUrl is used for og:image (and twitter:image) so that in dev the
 * TanStack Router devtools can load previews from the same origin (localhost).
 * Set VITE_SITE_URL in .env.local to your dev URL (e.g. http://localhost:3000).
 */

export const CURRENT_SEASON = 2026;

export const siteConfig = {
  title: 'Grand Prix Picks',
  description: `Predict the top 5 finishers for each Formula 1 race and compete with friends throughout the ${CURRENT_SEASON} season.`,
  url: 'https://grandprixpicks.com',
  themeColor: '#101113',
  author: {
    name: 'Barry Michael Doyle',
    url: 'https://barrymichaeldoyle.com',
  },
  social: {
    x: {
      handle: '@GrandPrixPicks',
      url: 'https://x.com/GrandPrixPicks',
    },
    reddit: {
      name: 'r/GPPicks',
      url: 'https://www.reddit.com/r/GPPicks/',
    },
    instagram: {
      // Display casing only, to match the X handle. Instagram usernames are
      // case-insensitive, so the URL stays lowercase — that is the canonical
      // form the profile resolves to and the one listed in `sameAs`.
      handle: '@GrandPrixPicks',
      url: 'https://www.instagram.com/grandprixpicks/',
    },
  },
} as const;

/** Base URL for absolute links (OG images, canonical). Use in dev for devtools previews. */
const ogBaseUrl =
  (import.meta.env as { VITE_SITE_URL?: string }).VITE_SITE_URL ??
  siteConfig.url;

/** Temporary shared OG image until per-page variants are finalized. */
export const defaultOgImage = `${ogBaseUrl}/og-default.png?v=20260731`;

/**
 * Absolute URL for the site's own OG card, rendered against the next race.
 *
 * The slug is in the URL rather than resolved server-side because scrapers key
 * their image cache on the URL: a stable `/og/next` would keep showing the
 * previous Grand Prix in WhatsApp and X previews for weeks after it ran. A new
 * round is a new URL, so it is fetched fresh. Falls back to the evergreen card
 * off-season, when there is no next race to name.
 *
 * @param raceSlug — slug of the next race, or undefined off-season
 */
export function nextRaceOgImageUrl(raceSlug: string | undefined) {
  return raceSlug ? raceOgImageUrl(raceSlug) : defaultOgImage;
}

/**
 * Absolute URL for a given race's own OG card.
 *
 * Same renderer as {@link nextRaceOgImageUrl}, named for what it actually
 * takes: any race slug, past or future. The endpoint is called `/og/next`
 * because the home page was its first caller, but it has never cared whether
 * the race it is handed is the next one — race detail pages use it for
 * finished rounds too, so each of them previews as itself rather than as the
 * site-wide card.
 *
 * @param raceSlug — slug of the race to render
 */
export function raceOgImageUrl(raceSlug: string) {
  return `${ogBaseUrl}/og/next?race=${raceSlug}`;
}

/**
 * Absolute URL for a dynamically rendered share-card OG image.
 * @param search — query string params for the /og/share endpoint
 */
export function shareCardOgImageUrl(search: Record<string, string>) {
  return `${ogBaseUrl}/og/share?${new URLSearchParams(search).toString()}`;
}

/**
 * Returns canonical meta tags (og:url, twitter:url) and the canonical link
 * for a given path. Use in each route's `head()` to set per-page canonical URLs.
 *
 * @param path — the route path, e.g. '/pricing' or '/races/abc123'
 */
export function canonicalMeta(path: string) {
  const url = `${siteConfig.url}${path}`;
  return {
    meta: [
      { property: 'og:url', content: url },
      { name: 'twitter:url', content: url },
    ] as const,
    links: [{ rel: 'canonical', href: url }] as const,
  };
}

/** Returns robots metadata for pages that should not appear in search results. */
export function noIndexMeta() {
  return [{ name: 'robots', content: 'noindex, follow' }] as const;
}

/**
 * Builds the standard per-page `head()` payload: title + description, the
 * Open Graph / Twitter title/description/image, robots (when `noIndex`), and
 * canonical (og:url, twitter:url, link). Global tags (og:type, og:site_name,
 * twitter:card) live in `__root.tsx`.
 *
 * Routes needing extra tags spread the result and append, e.g.
 * `const base = pageMeta({ ... }); return { ...base, scripts };`
 *
 * @param path — the route path, e.g. '/pricing' or '/races/monaco'
 * @param image — absolute OG image URL (defaults to the shared image)
 * @param imageAlt — alt text for a page-specific `image`. Without it the
 *   root's generic "make F1 predictions" alt describes a card it is not on,
 *   e.g. a race card naming the Italian Grand Prix.
 * @param noIndex — when true, adds `robots: noindex, follow`
 */
export function pageMeta({
  title,
  description,
  path,
  image = defaultOgImage,
  imageAlt,
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
  imageAlt?: string;
  noIndex?: boolean;
}) {
  const canonical = canonicalMeta(path);
  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:image', content: image },
      // All OG images (static + rendered share cards) are 1200x630
      { property: 'og:image:width', content: '1200' },
      { property: 'og:image:height', content: '630' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: image },
      ...(imageAlt
        ? ([
            { property: 'og:image:alt', content: imageAlt },
            { name: 'twitter:image:alt', content: imageAlt },
          ] as const)
        : []),
      ...(noIndex ? noIndexMeta() : []),
      ...canonical.meta,
    ],
    links: [...canonical.links],
  };
}

/**
 * The site's Organization node, as one definition shared by every page that
 * emits it.
 *
 * `@id` is what makes that safe: two pages carrying this node describe the
 * same entity rather than two rival ones, and anything else in a graph can
 * point at `#organization` instead of restating it. It belongs on the home
 * page above all — that is where a search engine looks for the entity behind a
 * domain — and `logo` is the property that drives the logo rich result, so an
 * Organization without one is doing half its job.
 */
export function organizationSchema() {
  return {
    '@type': 'Organization',
    '@id': `${siteConfig.url}/#organization`,
    name: siteConfig.title,
    url: siteConfig.url,
    // 512x512 and crop-safe, the same raster the storefront listing uses.
    logo: `${siteConfig.url}/logo-storefront.png`,
    founder: {
      '@type': 'Person',
      name: siteConfig.author.name,
      url: siteConfig.author.url,
    },
    sameAs: [
      siteConfig.social.x.url,
      siteConfig.social.reddit.url,
      siteConfig.social.instagram.url,
    ],
  };
}

/**
 * SportsEvent JSON-LD for a Grand Prix.
 *
 * This exists because the same event was described in two places and the two
 * drifted. The race page built a complete node; the write-up pages hand-wrote a
 * three-property stub (`name`, `startDate`) as the `about` of their WebPage,
 * and Search Console rejected it with `Missing field "location"` plus seven
 * warnings for the fields the race page happened to include and the stub did
 * not. One builder, so there is no second shape to fall behind.
 *
 * `location` is a required parameter rather than an optional one. It is the
 * field whose absence makes Google discard the item outright, so the type is
 * the thing that stops the stub being written again: you cannot call this
 * without saying where the race is held.
 *
 * `offers`, `performer` and `organizer` are deliberately absent. They are
 * warnings, not errors, and each would mean asserting something untrue: we do
 * not sell tickets, and F1 and the FIA organise the Grand Prix. Markup that
 * fills a field to clear a warning is worse than markup that leaves it empty.
 */
export function sportsEventSchema({
  name,
  startAt,
  path,
  description,
  image,
  location,
  cancelled = false,
}: {
  name: string;
  /** Race start, epoch ms. */
  startAt: number;
  /** Route path of the page that owns this node. */
  path: string;
  description: string;
  image?: string;
  /** The circuit. Required: without it Google discards the whole item. */
  location: { name: string; locality: string; country: string };
  cancelled?: boolean;
}) {
  return {
    '@type': 'SportsEvent',
    '@id': `${siteConfig.url}${path}#event`,
    name,
    startDate: new Date(startAt).toISOString(),
    // Grands Prix run to a 2-hour limit
    endDate: new Date(startAt + 2 * 60 * 60 * 1000).toISOString(),
    eventStatus: cancelled
      ? 'https://schema.org/EventCancelled'
      : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    description,
    url: `${siteConfig.url}${path}`,
    sport: 'Formula 1',
    location: {
      '@type': 'Place',
      name: location.name,
      address: {
        '@type': 'PostalAddress',
        addressLocality: location.locality,
        addressCountry: location.country,
      },
    },
    ...(image ? { image } : {}),
  };
}

/**
 * BreadcrumbList JSON-LD for a page's trail. Unlike FAQPage, breadcrumbs still
 * render as rich results, so they earn their place in the markup.
 *
 * @param path — the page's route path, used for the node id
 * @param trail — crumbs after Home, in order, e.g. [{ name, path }]
 */
export function breadcrumbSchema(
  path: string,
  trail: readonly { name: string; path: string }[],
) {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${siteConfig.url}${path}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: siteConfig.url },
      ...trail.map((crumb, index) => ({
        '@type': 'ListItem',
        position: index + 2,
        name: crumb.name,
        item: `${siteConfig.url}${crumb.path}`,
      })),
    ],
  };
}
