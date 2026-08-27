/**
 * Editorial weekend write-ups, by race slug.
 *
 * These are hand-written preview pages, one per weekend that earns one, and
 * they are a different thing from `/races/$raceSlug`: that page is the game
 * (picks, results, duels), this is the reading. A weekend has a write-up only
 * if somebody wrote it, so this is a lookup rather than a derived path, and the
 * absence of an entry is the normal case.
 *
 * It exists because the write-ups were orphans. Nothing in the app linked to
 * the Monza page: it was reachable only from the sitemap, which is the worst of
 * both worlds — Google is asked to index a page that the site itself never
 * points at, and the players it was written for never see it.
 *
 * Add a line here when a new write-up ships, and every surface that renders a
 * link picks it up.
 */
export type RaceWriteup = {
  /** Route path for the write-up. */
  to: string;
  /**
   * Link text. Names the circuit rather than the round, because it sits beside
   * a card that already says which race this is, and "Monza preview" reads as
   * something to go and read where "Preview" alone reads as a control.
   */
  label: string;
};

const RACE_WRITEUPS: Record<string, RaceWriteup> = {
  'italy-2026': {
    to: '/f1-2026-italian-grand-prix-predictions',
    label: 'Monza preview',
  },
};

/** The write-up for a race, or null when that weekend has none. */
export function getRaceWriteup(
  raceSlug: string | undefined,
): RaceWriteup | null {
  if (!raceSlug) {
    return null;
  }
  return RACE_WRITEUPS[raceSlug] ?? null;
}
