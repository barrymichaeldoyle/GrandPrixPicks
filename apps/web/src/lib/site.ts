/**
 * Site-wide config and derived values.
 * ogBaseUrl is used for og:image (and twitter:image) so that in dev the
 * TanStack Router devtools can load previews from the same origin (localhost).
 * Set VITE_SITE_URL in .env.local to your dev URL (e.g. http://localhost:3000).
 */

export const siteConfig = {
  title: 'Grand Prix Picks',
  description:
    'Predict the top 5 finishers for each Formula 1 race and compete with friends throughout the 2026 season.',
  url: 'https://grandprixpicks.com',
  themeColor: '#0d9488',
  author: {
    name: 'Barry Michael Doyle',
    url: 'https://barrymichaeldoyle.com',
  },
  social: {
    x: {
      handle: '@GrandPrixPicks',
      url: 'https://x.com/GrandPrixPicks',
    },
  },
} as const;

/** Base URL for absolute links (OG images, canonical). Use in dev for devtools previews. */
const ogBaseUrl =
  (import.meta.env as { VITE_SITE_URL?: string }).VITE_SITE_URL ??
  siteConfig.url;

/** Temporary shared OG image until per-page variants are finalized. */
export const defaultOgImage = `${ogBaseUrl}/og-default.png?v=20260302b`;

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
 * @param noIndex — when true, adds `robots: noindex, follow`
 */
export function pageMeta({
  title,
  description,
  path,
  image = defaultOgImage,
  noIndex = false,
}: {
  title: string;
  description: string;
  path: string;
  image?: string;
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
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: image },
      ...(noIndex ? noIndexMeta() : []),
      ...canonical.meta,
    ],
    links: [...canonical.links],
  };
}
