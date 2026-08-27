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
   * Short link text, for places with no room to say more (the race page
   * header). Names the circuit rather than the round, because it sits next to
   * something that already says which race this is.
   */
  label: string;
  /**
   * What is actually in the piece, in the writer's own words.
   *
   * The dashboard leads with this rather than with the label, because "Monza
   * preview" describes a category and nobody clicks a category. A line that
   * says what you will learn is the thing that earns the tap, and it has to be
   * written per weekend for the same reason: a generic teaser is just the
   * label again with more words.
   */
  teaser: string;
};

const RACE_WRITEUPS: Record<string, RaceWriteup> = {
  'italy-2026': {
    to: '/f1-2026-italian-grand-prix-predictions',
    label: 'Monza preview',
    teaser: 'Two things to know before FP1',
  },
  'madrid-2026': {
    to: '/f1-2026-madrid-grand-prix-predictions',
    label: 'Madring preview',
    teaser: 'A new circuit, and no form guide for anyone',
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
