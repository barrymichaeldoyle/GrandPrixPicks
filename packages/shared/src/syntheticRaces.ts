/*
 * `scenario-`, not `scenario-race-`: a fixture's slug comes from its test
 * namespace, and `scenario__a11y_authed__…` or `scenario__seo_smoke__…`
 * become `scenario-a11y-…` / `scenario-seo-…`. The narrower prefix missed
 * those, so they sat on the dev calendar as the "next race" and, in CI, the
 * a11y picks test met "Not yet open". It matches the backend's own scenario
 * cleanup (`clearAllScenarioData`), which has always used `scenario-`.
 */
const SYNTHETIC_SLUG_PREFIXES = ['scenario-', 'social-race-'] as const;

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
