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
    twitter: '@barrymdoyle',
  },
} as const;

/** Base URL for absolute links (OG images, canonical). Use in dev for devtools previews. */
export const ogBaseUrl =
  (import.meta.env as { VITE_SITE_URL?: string }).VITE_SITE_URL ??
  siteConfig.url;
