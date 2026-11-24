/**
 * What a news story is about, one per story: `topic` on `raceNews` and
 * `globalNews`, served by the news API (`docs/news-api.md`) and set by
 * whoever publishes (`docs/race-news.md`).
 *
 * Defined once here so the Convex validator, the publish checks, the API's
 * `topic` filter, the OpenAPI document and `scripts/gpp.mjs` all read the same
 * list. Add a topic here and every one of them takes it.
 */
export const NEWS_TOPICS = [
  /** Grid and time penalties, stewards' decisions. */
  'penalty',
  /** A starting grid announcement. */
  'grid',
  /** Upgrades, car changes, reliability. */
  'technical',
  /** Line-up changes, injuries, contracts, the driver market. */
  'driver',
  /** Management and team business. */
  'team',
  'weather',
  /** The calendar, a venue, a weekend's format. */
  'calendar',
  /** Rules, the FIA. */
  'regulation',
  'other',
] as const;

export type NewsTopic = (typeof NEWS_TOPICS)[number];

export function isNewsTopic(value: unknown): value is NewsTopic {
  return (
    typeof value === 'string' &&
    (NEWS_TOPICS as readonly string[]).includes(value)
  );
}
