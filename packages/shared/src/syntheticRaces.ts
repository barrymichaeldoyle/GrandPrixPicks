const SYNTHETIC_SLUG_PREFIXES = ['scenario-race-', 'social-race-'] as const;

/**
 * Playwright and seed fixtures, which only ever exist in dev. Their lock
 * times sit on `Date.now()`, so they are kept off the live calendar (they
 * would steal the next race, the season and reminder fanout), but they still
 * accept picks when someone opens one on purpose: the backend's
 * `isRaceAcceptingPredictions` and the web race page both ask this.
 */
export function isSyntheticRaceSlug(slug: string): boolean {
  return SYNTHETIC_SLUG_PREFIXES.some((prefix) => slug.startsWith(prefix));
}
